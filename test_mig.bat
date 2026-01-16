@echo off
setlocal enabledelayedexpansion
echo [DEBUG] mig start
if not defined USE_ENTRYPOINT (
  echo [DEBUG] would run alembic
  echo fake command
  if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Alembic migrations failed
    exit /b 1
  )
) else (
  echo [DEBUG] use entrypoint set
)
echo [DEBUG] mig done
