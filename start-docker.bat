@echo off
REM ================================================================
REM  ProspecAI Docker Startup Script with Service Health Checks
REM  Usage: start-docker.bat [flags]
REM  Flags: --restart --fresh --skip-ai --no-migrate --show-migrations --help
REM ================================================================

setlocal EnableDelayedExpansion
set "LOG_FILE=%~dp0start-docker.run.log"
set "BACKEND_LOG=%~dp0start-docker.backend.log"
set "TEMP_ENV=%~dp0.env.start.tmp"
set "STEP=0"

REM Initialize flags with defaults
set "RESTART_MODE="
set "SKIP_AI="
set "NO_MIGRATE="
set "SHOW_MIGRATIONS="
set "RUN_MIGRATIONS=1"
set "RUN_ENV_ARGS="
set "SEED_TENANT_IDS="

REM Clean up old logs
if exist "%LOG_FILE%" del /q "%LOG_FILE%" >nul 2>&1
if exist "%TEMP_ENV%" del /q "%TEMP_ENV%" >nul 2>&1

REM Parse arguments
:parse_flags
if "%~1"=="" goto :parse_done
if /I "%~1"=="--help" goto :show_help
if /I "%~1"=="/?" goto :show_help
if /I "%~1"=="--restart" (set "RESTART_MODE=restart" & shift & goto :parse_flags)
if /I "%~1"=="--fresh" (set "RESTART_MODE=fresh" & shift & goto :parse_flags)
if /I "%~1"=="--skip-ai" (set "SKIP_AI=1" & shift & goto :parse_flags)
if /I "%~1"=="--no-migrate" (set "NO_MIGRATE=1" & shift & goto :parse_flags)
if /I "%~1"=="--show-migrations" (set "SHOW_MIGRATIONS=1" & shift & goto :parse_flags)
echo [WARN] Unknown argument: %~1
shift
goto :parse_flags

:parse_done
if "%NO_MIGRATE%"=="1" set "RUN_MIGRATIONS=0"

REM ================================================================
REM  MAIN EXECUTION FLOW
REM ================================================================

:main
call :log [START] ProspecAI Docker startup

REM Stop and clean up if RESTART_MODE is set
if defined RESTART_MODE (
  call :log Stopping existing services ^(mode=%RESTART_MODE%^)
  if "%RESTART_MODE%"=="restart" (
    docker compose down --remove-orphans 2>nul
  ) else (
    docker compose down --volumes --rmi local --remove-orphans 2>nul
  )
  if !ERRORLEVEL! NEQ 0 call :log [WARN] docker compose down returned error; continuing anyway
  call :log Waiting 2 seconds for Docker to settle...
  timeout /t 2 >nul
)

REM Setup environment variables
call :setup_env

REM Start services
call :log Bringing up compose services...
docker compose up -d >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
  call :log [ERROR] docker compose up failed
  call :cleanup
  exit /b 1
)

REM Wait for services to initialize
call :log Waiting 5 seconds for services to initialize...
timeout /t 5 >nul

REM Wait for each service to reach healthy state
call :log Waiting for services to reach healthy state...
set "WAIT_SERVICES=postgres:60:1:8 backend:120:1:8 neo4j:120:1:8 frontend:60:1:8"
for %%E in (%WAIT_SERVICES%) do (
  call :wait_for_service_dispatch %%E
  if !ERRORLEVEL! NEQ 0 (
    call :log [ERROR] Service failed to reach healthy state
    call :cleanup
    exit /b 1
  )
)

REM Run migrations if enabled
if "%RUN_MIGRATIONS%"=="1" (
  call :run_migrations
  if !ERRORLEVEL! NEQ 0 (
    call :cleanup
    exit /b 1
  )
)

REM Ensure frontend is running
call :log Ensuring frontend is running...
docker compose start frontend >nul 2>&1

REM Run seed scripts
call :run_seeds

REM Final cleanup - remove temp files only on success
call :log Cleaning up temporary files...
del /q "%~dp0tmp_status_*.txt" >nul 2>&1
if exist "%TEMP_ENV%" del /q "%TEMP_ENV%" >nul 2>&1

REM Keep log files for user review
call :log [SUCCESS] All services are running
call :log To follow logs, run: docker compose logs -f
call :log Backend log saved to: %BACKEND_LOG%
call :log Startup log saved to: %LOG_FILE%

endlocal
exit /b 0

REM ================================================================
REM  HELPER FUNCTIONS
REM ================================================================

:setup_env
REM Setup environment file and variables based on flags
if "%SKIP_AI%"=="1" (
  if not exist "%TEMP_ENV%" echo.>"%TEMP_ENV%"
  echo SKIP_AI_MODELS=1>> "%TEMP_ENV%"
  set "RUN_ENV_ARGS=-e SKIP_AI_MODELS=1"
)
if "%NO_MIGRATE%"=="1" (
  if not exist "%TEMP_ENV%" echo.>"%TEMP_ENV%"
  echo RUN_MIGRATIONS=0>> "%TEMP_ENV%"
  if defined RUN_ENV_ARGS (
    set "RUN_ENV_ARGS=!RUN_ENV_ARGS! -e RUN_MIGRATIONS=0"
  ) else (
    set "RUN_ENV_ARGS=-e RUN_MIGRATIONS=0"
  )
)
goto :eof

