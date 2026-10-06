# -----------------------------------------------------------------------------
# One entry point for running WellCare on a fresh laptop.
#
#   .\wellcare.cmd setup      first time after `git clone` / `git pull` (needs internet)
#   .\wellcare.cmd start      run the system  -> http://127.0.0.1:8000
#                             (asks online or offline; Enter keeps the current)
#   .\wellcare.cmd reset      wipe the database and reseed the clean demo record
#   .\wellcare.cmd offline    switch .env to work with NO internet
#   .\wellcare.cmd online     switch back
#   .\wellcare.cmd status     what is configured and what is running
#   .\wellcare.cmd share      run it AND put it on the internet over https, so a
#                             phone can join a video consultation (prints a QR)
#
# From cmd.exe use `wellcare <command>` - wellcare.cmd forwards here with a
# per-process ExecutionPolicy bypass (a fresh Windows refuses unsigned .ps1).
#
# WHAT NEEDS INTERNET: only `setup`, because composer and npm download
# packages. Everything after that - start, reset, offline - runs with the
# wifi off.
#
# ONE PLACE KNOWS WHICH PHP TO USE: Find-Php below. Every command resolves it
# the same way and puts it first on PATH for child processes, because
# `npm run build` and `composer dev` shell out to `php artisan` (the Wayfinder
# Vite plugin) and would otherwise pick up whatever `php` Windows finds first.
#
# ASCII ONLY in this file, on purpose: Windows PowerShell 5.1 reads a .ps1
# without a BOM as ANSI, so a UTF-8 dash or arrow corrupts the parse.
# -----------------------------------------------------------------------------

param(
    [Parameter(Position = 0)]
    [string] $Command = 'help',

    # setup: wipe and reseed even if the database already has accounts
    [switch] $Fresh,
    # setup: skip `npm run build` (only if public\build is already current)
    [switch] $SkipBuild,
    # start: run Vite with hot reload (composer dev) instead of the built assets
    [switch] $Dev,
    # start: do not open the browser
    [switch] $NoBrowser,
    # start: run online / offline without asking
    [switch] $Online,
    [switch] $Offline,
    # reset: do not ask for confirmation
    [switch] $Yes,

    # tunnel-watch (internal, started by `share`): the two public addresses
    [string] $SiteUrl,
    [string] $ReverbHost
)

# NOT 'Stop'. In PowerShell 5.1 a native command that writes to stderr (php
# warnings, npm notices) becomes a terminating error under 'Stop', which kills
# a setup that was actually succeeding. Exit codes are checked explicitly.
$ErrorActionPreference = 'Continue'

$repo = $PSScriptRoot
Set-Location $repo

$envPath = Join-Path $repo '.env'
$envExample = Join-Path $repo '.env.example'
$envBackup = Join-Path $repo '.env.backup-online'
$appUrl = 'http://127.0.0.1:8000'

function Step($text) { Write-Host ''; Write-Host "== $text" -ForegroundColor Cyan }
function Ok($text)   { Write-Host "   OK  $text" -ForegroundColor Green }
function Warn($text) { Write-Host "   !   $text" -ForegroundColor Yellow }
function Info($text) { Write-Host "       $text" -ForegroundColor DarkGray }
function Die($text)  { Write-Host ''; Write-Host "STOP: $text" -ForegroundColor Red; Write-Host ''; exit 1 }

# ---- .env helpers ------------------------------------------------------------
#
# .env.example holds UTF-8 characters (em dashes, box-drawing rules in the
# comments). PowerShell 5.1 defaults to ANSI both ways, so a plain
# Get-Content/Set-Content round trip silently corrupts every one of them. Read
# as UTF-8, write UTF-8 WITHOUT a BOM - phpdotenv would read a BOM as part of
# the first key's name.

function Read-EnvLines {
    if (-not (Test-Path $envPath)) { return @() }
    return @(Get-Content -Path $envPath -Encoding UTF8)
}

function Write-EnvLines([string[]] $lines) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllLines($envPath, [string[]] $lines, $utf8NoBom)
}

function Get-EnvValue([string[]] $lines, [string] $key) {
    foreach ($line in $lines) {
        if ($line -match "^\s*$([regex]::Escape($key))\s*=(.*)$") {
            return $Matches[1].Trim().Trim('"')
        }
    }
    return $null
}

# Replaces the key's value; failing that, un-comments `# KEY=...` in place (so
# .env.example's commented DB_HOST lands where a reader expects it); failing
# that, appends.
function Set-EnvValue([string[]] $lines, [string] $key, [string] $value) {
    $k = [regex]::Escape($key)
    $out = New-Object System.Collections.Generic.List[string]
    $done = $false

    foreach ($line in $lines) {
        if (-not $done -and $line -match "^\s*$k\s*=") { $out.Add("$key=$value"); $done = $true }
        else { $out.Add($line) }
    }

    if (-not $done) {
        for ($i = 0; $i -lt $out.Count; $i++) {
            if ($out[$i] -match "^\s*#\s*$k\s*=") { $out[$i] = "$key=$value"; $done = $true; break }
        }
    }

    if (-not $done) { $out.Add("$key=$value") }

    return , $out.ToArray()
}

function New-RandomToken([int] $length) {
    $chars = 'abcdefghijklmnopqrstuvwxyz0123456789'.ToCharArray()
    return -join (1..$length | ForEach-Object { $chars | Get-Random })
}

# ---- PHP ---------------------------------------------------------------------

# `php -v`, NOT `php -r '...'`: PowerShell mangles quotes passed to a native
# exe, so -r code arrives broken and reports a PHP syntax error that is really
# a quoting error. And scan every line: startup warnings ("Unable to load
# dynamic library") print BEFORE the version line.
function Get-PhpVersion([string] $exe) {
    $lines = & $exe -v 2>$null
    foreach ($l in $lines) {
        if ($l -match '^PHP (\d+)\.(\d+)\.(\d+)') {
            return [version]"$($Matches[1]).$($Matches[2]).$($Matches[3])"
        }
    }
    return $null
}

