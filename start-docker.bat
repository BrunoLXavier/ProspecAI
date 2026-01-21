@echo off
setlocal EnableDelayedExpansion
set "LOG_FILE=%~dp0start-docker.run.log"
if exist "%LOG_FILE%" del /q "%LOG_FILE%" >nul 2>&1
set /a STEP=0


rem Simple helper-based Docker Compose startup script for Windows
rem Usage: start-docker.bat [compose options]

rem If any arg is --help, show usage
for %%H in (%*) do (
  if "%%~H"=="--help" (
    echo Usage: start-docker.bat [docker-compose args]
    echo Example: start-docker.bat up -d
    echo
    echo Optional flags:
    echo   --restart    Stop and remove existing compose containers/networks before starting
    echo   --fresh      Stop and remove containers, volumes and local images before starting
    echo   --skip-ai    Do not load heavy AI models inside containers (dev-safe)
    echo   --no-migrate Skip running alembic migrations
    goto :eof
  )
)

rem Parse optional restart flags (also can be provided via RESTART_MODE env var)
if "%1"=="--restart" (
  set "RESTART_MODE=restart"
  shift
)
if "%1"=="--fresh" (
  set "RESTART_MODE=fresh"
  shift
)
if "%1"=="--skip-ai" (
  set "SKIP_AI=1"
  shift
)
if "%1"=="--no-migrate" (
  set "NO_MIGRATE=1"
  shift
)

goto :main

:main
rem If RESTART_MODE set to restart/fresh, bring the stack down first
if defined RESTART_MODE (
  echo RESTART_MODE=%RESTART_MODE% requested: stopping existing compose stack...
  if "%RESTART_MODE%"=="restart" (
    docker compose down --remove-orphans
  ) else (
    docker compose down --volumes --rmi local --remove-orphans
  )
  if errorlevel 1 (
    echo [WARN] `docker compose down` returned non-zero; continuing.
  )
  echo Short pause to allow docker to settle...
  timeout /t 2 >nul
)

rem Build ARGS by removing any internal flags so we don't forward them to docker compose
set "ARGS="
for %%A in (%*) do (
  if /I NOT "%%~A"=="--restart" if /I NOT "%%~A"=="--fresh" if /I NOT "%%~A"=="--skip-ai" if /I NOT "%%~A"=="--no-migrate" (
    if defined ARGS (
      set "ARGS=!ARGS! %%~A"
    ) else (
      set "ARGS=%%~A"
    )
  )
)

rem Create a temporary env file when requested so we don't rely on host env vars
set "TEMP_ENV=%~dp0\.env.start.tmp"
del /q "%TEMP_ENV%" >nul 2>&1
if defined SKIP_AI (
  echo SKIP_AI_MODELS=1>> "%TEMP_ENV%"
)
if defined NO_MIGRATE (
  echo RUN_MIGRATIONS=0>> "%TEMP_ENV%"
)

rem Build extra -e args for docker compose run invocations
set "RUN_ENV_ARGS="
if defined SKIP_AI set "RUN_ENV_ARGS=-e SKIP_AI_MODELS=1"
if defined NO_MIGRATE (
  if defined RUN_ENV_ARGS (
    set "RUN_ENV_ARGS=!RUN_ENV_ARGS! -e RUN_MIGRATIONS=0"
  ) else (
    set "RUN_ENV_ARGS=-e RUN_MIGRATIONS=0"
  )
)

call :log Bringing up compose services...
if exist "%TEMP_ENV%" (
  call :log Invoking: docker compose --env-file "%TEMP_ENV%" up -d !ARGS!
  docker compose --env-file "%TEMP_ENV%" up -d !ARGS!
) else (
  call :log Invoking: docker compose up -d !ARGS!
  docker compose up -d !ARGS!
)
if errorlevel 1 (
  echo docker compose up failed.
         if exist "%TEMP_ENV%" del /q "%TEMP_ENV%" >nul 2>&1
         exit /b 1
)

rem Short settle to allow compose to present statuses
call :log Waiting 5 seconds for services to settle...
timeout /t 5 >nul

