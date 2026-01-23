@echo off
REM ================================================================
REM  ProspecAI Docker Rebuild Script
REM  Usage: rebuild-docker.bat [backend|frontend|all] [flags]
REM  Flags: --no-cache --restart --fresh --skip-ai --no-migrate --no-start
REM ================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM Initialize all flags with defaults
set "REBUILD_TARGET=all"
set "NO_CACHE=0"
set "USE_ENTRYPOINT=0"
set "RESTART_FLAG=--restart"
set "SKIP_AI_FLAG="
set "NO_MIGRATE_FLAG="
set "NO_START=0"

REM Pre-check: kill any stuck containers before starting
docker compose ps >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo [*] Stopping any running containers first...
    docker compose kill >nul 2>&1
    docker compose rm -f >nul 2>&1
)

REM Parse arguments - consolidate all flag parsing in one pass
if "%~1"=="" goto :parse_done
if /I "%~1"=="backend" (
    set "REBUILD_TARGET=backend"
    shift
) else if /I "%~1"=="frontend" (
    set "REBUILD_TARGET=frontend"
    shift
)

REM Parse remaining flags
:parse_flags
if "%~1"=="" goto :parse_done
if /I "%~1"=="--help" goto :show_help
if /I "%~1"=="/?" goto :show_help
if /I "%~1"=="--no-cache" (set "NO_CACHE=1" & shift & goto :parse_flags)
if /I "%~1"=="--restart" (set "RESTART_FLAG=--restart" & shift & goto :parse_flags)
if /I "%~1"=="--fresh" (set "RESTART_FLAG=--fresh" & shift & goto :parse_flags)
if /I "%~1"=="--skip-ai" (set "SKIP_AI_FLAG=--skip-ai" & shift & goto :parse_flags)
if /I "%~1"=="--no-migrate" (set "NO_MIGRATE_FLAG=--no-migrate" & shift & goto :parse_flags)
if /I "%~1"=="--no-start" (set "NO_START=1" & shift & goto :parse_flags)
if /I "%~1"=="--use-entrypoint" (set "USE_ENTRYPOINT=1" & shift & goto :parse_flags)

echo [WARN] Unknown argument: %~1
shift
goto :parse_flags

:parse_done
if %USE_ENTRYPOINT%==1 echo [*] USE_ENTRYPOINT enabled for this run

echo.
echo ================================================================
echo       ProspecAI Docker Rebuild
echo ================================================================
echo Target: %REBUILD_TARGET%  (Flags: no-cache=%NO_CACHE% restart=%RESTART_FLAG%)
echo.

REM Tear down existing containers (with timeout and force flags)
echo [*] Tearing down existing containers (removes orphans)...
docker compose down --remove-orphans -t 10 2>nul
if !ERRORLEVEL! NEQ 0 (
    echo [WARN] docker compose down returned non-zero; attempting force removal...
    docker compose kill >nul 2>&1
    docker compose rm -f >nul 2>&1
)

REM Build target services
if /I "%REBUILD_TARGET%"=="all" (
    call :build_service "backend frontend" "Backend and Frontend" !NO_CACHE!
) else if /I "%REBUILD_TARGET%"=="backend" (
    call :build_service "backend" "Backend" !NO_CACHE!
) else if /I "%REBUILD_TARGET%"=="frontend" (
    call :build_service "frontend" "Frontend" !NO_CACHE!
)

echo [*] Starting services via start-docker.bat (handles health checks)...
if "%NO_START%"=="1" (
    echo [*] --no-start provided; skipping service startup
    goto :end
)

REM Build complete START_ARGS from all defined flags
set "START_ARGS=%RESTART_FLAG%"
if defined SKIP_AI_FLAG set "START_ARGS=!START_ARGS! %SKIP_AI_FLAG%"
if defined NO_MIGRATE_FLAG set "START_ARGS=!START_ARGS! %NO_MIGRATE_FLAG%"

echo [*] Calling start-docker with: %START_ARGS%
call "%~dp0start-docker.bat" %START_ARGS% --show-migrations
if ERRORLEVEL 1 (
    echo [ERROR] start-docker.bat failed
    exit /b 1
)

REM Wait for backend to be running and set admin password
echo [*] Waiting for backend service to be running (timeout 120s)...
powershell -NoProfile -Command "$timeout=120; $i=0; while($i -lt $timeout){ try{ $s=(docker compose ps backend 2>$null | Out-String) } catch { $s = '' } ; if($s -match 'healthy' -or $s -match 'Up'){ Write-Host '[OK] Backend is Up; running admin updater.'; exit 0 } ; if($i -eq 0){ Write-Host '[..] waiting for backend...' } elseif($i -eq 30){ Write-Host '[..] still waiting...' } ; Start-Sleep -Seconds 1; $i++ } ; Write-Host '[WARN] Timeout waiting for backend; continuing anyway.'; exit 1"

echo [*] Running admin password updater...
docker compose exec backend python /app/scripts/set_admin_password.py
if ERRORLEVEL 1 (
    echo [WARN] Admin password update returned non-zero; continuing
)

:end

echo ================================================================
echo       Rebuild Complete
echo ================================================================
echo.

endlocal
exit /b 0

REM ================================================================
REM  HELPER FUNCTIONS
REM ================================================================

:build_service
REM Parameter: %~1=services %~2=description %~3=no_cache_flag
set "SERVICES=%~1"
set "DESCRIPTION=%~2"
set "CACHE_FLAG="
if "%~3"=="1" set "CACHE_FLAG=--no-cache"

echo [*] Rebuilding %DESCRIPTION% %CACHE_FLAG%...
docker compose build %CACHE_FLAG% %SERVICES%
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Build failed for %SERVICES%
    exit /b 1
)
echo [OK] Successfully rebuilt %DESCRIPTION%
goto :eof

:show_help
echo Usage: rebuild-docker.bat [target] [flags]
echo.
echo Targets:
echo   backend   Build only backend service
echo   frontend  Build only frontend service
echo   all       Build all services (default)
echo.
echo Flags:
echo   --no-cache        Force rebuild without using Docker cache
echo   --restart         Stop and restart services after build (default)
echo   --fresh           Stop, remove volumes and rebuild fresh
echo   --skip-ai         Skip loading AI models
echo   --no-migrate      Skip database migrations
echo   --no-start        Build only, don't start services
echo.
echo Examples:
echo   rebuild-docker.bat backend --no-cache
echo   rebuild-docker.bat all --fresh --skip-ai
exit /b 0