function Find-Php {
    $candidates = New-Object System.Collections.Generic.List[string]

    $onPath = Get-Command php -ErrorAction SilentlyContinue
    if ($onPath) { $candidates.Add($onPath.Source) }

    $candidates.Add('C:\xampp\php\php.exe')

    $herd = Join-Path $env:USERPROFILE '.config\herd\bin'
    if (Test-Path $herd) {
        Get-ChildItem $herd -Directory -Filter 'php8*' -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { $candidates.Add((Join-Path $_.FullName 'php.exe')) }
    }

    foreach ($c in $candidates) {
        if (-not (Test-Path $c)) { continue }
        $v = Get-PhpVersion $c
        if ($v -and $v -ge [version]'8.2.0') { return $c }
    }

    return $null
}

function Use-Php {
    $php = Find-Php
    if (-not $php) {
        Die "no PHP 8.2 or newer found (checked PATH, C:\xampp\php, Laravel Herd). Install XAMPP 8.2+ from https://www.apachefriends.org and run this again."
    }
    # Child processes (composer, npm -> wayfinder, concurrently) inherit this.
    $env:PATH = (Split-Path $php -Parent) + ';' + $env:PATH
    return $php
}

# ---- MySQL -------------------------------------------------------------------

function Test-Port([string] $hostName, [int] $port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($hostName, $port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(700)) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

# The migrations re-declare MySQL ENUMs with raw ALTER statements, so SQLite is
# not an option - the laptop needs XAMPP's MySQL (MariaDB). If it is installed
# but not running, start it the way XAMPP's own mysql_start.bat does, hidden,
# so nobody has to open the Control Panel before a demo.
function Ensure-MySql {
    $lines = Read-EnvLines
    $dbHost = Get-EnvValue $lines 'DB_HOST'; if (-not $dbHost) { $dbHost = '127.0.0.1' }
    $dbPort = Get-EnvValue $lines 'DB_PORT'; if (-not $dbPort) { $dbPort = '3306' }

    if (Test-Port $dbHost ([int]$dbPort)) { Ok "MySQL is running on ${dbHost}:$dbPort"; return }

    $xampp = 'C:\xampp'
    $mysqld = Join-Path $xampp 'mysql\bin\mysqld.exe'
    $myIni = Join-Path $xampp 'mysql\bin\my.ini'

    if (($dbHost -ne '127.0.0.1' -and $dbHost -ne 'localhost') -or -not (Test-Path $mysqld)) {
        Die "MySQL is not running on ${dbHost}:$dbPort. Open the XAMPP Control Panel, press Start next to MySQL, and run this again."
    }

    Info "MySQL is not running - starting XAMPP MySQL in the background..."
    Start-Process -FilePath $mysqld -ArgumentList "--defaults-file=`"$myIni`"", '--standalone' `
        -WorkingDirectory $xampp -WindowStyle Hidden | Out-Null

    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Port $dbHost ([int]$dbPort)) { Ok "started XAMPP MySQL"; return }
    }

    Die "XAMPP MySQL did not start within 30 seconds. Start it from the XAMPP Control Panel - its log shows why."
}

# ---- Composer ----------------------------------------------------------------

# A global `composer` if there is one; otherwise composer.phar, downloaded once
# into the repo (gitignored) so a laptop without Composer still works.
#
# CALL IT AS A STATEMENT and read $LASTEXITCODE after. Never `$x = Invoke-...`:
# whatever a function writes is its return value, so the assignment would
# swallow composer's entire output along with the exit code.
function Invoke-Composer([string] $php, [string[]] $composerArgs) {
    $global = Get-Command composer -ErrorAction SilentlyContinue
    if ($global) {
        & composer @composerArgs
        return
    }

    $phar = Join-Path $repo 'composer.phar'
    if (-not (Test-Path $phar)) {
        Info "Composer is not installed - downloading composer.phar into the project..."
        try {
            $old = $ProgressPreference; $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest -Uri 'https://getcomposer.org/download/latest-stable/composer.phar' -OutFile $phar -UseBasicParsing
            $ProgressPreference = $old
        } catch {
            Die "could not download Composer. Check the internet connection, or install it from https://getcomposer.org/Composer-Setup.exe"
        }
    }

    & $php $phar @composerArgs
}

# ---- Commands ----------------------------------------------------------------

