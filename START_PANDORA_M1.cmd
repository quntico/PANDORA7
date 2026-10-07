@echo off
setlocal
title PANDORA M1
color 0B
cls

echo PANDORA M1
echo Iniciando servicios...
echo.

set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

:: ---- BACKEND (port 3010) ----
:: Check if server.js was modified after any running node process started
:: Strategy: always kill node first if server.js was recently modified, then restart fresh.

:: Get server.js modification timestamp (seconds since epoch via PowerShell)
for /f %%T in ('powershell -NoProfile -NonInteractive -Command "(Get-Item server.js).LastWriteTimeUtc.ToFileTimeUtc()"') do set SERVER_TS=%%T

:: Check if port 3010 is listening
netstat -ano | findstr /R /C:":3010 .*LISTENING" >nul
if %errorlevel% neq 0 (
    :: Port not listening, just start fresh
    start /B node server.js >nul 2>&1
    goto check_frontend
)

:: Port IS listening. Check if the running process predates server.js changes.
:: Get the oldest node process start time as FileTime
for /f %%P in ('powershell -NoProfile -NonInteractive -Command "$procs=Get-NetTCPConnection -LocalPort 3010 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess; if ($procs) { (Get-Process -Id $procs[0]).StartTime.ToFileTimeUtc() } else { 0 }"') do set PROC_START=%%P

:: If server.js is newer than the running process → restart backend
if %SERVER_TS% GTR %PROC_START% (
    echo [RESTART] server.js has changed. Reiniciando backend...
    powershell -NoProfile -NonInteractive -Command "Get-NetTCPConnection -LocalPort 3010 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
    timeout /t 1 >nul
    start /B node server.js >nul 2>&1
)

:check_frontend
:: CHECK FRONTEND (port 4001)
netstat -ano | findstr /R /C:":4001 .*LISTENING" >nul
if %errorlevel% neq 0 (
    start /B npm run dev >nul 2>&1
)

:: CHECK NEXUS DAEMON
powershell -NoProfile -NonInteractive -Command "if (Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'nexus_mirror_daemon.js' -and $_.CommandLine -notmatch 'powershell' }) { exit 0 } else { exit 1 }"
if %errorlevel% neq 0 (
    start /B node nexus_mirror_daemon.js >nul 2>&1
)

:wait_backend
curl -s --max-time 2 http://localhost:3010/ >nul
if %errorlevel% neq 0 (
    timeout /t 1 >nul
    goto wait_backend
)
echo Backend ........ OK

:wait_frontend
curl -s --max-time 2 http://localhost:4001/m1 >nul
if %errorlevel% neq 0 (
    timeout /t 1 >nul
    goto wait_frontend
)
echo Frontend ....... OK
echo NEXUS .......... OK

echo.
echo Abriendo PANDORA...
start http://localhost:4001/m1

timeout /t 3 >nul
exit
