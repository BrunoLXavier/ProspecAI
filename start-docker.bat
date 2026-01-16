@echo off
setlocal EnableDelayedExpansion

rem Simple helper-based Docker Compose startup script for Windows
rem Usage: start-docker.bat [compose options]

if "%1"=="--help" (
  echo Usage: start-docker.bat [docker-compose args]
  echo Example: start-docker.bat up -d
  goto :eof
)

goto :main

:main
echo Bringing up compose services...
docker compose up -d %*
if errorlevel 1 (
  echo docker compose up failed.
  exit /b 1
)

rem Short settle to allow compose to present statuses
echo Waiting 5 seconds for services to settle...
timeout /t 5 >nul

rem Per-service polling (safe on Windows): call internal helper
call :wait_for_service postgres 60
if %ERRORLEVEL% NEQ 0 exit /b 1
call :wait_for_service backend 120
if %ERRORLEVEL% NEQ 0 exit /b 1
call :wait_for_service frontend 60
if %ERRORLEVEL% NEQ 0 echo frontend wait skipped

rem Run Alembic migrations only when explicitly requested to avoid heavy imports
if not defined RUN_MIGRATIONS goto :skip_migrate
echo [*] RUN_MIGRATIONS=1 detected; running database migrations (alembic upgrade head)...
docker-compose run --rm backend alembic upgrade head
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Alembic migrations failed
  docker-compose logs backend
  exit /b 1
)
:skip_migrate
echo [*] Migrations step complete (skipped unless RUN_MIGRATIONS=1)

rem Ensure frontend is started (compose up -d might have already started it)
echo [*] Ensuring Frontend is up...
docker compose up -d frontend >nul 2>&1

echo All requested services are up.
echo To follow logs run: docker compose logs -f

endlocal
exit /b 0

rem --------------------------------------------------
rem Internal helper: wait_for_service SERVICE TIMEOUT
rem Writes a temporary status file and checks for "healthy" or "Up"
:wait_for_service
set "SERVICE=%~1"
set "TIMEOUT=%~2"
if "%TIMEOUT%"=="" set TIMEOUT=60
set /a COUNT=0
echo Waiting for %SERVICE% (timeout %TIMEOUT% seconds)...
:_wait_loop
del /q "%~dp0\tmp_status_%SERVICE%.txt" >nul 2>&1
    docker compose ps %SERVICE% > "%~dp0\tmp_status_%SERVICE%.txt" 2>nul
    findstr /i "healthy" "%~dp0\tmp_status_%SERVICE%.txt" >nul 2>&1
    if not errorlevel 1 echo %SERVICE% is healthy via docker compose ps & exit /b 0
    findstr /i "Up" "%~dp0\tmp_status_%SERVICE%.txt" >nul 2>&1
    if not errorlevel 1 echo %SERVICE% is Up via docker compose ps & exit /b 0
timeout /t 1 >nul
set /a COUNT+=1
if %COUNT% GEQ %TIMEOUT% (
  echo Timeout waiting for %SERVICE% to be healthy.
  exit /b 1
)
goto :_wait_loop