function Invoke-Setup {
    Step "1/7  PHP"
    $php = Use-Php
    Ok "php $(Get-PhpVersion $php)  ($php)"

    # XAMPP ships some of these commented out in php.ini. Name the file and the
    # line, rather than letting composer fail three screens later.
    $modules = (& $php -m 2>$null) | ForEach-Object { $_.Trim().ToLower() }
    $missing = @(@('pdo_mysql', 'mbstring', 'openssl', 'fileinfo', 'curl', 'tokenizer', 'ctype', 'dom', 'xml') |
        Where-Object { $modules -notcontains $_ })
    if ($missing.Count -gt 0) {
        $ini = ((& $php --ini 2>$null) | Where-Object { $_ -match 'Loaded Configuration File' }) -replace '.*:\s+', ''
        Warn "PHP is missing: $($missing -join ', ')"
        Die "open $ini, remove the ';' in front of extension=$($missing[0]) (and the others listed), save, and run this again."
    }
    if ($modules -notcontains 'zip') {
        Warn "PHP zip extension is off - composer will still work, just slower. (Enable extension=zip in php.ini to speed it up.)"
    }

    Step "2/7  Node.js"
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) { Die "Node.js is not installed. Get the LTS from https://nodejs.org, then open a NEW terminal and run this again." }
    $nodeVersion = (& node -v).TrimStart('v')
    if ([version]$nodeVersion -lt [version]'20.19.0') {
        Die "Node $nodeVersion is too old for Vite 7 (needs 20.19+). Install the LTS from https://nodejs.org."
    }
    Ok "node $nodeVersion"

    if ($repo -like '*OneDrive*') { Warn "the project is inside OneDrive. If you see 'Access denied' below, pause OneDrive sync and rerun." }

    Step "3/7  Environment (.env)"
    if (-not (Test-Path $envPath)) {
        Copy-Item $envExample $envPath
        $lines = Read-EnvLines
        # .env.example ships sqlite; this app's migrations are MySQL-only.
        $lines = Set-EnvValue $lines 'APP_NAME' 'Wellcare'
        $lines = Set-EnvValue $lines 'APP_URL' $appUrl
        $lines = Set-EnvValue $lines 'DB_CONNECTION' 'mysql'
        $lines = Set-EnvValue $lines 'DB_HOST' '127.0.0.1'
        $lines = Set-EnvValue $lines 'DB_PORT' '3306'
        $lines = Set-EnvValue $lines 'DB_DATABASE' 'wellcare_db'
        $lines = Set-EnvValue $lines 'DB_USERNAME' 'root'
        $lines = Set-EnvValue $lines 'DB_PASSWORD' ''
        Write-EnvLines $lines
        Ok ".env created from .env.example (MySQL wellcare_db, user root, no password - XAMPP defaults)"
    } else {
        Ok ".env already exists - kept (only blank keys below are filled in)"
    }

    # Reverb refuses to start with blank credentials, and without Reverb the
    # bell and the video consultation signalling do not work.
    $lines = Read-EnvLines
    if (-not (Get-EnvValue $lines 'REVERB_APP_KEY')) {
        $lines = Set-EnvValue $lines 'REVERB_APP_ID' ([string](Get-Random -Minimum 100000 -Maximum 999999))
        $lines = Set-EnvValue $lines 'REVERB_APP_KEY' (New-RandomToken 20)
        $lines = Set-EnvValue $lines 'REVERB_APP_SECRET' (New-RandomToken 20)
        Write-EnvLines $lines
        Ok "Reverb (real-time) credentials generated"
    }

    # BEFORE composer, and without artisan. AppServiceProvider refuses to boot
    # with no APP_KEY (it guards the encrypted clinical columns), and composer's
    # post-install `package:discover` boots the app - so on a fresh clone
    # `composer install` itself dies. `artisan key:generate` cannot help: it
    # needs vendor\. The key is the same format key:generate writes.
    #
    # Only ever for a MISSING key. A new key cannot read records encrypted
    # under the old one.
    if (-not (Get-EnvValue (Read-EnvLines) 'APP_KEY')) {
        $bytes = New-Object byte[] 32
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        Write-EnvLines (Set-EnvValue (Read-EnvLines) 'APP_KEY' ('base64:' + [Convert]::ToBase64String($bytes)))
        Ok "APP_KEY generated"
    }

    Step "4/7  PHP packages (composer install)"
    Info "If it asks for a GitHub 'Token (hidden)', just press Enter."
    Invoke-Composer $php @('install', '--prefer-dist', '--no-interaction')
    if ($LASTEXITCODE -ne 0) { Die "composer install failed (see above). Rerun .\wellcare.cmd setup - it resumes where it stopped." }
    Ok "vendor\ ready"

    Step "5/7  JavaScript packages (npm install)"
    & npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Die "npm install failed (see above). Rerun .\wellcare.cmd setup." }
    Ok "node_modules\ ready"

    & $php artisan storage:link 2>$null | Out-Null
    & $php artisan config:clear | Out-Null

    Step "6/7  Database"
    Ensure-MySql
    # Creates wellcare_db if it does not exist yet (--force answers the prompt).
    & $php artisan migrate --force
    if ($LASTEXITCODE -ne 0) { Die "migrate failed (see above)." }

    if ($Fresh) {
        & $php artisan wellcare:demo:reset --force
    } else {
        & $php artisan wellcare:demo:reset --force --if-empty
    }
    if ($LASTEXITCODE -ne 0) { Die "seeding failed (see above)." }

    if (-not $SkipBuild) {
        Step "7/7  Build the interface (npm run build)"
        & npm run build
        if ($LASTEXITCODE -ne 0) { Die "npm run build failed (see above)." }
        Ok "public\build\ ready"
    }

    Write-Host ''
    Write-Host '=== READY ===' -ForegroundColor Green
    Write-Host ''
    Write-Host '  Run it:          .\wellcare.cmd start' -ForegroundColor White
    Write-Host "  Open:            $appUrl" -ForegroundColor White
    Write-Host '  No wifi at demo: .\wellcare.cmd offline   (then .\wellcare.cmd start)' -ForegroundColor White
    Write-Host '  Clean data:      .\wellcare.cmd reset' -ForegroundColor White
    Write-Host ''
}

function Assert-SetUp {
    if (-not (Test-Path (Join-Path $repo 'vendor')) -or -not (Test-Path (Join-Path $repo 'node_modules')) -or -not (Test-Path $envPath)) {
        Die "not set up yet. Run: .\wellcare.cmd setup"
    }
}

# Two stacks at once means two queue workers and a second server that cannot
# bind 8000 - it looks like a broken app, it is just a double start.
function Assert-NotRunning {
    $running = Get-CimInstance Win32_Process -Filter "Name='php.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and ($_.CommandLine -like '*artisan serve*' -or $_.CommandLine -like '*queue:listen*' -or $_.CommandLine -like '*reverb:start*') }
    if ($running) {
        Warn "WellCare already looks like it is running (php PID $(@($running.ProcessId) -join ', '))."
        Warn "Close that terminal (or Ctrl+C in it) first, then run this again."
        exit 1
    }
}

