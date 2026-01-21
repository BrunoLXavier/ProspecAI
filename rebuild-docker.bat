@echo off
REM ProspecAI Docker Rebuild Script (concise)
REM Usage: rebuild-docker.bat [all|backend|frontend] [no-cache]

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM --- Argument parsing ---
set REBUILD_ALL=0
set REBUILD_BACKEND=0
set REBUILD_FRONTEND=0
set NO_CACHE=0

if "%~1"=="backend" (
    set REBUILD_BACKEND=1
) else (
    if "%~1"=="frontend" (
        set REBUILD_FRONTEND=1
    ) else (
        set REBUILD_ALL=1
    )
)
if /I "%~2"=="no-cache" set NO_CACHE=1
if /I "%~2"=="-no-cache" set NO_CACHE=1
if /I "%~2"=="--no-cache" set NO_CACHE=1

REM --- Optional flags parsing (supports --use-entrypoint or use-entrypoint anywhere) ---
set USE_ENTRYPOINT=0
for %%a in (%*) do (
    if /I "%%~a"=="use-entrypoint" set USE_ENTRYPOINT=1
    if /I "%%~a"=="--use-entrypoint" set USE_ENTRYPOINT=1
    if /I "%%~a"=="/use-entrypoint" set USE_ENTRYPOINT=1
    if /I "%%~a"=="--restart" set RESTART_FLAG=--restart
    if /I "%%~a"=="--fresh" set RESTART_FLAG=--fresh
    if /I "%%~a"=="--skip-ai" set SKIP_AI_FLAG=--skip-ai
    if /I "%%~a"=="--no-migrate" set NO_MIGRATE_FLAG=--no-migrate
    if /I "%%~a"=="no-cache" set NO_CACHE=1
    if /I "%%~a"=="-no-cache" set NO_CACHE=1
    if /I "%%~a"=="--no-cache" set NO_CACHE=1
)
if %USE_ENTRYPOINT%==1 (
    echo [*] USE_ENTRYPOINT enabled for this run
)

echo.
echo ================================================================
echo       ProspecAI Docker Rebuild
echo ================================================================
echo.

echo [*] Tearing down existing containers (removes orphans)...
docker compose down --remove-orphans
if !ERRORLEVEL! NEQ 0 echo [WARN] docker compose down returned non-zero

if %REBUILD_ALL%==1 (
    echo [*] Rebuilding backend and frontend - no-cache: !NO_CACHE!...
    if %NO_CACHE%==1 (
        docker compose build --no-cache backend frontend
    ) else (
        docker compose build backend frontend
    )
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Build failed
        exit /b 1
    )
    echo [OK] Rebuilt backend and frontend
)

if %REBUILD_BACKEND%==1 (
    echo [*] Rebuilding backend...
    if %NO_CACHE%==1 (
        docker compose build --no-cache backend
    ) else (
        docker compose build backend
    )
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Backend build failed
        exit /b 1
    )
    echo [OK] Backend rebuilt
)

if %REBUILD_FRONTEND%==1 (
    echo [*] Rebuilding frontend...
    if %NO_CACHE%==1 (
        docker compose build --no-cache frontend
    ) else (
        docker compose build frontend
    )
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Frontend build failed
        exit /b 1
    )
    echo [OK] Frontend rebuilt
)

echo [*] Starting services via start-docker.bat (handles health checks)...
echo Calling start-docker with flags: %RESTART_FLAG% %SKIP_AI_FLAG% %NO_MIGRATE_FLAG%
call "%~dp0start-docker.bat" %RESTART_FLAG% %SKIP_AI_FLAG% %NO_MIGRATE_FLAG%
if ERRORLEVEL 1 (
    echo [ERROR] start-docker.bat failed.
    exit /b 1
)

REM --- Ensure admin password is set after startup ---
echo [*] Running admin password updater inside backend container...
docker compose exec backend python /app/scripts/set_admin_password.py
if ERRORLEVEL 1 (
    echo [WARN] set_admin_password.py returned non-zero; continuing.
)

echo.
echo ================================================================
echo       Rebuild Complete
echo ================================================================
echo.

endlocal
