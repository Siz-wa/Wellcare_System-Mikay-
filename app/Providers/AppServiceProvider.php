<?php

namespace App\Providers;

use App\Contracts\SmsDriver;
use App\Listeners\RecordAuthActivity;
use App\Sms\LogSmsDriver;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Console\ServeCommand;
use Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull;
use Illuminate\Foundation\Http\Middleware\TrimStrings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use InvalidArgumentException;
use RuntimeException;
use Spatie\Permission\PermissionRegistrar;
use Throwable;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->bindSmsDriver();
    }

    /**
     * Resolve the SMS transport named in config/sms.php.
     *
     * A match rather than a container alias so an unknown driver name fails
     * loudly at boot. The alternative — falling back to the log driver — would
     * mean a production typo in `SMS_DRIVER` silently stopped sending every
     * clinical message while appearing to work.
     */
    private function bindSmsDriver(): void
    {
        $this->app->singleton(SmsDriver::class, function (): SmsDriver {
            $driver = (string) config('sms.driver', 'log');

            return match ($driver) {
                'log' => new LogSmsDriver,
                default => throw new InvalidArgumentException(
                    "Unknown SMS driver [{$driver}]. Add it to AppServiceProvider::bindSmsDriver()."
                ),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureProductionSafety();
        $this->useSharedPublicUrl();
        $this->configureAssetPreloading();
        $this->configureSignallingRelay();
        $this->allowWindowsCasedServeVariables();
        $this->allowServeSubprocessUploads();

        // Sign-ins, sign-outs, failed attempts and password resets into the
        // audit trail. Registered explicitly rather than through Laravel's
        // listener auto-discovery, which binds one event per class by the
        // `handle` type-hint and so would need four near-empty classes.
        RecordAuthActivity::register();

        $this->warmPermissionRegistrar();
    }

    /**
     * Load the role/permission table into the registrar once per request.
     *
     * spatie/laravel-permission caches the whole table and rebuilds it lazily on
     * the first `hasRole()` of a request. When that cache has just been dropped
     * — `optimize:clear`, `cache:clear`, a deploy — the rebuild races anything
     * else touching the same cache store in the same request.
     *
     * It showed up once during the September end-to-end run: an administrator
     * cleared the two-factor challenge and was answered with a bare
     * "403 USER DOES NOT HAVE THE RIGHT ROLES" from the `role:admin|owner`
     * middleware, on an account that does hold `admin`. Loading /admin/dashboard
     * a second later worked, and two further logout/login cycles were clean, so
     * the roles were never the problem — the registrar simply had nothing in it
     * at the moment the middleware asked.
     *
     * Priming it here makes the lookup answer from a populated registrar on the
     * request's first check rather than mid-pipeline. Cheap: one query, and only
     * when the cache is actually cold.
     */
    private function warmPermissionRegistrar(): void
    {
        if ($this->app->runningInConsole()) {
            return;
        }

        try {
            app(PermissionRegistrar::class)->getPermissions();
        } catch (Throwable) {
            // A missing permissions table (first migrate, a fresh CI database)
            // must not take the whole application down on boot. Whatever asks
            // for a role next will surface the real problem in its own context.
        }
    }

    /**
     * Settings that must hold in production regardless of what `.env` says.
     *
     * `.env.example` documents every one of these, but a deployment is a copy
     * of a template made by a person under time pressure, and the failure mode
     * is silent: a production app with `APP_DEBUG=true` looks completely normal
     * until the first exception renders a stack trace — with the query, the
     * bindings, and whatever patient row was in flight — to whoever triggered
     * it. `SESSION_SECURE_COOKIE` unset is worse, because it never looks wrong
     * at all: the session cookie simply also goes out over plain HTTP.
     *
     * So these are forced rather than merely recommended. Documentation cannot
     * be relied on to survive a deploy; this can.
     *
     * Scoped to production for the same reason HSTS is in SecurityHeaders:
     * forcing an HTTPS-only cookie on a local http:// dev server logs the
     * developer out on every request, and forcing `https` scheme generation
     * breaks `php artisan serve` entirely.
     *
     * Session config is read by StartSession when the request is handled, and
     * `app.debug` by the exception handler when a response is rendered — both
     * strictly after providers boot, so setting them here takes effect.
     *
     * NOTE: turning on `session.encrypt` invalidates sessions that were written
     * unencrypted, so the first deploy after this lands signs everyone out
     * once. That is the intended trade and is a one-time cost.
     */
    protected function configureProductionSafety(): void
    {
        if (! $this->app->isProduction()) {
            return;
        }

        // Every URL this application generates is a URL into a medical record
        // system. TLS termination belongs to the web server, but scheme
        // generation belongs here — behind a proxy, Laravel would otherwise
        // emit http:// links from an https:// request.
        URL::forceScheme('https');

        config([
            'app.debug' => false,
            'session.secure' => true,
            'session.encrypt' => true,
        ]);

        $this->guardEncryptionKey();
    }

    /**
     * Refuse to run in production without an encryption key.
     *
     * SC-5 / ND-8. Since the clinical columns gained `encrypted` casts, APP_KEY
     * is not a nicety — it is the only thing standing between the application
     * and a database of unreadable ciphertext. A production boot with a missing
     * key would not fail cleanly either: reads of every diagnosis, SOAP note and
     * allergen would throw one request at a time, deep inside the pages that
     * matter most, and it would look like a database problem.
     *
     * Failing at boot converts an unbounded, confusing outage into an immediate
     * and specific one. It also makes the mistake impossible to deploy past.
     *
     * The other half of the mitigation is key ROTATION, which lives in
     * config/app.php as `APP_PREVIOUS_KEYS`: Laravel decrypts with any previous
     * key and encrypts with the current one, so the key can be changed without
     * a downtime migration over the whole clinical record.
     */
    protected function guardEncryptionKey(): void
    {
        if (config('app.key')) {
            return;
        }

        throw new RuntimeException(
            'APP_KEY is not set. This application encrypts patient diagnoses, '
            .'consultation notes, allergies, lab results and insurance member '
            .'numbers at rest, and cannot read any of them without it. Refusing '
            .'to start rather than serving errors from every clinical page. '
            .'Restore the key from your secret store — do NOT run key:generate '
            .'against a database that already holds encrypted records, because a '
            .'new key cannot decrypt them.'
        );
    }

    /**
     * Point email links at the live `wellcare.ps1 share` address, if there is
     * one.
     *
     * Every link in an email — verify, reset, staff invitation, the buttons in
     * the appointment emails — is built from `app.url`, by a queue worker with
     * no request to take a host from. On a laptop that is
     * `http://127.0.0.1:8000`, which on the phone that opens the email is the
     * phone itself: "refused to connect". And `.env` alone cannot fix it: a
     * worker keeps the `APP_URL` it started with (`queue:listen` hands its
     * environment to every child), and a job queued before the tunnel opened
     * renders after it.
     *
     * So `share` writes the tunnel address to one file and deletes it on exit,
     * and this reads it on every boot. Each queued job and each scheduler run
     * is a fresh process, so an email is built with the address that is live
     * at the moment it is SENT, not the one that was live when something
     * started.
     *
     * Web requests keep their own host for routing: forcing the tunnel there
     * would bounce someone browsing at 127.0.0.1 onto a domain where they have
     * no session. Only `app.url` changes for them, which is what the email
     * templates read.
     *
     * Never in production, where the deployment owns `APP_URL`. Not at boot
     * under the test suite either: a `share` running on the same laptop must
     * not change what the tests' URLs look like. Tests pass their own file.
     */
    public function useSharedPublicUrl(?string $file = null): void
    {
        if ($this->app->isProduction()) {
            return;
        }

        if ($file === null) {
            if ($this->app->runningUnitTests()) {
                return;
            }
            $file = storage_path('framework/share-url');
        }

        if (! is_file($file)) {
            return;
        }

        $url = rtrim(trim((string) file_get_contents($file)), '/');
        if (! str_starts_with($url, 'https://') || filter_var($url, FILTER_VALIDATE_URL) === false) {
            return;
        }

        config(['app.url' => $url]);

        if ($this->app->runningInConsole()) {
            URL::forceRootUrl($url);
            URL::forceScheme('https');
        }
    }

    /**
     * Restore the Windows-cased environment names that `artisan serve` strips.
     *
     * To watch `.env` for changes, ServeCommand hands the `php -S` child a
     * filtered copy of the environment, keeping only the names listed in
     * `ServeCommand::$passthroughVariables`. Every name in that list is
     * UPPERCASE and the match is a case-sensitive `in_array` — but Windows'
     * canonical names are `Path` and `SystemRoot`. Verified on this machine:
     *
     *     cmd /c set        -> Path, SystemRoot
     *     array_keys($_ENV) -> Path, SystemRoot
     *
     * So on native cmd.exe NOTHING matches. The subprocess is spawned with no
     * PATH and no SystemRoot, Winsock cannot initialise, and every port from
     * 8000 upward reports:
     *
     *     Failed to listen on 127.0.0.1:8000 (reason: ?)
     *
     * IT LOOKS LIKE A PORT CONFLICT AND IS NOT. The ports are free — the same
     * binary binds 8000 happily via a bare `php -S`. The literal `?` is PHP
     * having no error string for the WSA code it got back.
     *
     * `$passthroughVariables` is public static precisely so this can be
     * corrected without patching vendor code and without giving up the .env
     * watcher. (`--no-reload` also cures it, by skipping the filtering branch
     * entirely — at the cost of that watcher, and of diverging from the stock
     * starter-kit `composer.json`.)
     *
     * ⚠️ Invisible from Git Bash / WSL, where MSYS normalises the names to
     * `PATH` and `SYSTEMROOT` so they match the list. Reproduce from cmd.exe
     * or it looks like a phantom that comes and goes.
     */
    protected function allowWindowsCasedServeVariables(): void
    {
        if (! windows_os() || ! $this->app->runningInConsole()) {
            return;
        }

        foreach (['Path', 'SystemRoot'] as $name) {
            if (! in_array($name, ServeCommand::$passthroughVariables, true)) {
                ServeCommand::$passthroughVariables[] = $name;
            }
        }
    }

    /**
     * Give the `artisan serve` subprocess a temporary directory, so file
     * uploads work.
     *
     * Same mechanism as the method above and a completely different symptom.
     * `ServeCommand::$passthroughVariables` does not carry `TMP` or `TEMP`, and
     * on Windows those are how PHP finds a scratch directory: GetTempPath()
     * reads TMP, then TEMP, then USERPROFILE, and only then falls back to the
     * Windows directory — which a normal account cannot write to. `SystemRoot`
     * is passed through (see above), so the fallback resolves, gets refused,
     * and PHP reports:
     *
     *     PHP Request Startup: File upload error - unable to create a
     *     temporary file in Unknown on line 0
     *
     * The consequence is that **`$_FILES` is empty for every upload in the
     * whole application** while running under `composer dev` on Windows.
     * Laravel then fails the `uploaded` rule and answers "The <field> failed to
     * upload." — a message that reads like a bad file and is nothing of the
     * kind. Reproduced 2026-09-10 against the doctor photo endpoint; a bare
     * `php -S` from the same shell, with the same php.ini and the same file,
     * accepted the identical upload with `error: 0`.
     *
     * Nothing in the application can work around it: by the time a controller
     * or a form request runs, PHP has already discarded the upload. This has to
     * be fixed where the subprocess is spawned, which is here.
     *
     * `upload_tmp_dir` in php.ini is the other cure, and is deliberately not
     * the one taken: it is per-machine, invisible to the repository, and every
     * teammate would hit this once each.
     */
    protected function allowServeSubprocessUploads(): void
    {
        if (! $this->app->runningInConsole()) {
            return;
        }

        // USERPROFILE is the third place GetTempPath() looks and costs nothing
        // to include; TMPDIR is the POSIX name, harmless on Windows and correct
        // on a Linux host that has the same variable filtered out.
        foreach (['TMP', 'TEMP', 'TMPDIR', 'USERPROFILE'] as $name) {
            if (! in_array($name, ServeCommand::$passthroughVariables, true)) {
                ServeCommand::$passthroughVariables[] = $name;
            }
        }
    }

    /**
     * Exempt the WebRTC signalling relay from request-input transformation.
     *
     * `TrimStrings` runs `Str::trim()` over every string in the request,
     * including nested array values. An SDP is a CRLF-delimited format in which
     * **every** line, including the last, must be terminated — so trimming the
     * payload silently deletes the final `\r\n` and the receiving peer answers:
     *
     *     Failed to execute 'setRemoteDescription' on 'RTCPeerConnection':
     *     Failed to parse SessionDescription. a=ssrc:… Invalid SDP line.
     *
     * The whole offer is rejected over one absent line ending. This is a
     * genuinely nasty failure: the POST succeeds, the event broadcasts, the
     * server logs nothing, and only the *other* device throws — so it presents
     * as "the call never connects" with no evidence on the side that caused it.
     *
     * It is also selective in a way that misleads. `hello` carries an empty
     * payload and ICE candidate strings have no trailing whitespace, so those
     * relay perfectly; only the offer and answer are damaged. Signalling looks
     * half-working, which points the investigation at the socket rather than at
     * the request pipeline.
     *
     * Scoped to the one route by design. This endpoint alone is a pass-through
     * for opaque peer data — ConsultationRoomController never parses SDP or
     * inspects a candidate, and trimming is exactly the kind of inspection it
     * promises not to do. Every other route in the app still wants trimming.
     * `ConvertEmptyStringsToNull` is skipped for the same reason: transforming
     * a relayed payload is not this application's business.
     */
    protected function configureSignallingRelay(): void
    {
        $isSignalRelay = fn (Request $request): bool => $request->is('consultations/rooms/*/signal');

        TrimStrings::skipWhen($isSignalRelay);
        ConvertEmptyStringsToNull::skipWhen($isSignalRelay);
    }

    /**
     * Stop emitting `<link rel="preload">` tags for built assets when the app
     * is served by the PHP development server.
     *
     * `php artisan serve` is the PHP built-in server, which handles exactly one
     * request at a time. `PHP_CLI_SERVER_WORKERS` would raise that, but it is
     * implemented with fork() and therefore does nothing on Windows — this
     * project's dev platform.
     *
     * Laravel's `@vite` emits a preload tag *and* a stylesheet tag for the same
     * file, so the browser requests a 101 KB stylesheet twice before it can
     * paint. Behind a tunnel — where the consultation room has to run, because
     * getUserMedia needs a secure context — that doubling lands on a
     * single-threaded server alongside the Inertia request, the page chunks and
     * a WebSocket upgrade. Requests queue, and Vite's `__vitePreload` helper
     * has no retry: when it gives up it rejects, and a rejected preload rejects
     * the dynamic page import behind it, so Inertia renders nothing.
     *
     * Preload tags are a production optimisation against a real web server.
     * They are a liability against a one-request-at-a-time dev server, so they
     * are disabled only there — production keeps them.
     */
    protected function configureAssetPreloading(): void
    {
        if (app()->isProduction()) {
            return;
        }

        Vite::usePreloadTagAttributes(false);

        /*
         * Emit asset URLs as root-relative paths instead of absolute ones.
         *
         * This is the actual fix for
         * `Uncaught (in promise) Error: Unable to preload CSS for
         * /build/assets/app-*.css`, and it is not a cosmetic preference.
         *
         * Vite's runtime preload helper dedupes against the document with a
         * literal attribute selector:
         *
         *     if (document.querySelector(`link[href="${h}"][rel="stylesheet"]`)) return;
         *
         * `h` is the build-time path, `/build/assets/app-*.css`. Laravel's
         * `asset()` renders `href="https://<host>/build/assets/app-*.css"`.
         * An attribute selector compares the literal attribute value, so an
         * absolute href never matches a relative `h` — the guard always misses,
         * and Vite appends a SECOND `<link rel="stylesheet" crossOrigin="">`
         * for a stylesheet the page already has. That duplicate is the
         * `sec-fetch-mode: cors` request in the network log, and when it fails
         * its `error` listener rejects with the message above.
         *
         * It fails here because `php artisan serve` is single-threaded (and
         * `PHP_CLI_SERVER_WORKERS` is fork-based, so it is a no-op on Windows).
         * The duplicate is requested last, after ~25 other assets, through a
         * tunnel — measured latency under that load went 0.15s -> ~1s.
         *
         * Making the href relative lets the dedupe match, so the duplicate is
         * never requested and there is nothing left to fail.
         *
         * Local only: overriding this in production would break any deployment
         * that serves assets from a CDN via ASSET_URL.
         */
        Vite::createAssetPathsUsing(
            fn (string $path, ?bool $secure = null): string => '/'.ltrim($path, '/')
        );
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