# Server, queue, Reverb and scheduler on the BUILT assets, plus any extra
# processes the caller adds. Returns when Ctrl+C stops them.
function Start-Stack([string[]] $extraNames = @(), [string[]] $extraCommands = @()) {
    # A leftover public\hot (from an earlier `npm run dev`) makes every page
    # request its scripts from a Vite server that is not running: a blank page.
    $hot = Join-Path $repo 'public\hot'
    if (Test-Path $hot) { Remove-Item $hot -Force }

    if (-not (Test-Path (Join-Path $repo 'public\build\manifest.json'))) {
        Info "no built interface yet - building once (npm run build)..."
        & npm run build
        if ($LASTEXITCODE -ne 0) { Die "npm run build failed (see above)." }
    }

    $names = @('server', 'queue', 'reverb', 'scheduler') + $extraNames
    $colors = @('blue', 'magenta', 'green', 'yellow', 'cyan')[0..($names.Count - 1)]

    # The built assets instead of Vite: one less process, and nothing that can
    # hot-reload in the middle of a demo. The local concurrently binary, never
    # `npx concurrently`, which may try to reach the npm registry.
    $concurrently = Join-Path $repo 'node_modules\.bin\concurrently.cmd'
    & $concurrently -k -n ($names -join ',') -c ($colors -join ',') `
        'php artisan serve --host=127.0.0.1 --port=8000' `
        'php artisan queue:listen --tries=1' `
        'php artisan reverb:start' `
        'php artisan schedule:work' `
        @extraCommands
}

function Invoke-Start {
    $php = Use-Php
    Assert-SetUp
    Ensure-MySql
    Assert-NotRunning
    Stop-StaleTunnels

    # Ask every time: the laptop that had Wi-Fi at home has none at the venue,
    # and a server started with the wrong .env stays wrong until restarted.
    $current = Get-RunMode
    if ($Online -and $Offline) { Die "choose one: -Online or -Offline" }
    $mode = if ($Online) { 'online' } elseif ($Offline) { 'offline' } else { Read-RunMode $current }

    if ($mode -ne $current) {
        if ($mode -eq 'offline') { Invoke-Offline -Brief } else { Invoke-Online -Brief }
    }

    if ($mode -eq 'offline') {
        Ok "running OFFLINE - no internet needed"
    } else {
        Ok "running ONLINE"
    }

    # A quick-tunnel address dies with the `share` that made it. Left in .env it
    # silently breaks the bell and every video call, and looks like a bug.
    if (Test-TunnelEnv) {
        Reset-TunnelEnv
        Ok "removed the old share address from .env (use .\wellcare.cmd share for a phone)"
    }

    & $php artisan config:clear | Out-Null

    if (-not $NoBrowser) {
        # Opens the browser once the server answers, without holding up the stack.
        $probe = "for(`$i=0;`$i -lt 90;`$i++){try{`$c=New-Object Net.Sockets.TcpClient('127.0.0.1',8000);`$c.Close();Start-Process '$appUrl';break}catch{Start-Sleep -Milliseconds 700}}"
        Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile', '-Command', $probe | Out-Null
    }

    Write-Host ''
    Write-Host "=== WellCare is starting ===" -ForegroundColor Cyan
    Write-Host "  App:  $appUrl" -ForegroundColor White
    Write-Host "  Stop: Ctrl+C in this window" -ForegroundColor DarkGray
    Write-Host ''

    if ($Dev) {
        Invoke-Composer $php @('dev')
        return
    }

    Start-Stack
}

function Invoke-Reset {
    $php = Use-Php
    Ensure-MySql
    $resetArgs = @('artisan', 'wellcare:demo:reset')
    if ($Yes) { $resetArgs += '--force' }
    & $php @resetArgs
    exit $LASTEXITCODE
}

# Everything that reaches the internet at runtime, and its offline value.
#   OFFLINE_DEMO           the UI swaps the Google Maps embed for a local card
#   MAIL_MAILER=log        SMTP would hang on every message (registration too)
#   WEBRTC_STUN_URLS=      Google STUN is unreachable; same-machine / same-LAN
#                          video needs no STUN at all
#   REVERB_* / APP_URL     a Cloudflare tunnel from two-device testing is dead
#                          without internet; back to this machine
#   SESSION_SECURE_COOKIE  plain http on 127.0.0.1 - a secure cookie never sticks
$offlineValues = [ordered]@{
    'OFFLINE_DEMO'          = 'true'
    'MAIL_MAILER'           = 'log'
    'WEBRTC_STUN_URLS'      = ''
    'WEBRTC_TURN_URLS'      = ''
    'APP_URL'               = $appUrl
    'REVERB_HOST'           = '127.0.0.1'
    'REVERB_PORT'           = '8080'
    'REVERB_SCHEME'         = 'http'
    'SESSION_SECURE_COOKIE' = 'false'
}

function Show-EnvStatus {
    $lines = Read-EnvLines
    foreach ($key in $offlineValues.Keys) {
        $value = Get-EnvValue $lines $key
        if ($null -eq $value -or $value -eq '') { $value = '(blank)' }
        Write-Host ('    {0,-22} {1}' -f $key, $value)
    }
}

function Get-RunMode {
    if ((Get-EnvValue (Read-EnvLines) 'OFFLINE_DEMO') -eq 'true') { return 'offline' }
    return 'online'
}

