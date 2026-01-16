@echo off
setlocal EnableDelayedExpansion

rem Simple helper-based Docker Compose startup script for Windows
rem Usage: start-docker.bat [compose options]

if "%1"=="--help" (
  echo Usage: start-docker.bat [docker-compose args]
  echo Example: start-docker.bat up -d
  echo
  echo Optional flags:
  echo   --restart    Stop and remove existing compose containers/networks before starting
  echo   --fresh      Stop and remove containers, volumes and local images before starting
  goto :eof
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
rem Build ARGS by iterating over parameters and skipping internal flags
set "ARGS="
for %%A in (%*) do (
  if NOT "%%~A"=="--restart" if NOT "%%~A"=="--fresh" (
    if defined ARGS (
      set "ARGS=!ARGS! %%~A"
    ) else (
      set "ARGS=%%~A"
    )
  )
)
echo Bringing up compose services...
echo Invoking: docker compose up -d !ARGS!
docker compose up -d !ARGS!
if errorlevel 1 (
  echo docker compose up failed.
  exit /b 1
)

rem Short settle to allow compose to present statuses
echo Waiting 5 seconds for services to settle...
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
  exit /b 1
)
goto :eof

:after_waits

echo finished waiting for services

rem Run Alembic migrations by default unless RUN_MIGRATIONS=0
if not defined RUN_MIGRATIONS set RUN_MIGRATIONS=1
if "%RUN_MIGRATIONS%"=="1" goto :do_migrate
goto :after_migrate

:do_migrate
echo [*] RUN_MIGRATIONS=1; running database migrations (alembic upgrade head)...
rem Override the container entrypoint so migrations run and the container exits
rem This avoids the entrypoint starting the app and blocking the script.
docker compose run --rm --entrypoint "" backend alembic upgrade head
if %ERRORLEVEL% NEQ 0 goto :migrate_failed
echo [*] Migrations completed
goto :after_migrate

:migrate_failed
echo [ERROR] Alembic migrations failed
docker-compose logs backend
del /q "%~dp0\tmp_status_*.txt" >nul 2>&1
exit /b 1

:after_migrate
echo [*] Migrations step complete (skipped unless RUN_MIGRATIONS=1)

rem Ensure frontend is started (compose up -d might have already started it)
echo [*] Ensuring Frontend is up...
docker compose up -d frontend >nul 2>&1


rem Clean up temporary status files
del /q "%~dp0\tmp_status_*.txt" >nul 2>&1

echo All requested services are up.
echo To follow logs run: docker compose logs -f

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

