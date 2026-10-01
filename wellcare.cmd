@echo off
rem  Lets `wellcare <command>` work from cmd.exe and from a double-click-free
rem  PowerShell on a fresh Windows, where unsigned .ps1 files are blocked by the
rem  default ExecutionPolicy. The bypass applies to this one process only.
rem  All logic lives in wellcare.ps1.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0wellcare.ps1" %*
exit /b %ERRORLEVEL%