# Enter keeps the current mode. A non-interactive run (no console to read
# from) also keeps it - Read-Host returns null there, which is not an answer.
function Read-RunMode([string] $current) {
    $default = if ($current -eq 'offline') { '2' } else { '1' }

    Write-Host ''
    Write-Host '  How should WellCare run?' -ForegroundColor Cyan
    Write-Host '    [1] Online   - this laptop has internet'
    Write-Host '    [2] Offline  - no internet (Wi-Fi off, venue without signal)'
    Write-Host ("  Current: {0}" -f $current.ToUpper()) -ForegroundColor Yellow

    for ($attempt = 0; $attempt -lt 3; $attempt++) {
        $answer = $null
        try { $answer = Read-Host "  Choose 1 or 2 [Enter = $default, keep $current]" } catch { $answer = $null }
        if ($null -eq $answer) { return $current }

        switch (([string]$answer).Trim().ToLowerInvariant()) {
            ''        { return $current }
            '1'       { return 'online' }
            'online'  { return 'online' }
            '2'       { return 'offline' }
            'offline' { return 'offline' }
            default   { Warn "type 1 or 2, or just press Enter" }
        }
    }

    return $current
}

function Invoke-Offline([switch] $Brief) {
    if (-not (Test-Path $envPath)) { Die "no .env yet. Run: .\wellcare.cmd setup" }
    $lines = Read-EnvLines

    if ((Get-EnvValue $lines 'OFFLINE_DEMO') -eq 'true') {
        Ok "already offline."
        Show-EnvStatus
        return
    }

    # The backup is the only copy of the online values (tunnel host, SMTP
    # mailer). Never overwrite one that exists.
    if (-not (Test-Path $envBackup)) {
        Copy-Item $envPath $envBackup
        Info "saved the current .env to .env.backup-online"
    }

    foreach ($key in $offlineValues.Keys) { $lines = Set-EnvValue $lines $key $offlineValues[$key] }
    Write-EnvLines $lines

    $php = Use-Php
    & $php artisan config:clear | Out-Null

    if ($Brief) {
        Ok "switched to OFFLINE (emails go to storage\logs\laravel.log; video works between two browsers on this laptop)"
        return
    }

    Write-Host ''
    Ok "OFFLINE mode on:"
    Show-EnvStatus
    Write-Host ''
    Info "If WellCare is running, stop it (Ctrl+C) and run .\wellcare.cmd start - a running server keeps the old .env."
    Info "Emails are written to storage\logs\laravel.log instead of being sent."
    Info "Video calls work between two browser windows on THIS laptop (e.g. Chrome + Edge)."
    Write-Host ''
}

function Invoke-Online([switch] $Brief) {
    if (-not (Test-Path $envPath)) { Die "no .env yet. Run: .\wellcare.cmd setup" }

    if (Test-Path $envBackup) {
        Copy-Item $envBackup $envPath -Force
        Remove-Item $envBackup -Force
        Ok "restored the .env you had before going offline"
    } else {
        $lines = Read-EnvLines
        $lines = Set-EnvValue $lines 'OFFLINE_DEMO' 'false'
        $lines = Set-EnvValue $lines 'WEBRTC_STUN_URLS' '"stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"'
        Write-EnvLines $lines
        Ok "online mode on (no backup found, so mail stays on 'log' - set MAIL_MAILER yourself if you use SMTP)"
    }

    $php = Use-Php
    & $php artisan config:clear | Out-Null
    if ($Brief) { return }
    Show-EnvStatus
    Write-Host ''
    Info "If WellCare is running, restart it: Ctrl+C, then .\wellcare.cmd start"
    Write-Host ''
}

# ---- Share (two-device testing) ----------------------------------------------
#
# A phone's camera and microphone only open on https (a "secure context"), so
# testing a video consultation between the laptop and a phone needs the app on
# a public https address. `share` does all of TWO-DEVICE-TESTING.md by itself:
#
#   1. finds cloudflared, or downloads it into .tools\ (no install, no account)
#   2. opens two Cloudflare quick tunnels - one for the site (8000) and one for
#      Reverb (8080), because the browser connects to both directly
#   3. writes the Reverb tunnel into .env, starts the stack on built assets
#   4. a `tunnel` pane waits until both addresses really answer from outside -
#      the site AND a WebSocket handshake - then prints the link and a QR code
#   5. on Ctrl+C: stops the tunnels and puts .env back to this machine
#
# The addresses are new on every run. That is the nature of quick tunnels and
# why everything above is automatic rather than documented.

$tunnelHome = Join-Path $repo '.tools'
$tunnelLogs = Join-Path $repo 'storage\logs'

# The live public address, read by AppServiceProvider::useSharedPublicUrl() on
# every boot, so each email is built with the address live when it is SENT. Its
# own file rather than only .env: a queue worker keeps the APP_URL it started
# with, and a job queued before the tunnel opened would still say 127.0.0.1.
$shareUrlFile = Join-Path $repo 'storage\framework\share-url'

# What .env holds when nothing is shared; also what `start` heals back to.
$localTunnelValues = [ordered]@{
    'APP_URL'       = $appUrl
    'REVERB_HOST'   = '127.0.0.1'
    'REVERB_PORT'   = '8080'
    'REVERB_SCHEME' = 'http'
}

function Test-TunnelEnv {
    if (Test-Path $shareUrlFile) { return $true }
    $lines = Read-EnvLines
    return ((Get-EnvValue $lines 'REVERB_HOST') -like '*.trycloudflare.com') -or ((Get-EnvValue $lines 'APP_URL') -like '*.trycloudflare.com*')
}

function Reset-TunnelEnv {
    if (Test-Path $shareUrlFile) { Remove-Item $shareUrlFile -Force -ErrorAction SilentlyContinue }
    $lines = Read-EnvLines
    foreach ($key in $localTunnelValues.Keys) { $lines = Set-EnvValue $lines $key $localTunnelValues[$key] }
    Write-EnvLines $lines
}