:wait_for_service_dispatch
REM Parse service config and call wait function
for /f "tokens=1-4 delims=:" %%a in ("%~1") do (
  set "SVC=%%a"
  set "SVC_TIMEOUT=%%b"
  set "SVC_INIT=%%c"
  set "SVC_MAX=%%d"
)
if "%SVC_TIMEOUT%"=="" set "SVC_TIMEOUT=60"
if "%SVC_INIT%"=="" set "SVC_INIT=1"
if "%SVC_MAX%"=="" set "SVC_MAX=8"
call :wait_for_service "%SVC%" %SVC_TIMEOUT% %SVC_INIT% %SVC_MAX%
goto :eof

:wait_for_service
setlocal EnableDelayedExpansion
set "SERVICE=%~1"
set "TIMEOUT=%~2"
set "INIT_DELAY=%~3"
set "MAX_DELAY=%~4"
set "ELAPSED=0"
set "DELAY=!INIT_DELAY!"

call :log Waiting for %SERVICE% ^(timeout=%TIMEOUT%s, init=%INIT_DELAY%s, max=%MAX_DELAY%s^)

:wait_loop
docker compose ps "%SERVICE%" > "%~dp0tmp_status_%SERVICE%.txt" 2>nul
findstr /I "healthy Up Running" "%~dp0tmp_status_%SERVICE%.txt" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
  call :log [OK] %SERVICE% is healthy
  del /q "%~dp0tmp_status_%SERVICE%.txt" >nul 2>&1
  endlocal
  goto :eof
)

REM Check timeout
if !ELAPSED! GEQ %TIMEOUT% (
  call :log [ERROR] Timeout waiting for %SERVICE%
  del /q "%~dp0tmp_status_%SERVICE%.txt" >nul 2>&1
  endlocal
  exit /b 1
)

REM Sleep and apply exponential backoff
timeout /t !DELAY! /nobreak >nul
set /a "ELAPSED=ELAPSED+DELAY"
if !DELAY! LSS %MAX_DELAY% (
  set /a "DELAY=DELAY*2"
  if !DELAY! GTR %MAX_DELAY% set "DELAY=%MAX_DELAY%"
)

goto :wait_loop

:run_migrations
call :log Running database migrations...
set "MIGRATION_CMD=alembic -c /app/alembic.ini upgrade heads"

REM Run migrations, capture output to log, then print to console
call :log Streaming migrations to %BACKEND_LOG% (output will be shown after completion)...
if defined RUN_ENV_ARGS (
  docker compose run --rm %RUN_ENV_ARGS% --entrypoint "" backend sh -c "%MIGRATION_CMD%" > "%BACKEND_LOG%" 2>&1
) else (
  docker compose run --rm --entrypoint "" backend sh -c "%MIGRATION_CMD%" > "%BACKEND_LOG%" 2>&1
)

set "MIG_EXIT=%ERRORLEVEL%"
type "%BACKEND_LOG%" || echo [WARN] Could not display %BACKEND_LOG%

if %MIG_EXIT% NEQ 0 (
  call :log [ERROR] Migrations failed - see %BACKEND_LOG%
  docker compose logs backend >> "%BACKEND_LOG%" 2>&1
  exit /b 1
)
call :log [OK] Migrations completed
goto :eof

:run_seeds
call :log Running seed scripts...
set "DEFAULT_SEED_TENANTS=00000000-0000-0000-0000-000000000001"
if defined SEED_TENANT_IDS (
  set "SEED_TENANTS=!SEED_TENANT_IDS!"
) else (
  set "SEED_TENANTS=%DEFAULT_SEED_TENANTS%"
)

REM Find seed runner script
set "SEED_RUNNER_PATH="
if exist "%~dp0scripts\run_seeds_fixed.py" (
  set "SEED_RUNNER_PATH=scripts/run_seeds_fixed.py"
) else if exist "%~dp0backend\scripts\run_seeds_fixed.py" (
  set "SEED_RUNNER_PATH=scripts/run_seeds_fixed.py"
)

if not "!SEED_RUNNER_PATH!"=="" (
  call :log Invoking seed runner ^(path: !SEED_RUNNER_PATH!^) with tenants: %SEED_TENANTS%
  if defined RUN_ENV_ARGS (
    docker compose run --rm %RUN_ENV_ARGS% --entrypoint "" backend python "!SEED_RUNNER_PATH!" --tenants "%SEED_TENANTS%" >> "%BACKEND_LOG%" 2>&1
  ) else (
    docker compose run --rm --entrypoint "" backend python "!SEED_RUNNER_PATH!" --tenants "%SEED_TENANTS%" >> "%BACKEND_LOG%" 2>&1
  )
  if !ERRORLEVEL! NEQ 0 (
    call :log [WARN] Seed runner returned error; continuing anyway
  ) else (
    call :log [OK] Seed runner completed
  )
) else (
  call :log [WARN] No seed runner found; skipping seeds
)
goto :eof

:cleanup
REM Clean up temporary files
del /q "%~dp0tmp_status_*.txt" >nul 2>&1
goto :eof

:log
set /a STEP+=1
set "TS=%DATE% %TIME%"
echo [%STEP%] %TS% - %*
echo [%STEP%] %TS% - %* >> "%LOG_FILE%"
goto :eof

:show_help
echo.
echo Usage: start-docker.bat [flags]
echo.
echo Flags:
echo   --restart         Stop and remove containers before starting (default)
echo   --fresh           Stop, remove volumes and rebuild from scratch
echo   --skip-ai         Skip loading AI models (dev-safe)
echo   --no-migrate      Skip running database migrations
echo   --show-migrations Stream migration output to console
echo   --help            Show this help message
echo.
echo Examples:
echo   start-docker.bat
echo   start-docker.bat --fresh --skip-ai
echo   start-docker.bat --no-migrate --show-migrations
echo.
exit /b 0