rem Per-service polling (safe on Windows) with per-service custom timeout and exponential backoff
rem Format for WAIT_SERVICES entries: service[:timeout[:initDelay[:maxDelay]]]
rem Example: postgres:60:1:8 backend:120:2:16 neo4j frontend:30
set "WAIT_SERVICES=postgres:60:1:8 backend:120:1:8 neo4j:120:1:8 frontend:60:1:8"
for %%E in (%WAIT_SERVICES%) do call :wait_dispatch %%E

goto :after_waits

:wait_dispatch
rem Parse entry like service:timeout:initDelay:maxDelay
for /f "tokens=1-4 delims=:" %%a in ("%~1") do (
  set "SVC=%%a"
  set "SVC_TIMEOUT=%%b"
  set "SVC_INIT=%%c"
  set "SVC_MAX=%%d"
)
if "%SVC_TIMEOUT%"=="" set "SVC_TIMEOUT=60"
if "%SVC_INIT%"=="" set "SVC_INIT=1"
if "%SVC_MAX%"=="" set "SVC_MAX=8"
call :wait_for_service %SVC% %SVC_TIMEOUT% %SVC_INIT% %SVC_MAX%
if errorlevel 1 (
  echo [ERROR] Service %SVC% failed to reach healthy/Up state
  del /q "%~dp0\tmp_status_*.txt" >nul 2>&1
         if exist "%TEMP_ENV%" del /q "%TEMP_ENV%" >nul 2>&1
         exit /b 1
)
goto :eof

:after_waits

call :log finished waiting for services

rem Run Alembic migrations by default unless RUN_MIGRATIONS=0
if not defined RUN_MIGRATIONS set RUN_MIGRATIONS=1
if "%RUN_MIGRATIONS%"=="1" goto :do_migrate
goto :after_migrate

:do_migrate
call :log [*] RUN_MIGRATIONS=1; running database migrations (alembic upgrade heads)...
rem Use RUN_ENV_ARGS to inject requested env vars into the run invocation (if any)
if defined RUN_ENV_ARGS (
  docker compose run --rm %RUN_ENV_ARGS% --entrypoint "" backend alembic upgrade head
) else (
  rem no special envs to pass
  docker compose run --rm --entrypoint "" backend alembic upgrade head
)
if %ERRORLEVEL% NEQ 0 goto :migrate_failed
call :log [*] Migrations completed
goto :after_migrate

:migrate_failed
echo [ERROR] Alembic migrations failed
docker-compose logs backend
del /q "%~dp0\tmp_status_*.txt" >nul 2>&1
  if exist "%TEMP_ENV%" del /q "%TEMP_ENV%" >nul 2>&1
  exit /b 1

:after_migrate
call :log [*] Migrations step complete (skipped unless RUN_MIGRATIONS=1)

rem Ensure frontend is started (compose up -d might have already started it)
call :log [*] Ensuring Frontend is up...
docker compose up -d frontend >nul 2>&1