# Only the cloudflared processes `share` started (they log to our files) - never
# a tunnel the user runs for something else.
function Stop-StaleTunnels {
    Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like '*wellcare-tunnel-*' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Find-Cloudflared {
    $candidates = New-Object System.Collections.Generic.List[string]
    $onPath = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($onPath) { $candidates.Add($onPath.Source) }
    if (${env:ProgramFiles(x86)}) { $candidates.Add((Join-Path ${env:ProgramFiles(x86)} 'cloudflared\cloudflared.exe')) }
    $candidates.Add((Join-Path $env:ProgramFiles 'cloudflared\cloudflared.exe'))
    $candidates.Add((Join-Path $tunnelHome 'cloudflared.exe'))

    foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
    return $null
}

# A single self-contained exe from Cloudflare's GitHub releases, kept in the
# gitignored .tools\ folder: no installer, no admin rights, no Cloudflare login.
function Use-Cloudflared {
    $exe = Find-Cloudflared
    if ($exe) { return $exe }

    $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'x86' -and -not $env:PROCESSOR_ARCHITEW6432) { '386' } else { 'amd64' }
    $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-$arch.exe"
    $target = Join-Path $tunnelHome 'cloudflared.exe'
    $partial = "$target.download"

    Info "cloudflared is not installed - downloading it once into .tools\ (55 MB, progress below)..."
    New-Item -ItemType Directory -Force $tunnelHome | Out-Null
    if (Test-Path $partial) { Remove-Item $partial -Force }

    # curl.exe (in Windows since 10 1803) rather than Invoke-WebRequest: it
    # shows progress, and it GIVES UP on a stalled connection. A silent
    # 55 MB download on slow Wi-Fi looks frozen, and a stalled one was frozen,
    # forever. Aborts below 20 KB/s for 60s; retries a dropped connection.
    $curl = Join-Path $env:SystemRoot 'System32\curl.exe'
    $downloaded = $false
    if (Test-Path $curl) {
        & $curl -L --fail --retry 3 --connect-timeout 20 --speed-limit 20480 --speed-time 60 --progress-bar -o $partial $url
        $downloaded = ($LASTEXITCODE -eq 0)
    } else {
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
            $old = $ProgressPreference; $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest -Uri $url -OutFile $partial -UseBasicParsing -TimeoutSec 600
            $ProgressPreference = $old
            $downloaded = $true
        } catch {
            $downloaded = $false
        }
    }

    if (-not $downloaded -or -not (Test-Path $partial)) {
        if (Test-Path $partial) { Remove-Item $partial -Force }
        Die "could not download cloudflared (no internet, or too slow). Run this again, or install it once with: winget install Cloudflare.cloudflared"
    }
    Move-Item $partial $target -Force
    Ok "cloudflared downloaded"
    return $target
}

function Start-QuickTunnel([string] $exe, [int] $port, [string] $name) {
    $log = Join-Path $tunnelLogs "wellcare-tunnel-$name.log"
    if (Test-Path $log) { Remove-Item $log -Force -ErrorAction SilentlyContinue }

    # A quick tunnel is silently skipped when cloudflared finds a config.yml in
    # the user's profile (left over from any named tunnel). Pointing its home
    # at .tools\ for this one process means there is never one to find.
    $cfHome = Join-Path $tunnelHome 'cloudflared-home'
    New-Item -ItemType Directory -Force $cfHome | Out-Null
    $savedHome = $env:HOME; $savedProfile = $env:USERPROFILE
    $env:HOME = $cfHome; $env:USERPROFILE = $cfHome
    try {
        $proc = Start-Process -FilePath $exe -WindowStyle Hidden -PassThru -ArgumentList @(
            'tunnel', '--no-autoupdate', '--logfile', "`"$log`"", '--url', "http://127.0.0.1:$port")
    } finally {
        $env:HOME = $savedHome; $env:USERPROFILE = $savedProfile
    }

    return @{ Process = $proc; Log = $log; Name = $name }
}

# cloudflared prints the address inside a box once Cloudflare hands one out.
# `api.trycloudflare.com` is the endpoint it asks, and shows up in its errors.
function Wait-TunnelUrl($tunnel) {
    for ($i = 0; $i -lt 120; $i++) {
        Start-Sleep -Milliseconds 500
        # Normally ~6 seconds. Say something while it takes longer, so a slow
        # network never looks like a frozen script.
        if ($i -gt 0 -and $i % 20 -eq 0) { Info "still waiting for Cloudflare to hand out the $($tunnel.Name) address ($($i / 2)s of 60s)..." }
        if (-not (Test-Path $tunnel.Log)) { continue }

        $text = Get-Content $tunnel.Log -Raw -ErrorAction SilentlyContinue
        if ($text -match 'https://(?!api\.)[a-z0-9-]+\.trycloudflare\.com') { return $Matches[0] }

        if ($text -match '429|Too Many Requests') {
            Die "Cloudflare is refusing new quick tunnels for a moment (too many in a short time). Wait a minute, then run .\wellcare.cmd share again."
        }
        if ($tunnel.Process.HasExited) { break }
    }

    Warn "the $($tunnel.Name) tunnel did not start. Last lines of $($tunnel.Log):"
    if (Test-Path $tunnel.Log) { Get-Content $tunnel.Log -Tail 5 | ForEach-Object { Info $_ } }
    Die "no tunnel address. Is this laptop on the internet? (A network that blocks outbound port 7844 also blocks Cloudflare tunnels - try a phone hotspot.)"
}

function Invoke-Share {
    $php = Use-Php
    Assert-SetUp
    Ensure-MySql
    Assert-NotRunning
    Stop-StaleTunnels

    if ((Get-RunMode) -eq 'offline') {
        Invoke-Online -Brief
        Ok "switched to ONLINE - sharing needs internet"
    }

    Step "Opening the tunnels"
    $cloudflared = Use-Cloudflared
    $site = Start-QuickTunnel $cloudflared 8000 'site'
    $reverb = Start-QuickTunnel $cloudflared 8080 'reverb'

    try {
        $siteUrl = Wait-TunnelUrl $site
        $reverbHost = ([uri](Wait-TunnelUrl $reverb)).Host
        Ok "site    $siteUrl"
        Ok "reverb  https://$reverbHost"

        # REVERB_* reaches the browser as an Inertia prop on each request, so
        # no rebuild is needed. The share-url file makes every email link point
        # at the address the phone can open; APP_URL agrees with it.
        [System.IO.File]::WriteAllText($shareUrlFile, $siteUrl, (New-Object System.Text.UTF8Encoding($false)))
        $lines = Read-EnvLines
        $lines = Set-EnvValue $lines 'APP_URL' $siteUrl
        $lines = Set-EnvValue $lines 'REVERB_HOST' $reverbHost
        $lines = Set-EnvValue $lines 'REVERB_PORT' '443'
        $lines = Set-EnvValue $lines 'REVERB_SCHEME' 'https'
        Write-EnvLines $lines
        & $php artisan config:clear | Out-Null

        Write-Host ''
        Write-Host '=== WellCare is starting - the link and QR code appear below once the phone can reach it (about 30 seconds) ===' -ForegroundColor Cyan
        Write-Host '  Stop: Ctrl+C in this window' -ForegroundColor DarkGray
        Write-Host ''

        $watch = "powershell -NoProfile -ExecutionPolicy Bypass -File wellcare.ps1 tunnel-watch -SiteUrl $siteUrl -ReverbHost $reverbHost"
        if ($NoBrowser) { $watch += ' -NoBrowser' }
        Start-Stack @('tunnel') @($watch)
    } finally {
        Stop-Process -Id $site.Process.Id, $reverb.Process.Id -Force -ErrorAction SilentlyContinue
        Reset-TunnelEnv
        & $php artisan config:clear | Out-Null
        Write-Host ''
        Ok "tunnels closed; .env points at this machine again"
    }
}

# --- the `tunnel` pane --------------------------------------------------------
#
# Runs inside concurrently, so it must never exit: `-k` would take the whole
# stack down with it. Output is plain ASCII through a pipe - no colours.

# A brand-new tunnel name takes ~20s to appear in public DNS. Asking the
# laptop's own resolver before then caches "does not exist" for minutes, and
# the browser keeps failing long after the tunnel is fine. So ask Cloudflare's
# and Google's DNS-over-HTTPS instead, which leave the local cache untouched.
function Wait-PublicDns([string] $hostName) {
    $resolvers = @('https://cloudflare-dns.com/dns-query', 'https://dns.google/resolve')
    $failures = 0
    for ($i = 0; $i -lt 120; $i++) {
        $resolver = $resolvers[$failures % 2]
        try {
            $answer = Invoke-RestMethod "$resolver`?name=$hostName&type=A" -Headers @{ accept = 'application/dns-json' } -TimeoutSec 5 -UseBasicParsing
            if ($answer.Status -eq 0) { return }
        } catch {
            $failures++
            # Both resolvers blocked (some school networks): just give DNS the
            # usual time instead.
            if ($failures -ge 6) { Start-Sleep -Seconds 30; return }
        }
        Start-Sleep -Seconds 2
    }
}

function Test-Site {
    try {
        return (Invoke-WebRequest "$SiteUrl/up" -UseBasicParsing -TimeoutSec 15).StatusCode -eq 200
    } catch {
        return $false
    }
}

# The same check as TWO-DEVICE-TESTING.md section 2: a real WebSocket through
# the Reverb tunnel, which must answer pusher:connection_established. Anything
# less and the call sits on "Waiting for the other person" with no error.
function Test-Reverb([string] $key) {
    $socket = New-Object System.Net.WebSockets.ClientWebSocket
    $timeout = New-Object System.Threading.CancellationTokenSource 15000
    try {
        $uri = [uri]"wss://$ReverbHost/app/$key`?protocol=7&client=js&version=8.4.0&flash=false"
        $socket.ConnectAsync($uri, $timeout.Token).Wait()
        $buffer = New-Object byte[] 4096
        $segment = New-Object 'System.ArraySegment[byte]' -ArgumentList (, $buffer)
        $received = $socket.ReceiveAsync($segment, $timeout.Token).GetAwaiter().GetResult()
        return [Text.Encoding]::UTF8.GetString($buffer, 0, $received.Count) -like '*connection_established*'
    } catch {
        return $false
    } finally {
        $socket.Dispose()
        $timeout.Dispose()
    }
}

# The banner and QR leave in ONE raw write: concurrently interleaves the server
# log line by line, and a request logged mid-QR would make it unscannable. Raw
# bytes, because PowerShell would re-encode the QR's block characters.
function Write-ShareBanner([string] $php) {
    $qrFile = Join-Path $tunnelLogs "wellcare-qr-$PID.txt"
    Start-Process -FilePath $php -ArgumentList 'artisan', 'wellcare:qr', $SiteUrl -NoNewWindow -Wait -RedirectStandardOutput $qrFile -WorkingDirectory $repo
    # Typed, because an `if` expression would unroll the bytes into object[].
    [byte[]] $qr = @()
    if (Test-Path $qrFile) { $qr = [IO.File]::ReadAllBytes($qrFile) }
    Remove-Item $qrFile -Force -ErrorAction SilentlyContinue

    $nl = [Environment]::NewLine
    $top = $nl + '============================================================' + $nl +
        '  READY - open this on BOTH devices:' + $nl + $nl +
        "      $SiteUrl" + $nl + $nl +
        '  Phone: point the camera at this code' + $nl + $nl
    $bottom = $nl +
        '  Laptop (doctor):  dr.reyes@wellcare.com' + $nl +
        '  Phone (patient):  juan.dela.cruz@gmail.com   - video consult ready today' + $nl +
        '  Password:         password123' + $nl + $nl +
        '  Allow camera + microphone on both. iPhone: use Safari.' + $nl +
        '  Keep the two devices apart or use headphones, or they howl.' + $nl +
        '  The link is new every time share starts.' + $nl +
        '============================================================' + $nl + $nl

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $bytes = New-Object System.Collections.Generic.List[byte]
    $bytes.AddRange($utf8.GetBytes($top))
    $bytes.AddRange($qr)
    $bytes.AddRange($utf8.GetBytes($bottom))

    $stdout = [Console]::OpenStandardOutput()
    $stdout.Write($bytes.ToArray(), 0, $bytes.Count)
    $stdout.Flush()
}