rem Run seed runner to ensure sample data is inserted (idempotent)
call :log [*] Running seed scripts (if available)...
set "DEFAULT_SEED_TENANTS=00000000-0000-0000-0000-000000000001"
if defined SEED_TENANT_IDS (
  set "SEED_TENANTS=%SEED_TENANT_IDS%"
) else (
  set "SEED_TENANTS=%DEFAULT_SEED_TENANTS%"
)
rem Prefer top-level scripts/run_seeds_fixed.py, but fall back to backend/scripts/run_seeds_fixed.py
set "SEED_RUNNER_PATH="
REM Prefer top-level scripts/run_seeds_fixed.py, but fall back to backend/scripts/run_seeds_fixed.py
REM Note: backend service mounts ./backend -> /app inside the container, so the
REM seed runner inside the container will always be reachable as /app/scripts/run_seeds_fixed.py
set "SEED_RUNNER_PATH="
if exist "%~dp0scripts\run_seeds_fixed.py" (
  set "SEED_RUNNER_PATH=scripts/run_seeds_fixed.py"
) else if exist "%~dp0backend\scripts\run_seeds_fixed.py" (
  rem Use the path that is valid inside the backend container (working dir /app)
  set "SEED_RUNNER_PATH=scripts/run_seeds_fixed.py"
)
if not "%SEED_RUNNER_PATH%"=="" (
  if defined RUN_ENV_ARGS (
    call :log Invoking seed runner with RUN_ENV_ARGS (path: %SEED_RUNNER_PATH%)
    docker compose run --rm %RUN_ENV_ARGS% --entrypoint "" backend python %SEED_RUNNER_PATH% --tenants "%SEED_TENANTS%"
  ) else (
    call :log Invoking seed runner (path: %SEED_RUNNER_PATH%)
    docker compose run --rm --entrypoint "" backend python %SEED_RUNNER_PATH% --tenants "%SEED_TENANTS%"
  )
  if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Seed runner returned non-zero; continuing.
  ) else (
    call :log Seed runner completed.
  )
) else (
  call :log No seed runner found; skipping seeds.
)

rem Clean up temporary status files
del /q "%~dp0\tmp_status_*.txt" >nul 2>&1
rem Clean up temporary env file if created
if exist "%TEMP_ENV%" del /q "%TEMP_ENV%" >nul 2>&1

call :log All requested services are up.
call :log To follow logs run: docker compose logs -f

endlocal
exit /b 0

rem --------------------------------------------------


:wait_for_service
set "SERVICE=%~1"
set "TIMEOUT=%~2"
set "INIT_DELAY=%~3"
set "MAX_DELAY=%~4"
if "%TIMEOUT%"=="" set TIMEOUT=60
if "%INIT_DELAY%"=="" set INIT_DELAY=1
if "%MAX_DELAY%"=="" set MAX_DELAY=8
set /a COUNT=0
set /a DELAY=INIT_DELAY
echo Waiting for %SERVICE% (timeout %TIMEOUT% seconds, init delay %INIT_DELAY%s, max delay %MAX_DELAY%s)...
:_wait_loop
del /q "%~dp0\tmp_status_%SERVICE%.txt" >nul 2>&1
docker compose ps %SERVICE% > "%~dp0\tmp_status_%SERVICE%.txt" 2>nul
findstr /i "healthy" "%~dp0\tmp_status_%SERVICE%.txt" >nul 2>&1
if not errorlevel 1 (
  set "WAIT_STATUS=0"
  echo %SERVICE% is healthy via docker compose ps
  goto :_wait_done
)
findstr /i "Up" "%~dp0\tmp_status_%SERVICE%.txt" >nul 2>&1
if not errorlevel 1 (
  set "WAIT_STATUS=0"
  echo %SERVICE% is Up via docker compose ps
  goto :_wait_done
)
    findstr /i "Running" "%~dp0\tmp_status_%SERVICE%.txt" >nul 2>&1
    if not errorlevel 1 (
      set "WAIT_STATUS=0"
      echo %SERVICE% is Running via docker compose ps
      goto :_wait_done
    )
rem Sleep for DELAY seconds (backoff)
timeout /t %DELAY% >nul
set /a COUNT+=DELAY
rem Exponential backoff: double DELAY up to MAX_DELAY
if %DELAY% LSS %MAX_DELAY% (
  set /a DELAY=DELAY*2
  if %DELAY% GTR %MAX_DELAY% set /a DELAY=%MAX_DELAY%
)
if %COUNT% GEQ %TIMEOUT% (
  echo Timeout waiting for %SERVICE% to be healthy.
  set "WAIT_STATUS=1"
  goto :_wait_done
)
goto :_wait_loop

:_wait_done
rem return to caller; WAIT_STATUS set to 0 (ok) or 1 (timeout)
goto :eof

:log
set /a STEP+=1
set "TS=%DATE% %TIME%"
echo [%STEP%] %TS% - %* 
echo [%STEP%] %TS% - %* >> "%LOG_FILE%"
goto :eof