function Invoke-TunnelWatch {
    $php = Use-Php
    $key = Get-EnvValue (Read-EnvLines) 'REVERB_APP_KEY'

    Write-Host 'waiting for the tunnel addresses to go live...'
    Wait-PublicDns ([uri]$SiteUrl).Host
    Wait-PublicDns $ReverbHost
    # Only now ask the local resolver; drop anything it cached too early.
    try { Clear-DnsClientCache -ErrorAction Stop } catch { }

    $ready = $false
    for ($i = 0; $i -lt 30 -and -not $ready; $i++) {
        $siteOk = Test-Site
        $reverbOk = $siteOk -and (Test-Reverb $key)
        $ready = $siteOk -and $reverbOk
        if (-not $ready) { Start-Sleep -Seconds 3 }
    }

    if ($ready) {
        Write-ShareBanner $php
        if (-not $NoBrowser) { Start-Process $SiteUrl }
    } else {
        if (-not $siteOk) { Write-Host "!! the site does not answer at $SiteUrl/up - see storage\logs\wellcare-tunnel-site.log" }
        else { Write-Host "!! the site works but Reverb does not answer at wss://$ReverbHost - video will sit on 'Waiting'. See storage\logs\wellcare-tunnel-reverb.log" }
        Write-Host '!! Stop with Ctrl+C and run .\wellcare.cmd share again. Still checking every 30 seconds...'
    }

    # Keep watching: a quick tunnel can drop, and a call that will not connect
    # looks exactly like a code bug unless something says otherwise.
    $wasOk = $ready
    $announced = $ready
    while ($true) {
        Start-Sleep -Seconds 30
        $ok = (Test-Site) -and (Test-Reverb $key)
        if ($ok -and -not $announced) { Write-ShareBanner $php; $announced = $true }
        elseif ($ok -and -not $wasOk) { Write-Host "tunnel is back: $SiteUrl" }
        elseif (-not $ok -and $wasOk) { Write-Host '!! the tunnel stopped answering. If it does not come back in a minute, Ctrl+C and run .\wellcare.cmd share again (the link will change).' }
        $wasOk = $ok
    }
}

function Invoke-Status {
    Write-Host ''
    Write-Host '  .env' -ForegroundColor Cyan
    if (Test-Path $envPath) { Show-EnvStatus } else { Warn "no .env - run .\wellcare.cmd setup" }
    if (Test-Path $envBackup) { Info ".env.backup-online exists -> currently OFFLINE (.\wellcare.cmd online restores it)" }

    Write-Host ''
    Write-Host '  Running' -ForegroundColor Cyan
    $php = Find-Php
    Write-Host ('    {0,-22} {1}' -f 'PHP', $(if ($php) { "$(Get-PhpVersion $php)  $php" } else { 'NOT FOUND' }))
    Write-Host ('    {0,-22} {1}' -f 'MySQL :3306', $(if (Test-Port '127.0.0.1' 3306) { 'up' } else { 'down' }))
    Write-Host ('    {0,-22} {1}' -f 'App :8000', $(if (Test-Port '127.0.0.1' 8000) { 'up' } else { 'down' }))
    Write-Host ('    {0,-22} {1}' -f 'Reverb :8080', $(if (Test-Port '127.0.0.1' 8080) { 'up' } else { 'down' }))
    Write-Host ''
}

function Show-Help {
    Write-Host ''
    Write-Host '  WellCare - laptop commands' -ForegroundColor Cyan
    Write-Host ''
    Write-Host '    .\wellcare.cmd setup      install everything + clean demo data (needs internet, once)'
    Write-Host '                              -Fresh  also wipe an existing database'
    Write-Host '    .\wellcare.cmd start      run the system at http://127.0.0.1:8000'
    Write-Host '                              asks Online or Offline first (Enter keeps the current one)'
    Write-Host '                              -Online / -Offline  skip the question'
    Write-Host '                              -Dev    with Vite hot reload, for coding'
    Write-Host '    .\wellcare.cmd reset      wipe the database, reseed the clean demo record'
    Write-Host '    .\wellcare.cmd offline    make it work with no internet'
    Write-Host '    .\wellcare.cmd online     undo offline'
    Write-Host '    .\wellcare.cmd status     show settings and what is running'
    Write-Host '    .\wellcare.cmd share      run it with a public https link + QR code, so a phone'
    Write-Host '                              can join a video consultation (needs internet)'
    Write-Host ''
    Write-Host '  Every demo password: password123' -ForegroundColor DarkGray
    Write-Host ''
}

switch ($Command.ToLower()) {
    'setup'   { Invoke-Setup }
    'start'   { Invoke-Start }
    'reset'   { Invoke-Reset }
    'offline' { Invoke-Offline }
    'online'  { Invoke-Online }
    'status'  { Invoke-Status }
    'share'   { Invoke-Share }
    'tunnel-watch' { Invoke-TunnelWatch }
    default   { Show-Help }
}
