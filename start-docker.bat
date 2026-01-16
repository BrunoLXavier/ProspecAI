@echo off
REM ProspecAI Docker Startup Script
REM Handles proper initialization with dependency management and health checks

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ================================================================
echo       ProspecAI Docker Initialization Script
echo ================================================================
echo.

REM Check if docker is available
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed or not in PATH
    exit /b 1
)
echo [OK] Docker is available

REM Stop existing containers
echo [*] Stopping any existing containers...
docker-compose down --remove-orphans >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start infrastructure services
echo [*] Starting infrastructure services...
docker-compose up -d zookeeper redis postgres minio mlflow grafana
timeout /t 2 /nobreak >nul

REM Wait for Postgres
echo [*] Waiting for Postgres to be healthy...
setlocal enabledelayedexpansion
for /L %%i in (1,1,30) do (
    for /f %%j in ('docker inspect prospecai-postgres --format="{{.State.Health.Status}}" 2^>nul') do set STATUS=%%j
    if "!STATUS!"=="healthy" (
        echo [OK] Postgres is ready
        goto postgres_ready
    )
    timeout /t 2 /nobreak >nul
)
echo [ERROR] Postgres failed to start
docker-compose logs postgres
exit /b 1

:postgres_ready

REM Wait for Redis
echo [*] Waiting for Redis to start...
for /L %%i in (1,1,15) do (
    for /f %%j in ('docker inspect prospecai-redis --format="{{.State.Running}}" 2^>nul') do set RUNNING=%%j
    if "!RUNNING!"=="true" (
        echo [OK] Redis is running
        goto redis_ready
    )
    timeout /t 1 /nobreak >nul
)
echo [ERROR] Redis failed to start
exit /b 1

:redis_ready

REM Start Kafka
echo [*] Starting Kafka...
docker-compose up -d kafka
timeout /t 3 /nobreak >nul

REM Wait for Kafka
echo [*] Waiting for Kafka to be running...
for /L %%i in (1,1,15) do (
    for /f %%j in ('docker inspect prospecai-kafka --format="{{.State.Running}}" 2^>nul') do set RUNNING=%%j
    if "!RUNNING!"=="true" (
        echo [OK] Kafka is running
        goto kafka_ready
    )
    timeout /t 1 /nobreak >nul
)
echo [WARN] Kafka failed to start, continuing anyway...

:kafka_ready
REM Start Neo4j
echo [*] Starting Neo4j...
docker-compose up -d neo4j
timeout /t 3 /nobreak >nul

REM Wait for Neo4j
echo [*] Waiting for Neo4j to be healthy...
for /L %%i in (1,1,40) do (
    for /f %%j in ('docker inspect prospecai-neo4j --format="{{.State.Health.Status}}" 2^>nul') do set STATUS=%%j
    if "!STATUS!"=="healthy" (
        echo [OK] Neo4j is ready
        goto neo4j_ready
    )
    timeout /t 2 /nobreak >nul
)
echo [ERROR] Neo4j failed to start
docker-compose logs neo4j | findstr /r "."
exit /b 1

:neo4j_ready

REM Start Backend
echo [*] Starting Backend...
docker-compose up -d backend
timeout /t 3 /nobreak >nul

REM Wait for Backend
echo [*] Waiting for Backend to be running...
for /L %%i in (1,1,20) do (
    for /f %%j in ('docker inspect prospecai-backend --format="{{.State.Running}}" 2^>nul') do set RUNNING=%%j
    if "!RUNNING!"=="true" (
        echo [OK] Backend is running
        goto backend_ready
    )
    timeout /t 1 /nobreak >nul
)
echo [ERROR] Backend failed to start
exit /b 1

:backend_ready

REM Run Alembic migrations using the backend image (no separate migrate container)
if not defined USE_ENTRYPOINT (
    echo [*] Running database migrations (alembic upgrade head)...
    docker-compose run --rm backend alembic upgrade head
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Alembic migrations failed
        docker-compose logs backend
        exit /b 1
    )
) else (
    echo [*] USE_ENTRYPOINT is set; skipping explicit alembic run (image entrypoint will handle migrations)
)


REM Give backend time to fully initialize
echo [*] Giving backend time to fully initialize...
timeout /t 5 /nobreak >nul

REM Run DB seeds if requested via env vars (skip if USE_ENTRYPOINT is set)
if not defined USE_ENTRYPOINT (
    if defined SEED_TENANT_IDS (
    echo [*] SEED_TENANT_IDS detected: running DB seeds for %SEED_TENANT_IDS%...
    docker-compose run --rm backend python /app/scripts/run_seeds_fixed.py --tenants %SEED_TENANT_IDS%
    if %ERRORLEVEL% NEQ 0 (
        echo [WARN] Seed runner returned non-zero exit code
    ) else (
        echo [OK] Seeds executed
    )
) else (
    if defined RUN_SEEDS_ON_START (
        echo [*] RUN_SEEDS_ON_START set: running DB seeds (reads SEED_TENANT_IDS from container env if present)...
        docker-compose run --rm backend python /app/scripts/run_seeds_fixed.py
        if %ERRORLEVEL% NEQ 0 (
            echo [WARN] Seed runner returned non-zero exit code
        ) else (
            echo [OK] Seeds executed
        )
    ) else (
        echo [*] SEED_TENANT_IDS not set and RUN_SEEDS_ON_START not set; skipping DB seeds
    )
)
) else (
    echo [*] USE_ENTRYPOINT is set; skipping explicit DB seed runner (entrypoint handles seeds)
)

REM Start Frontend
echo [*] Starting Frontend...
docker-compose up -d frontend
timeout /t 2 /nobreak >nul

REM Wait for Frontend
echo [*] Waiting for Frontend to be running...
for /L %%i in (1,1,15) do (
    for /f %%j in ('docker inspect prospecai-frontend --format="{{.State.Running}}" 2^>nul') do set RUNNING=%%j
    if "!RUNNING!"=="true" (
        echo [OK] Frontend is running
        goto frontend_ready
    )
    timeout /t 1 /nobreak >nul
)
echo [ERROR] Frontend failed to start
exit /b 1

:frontend_ready

echo.
echo ================================================================
echo                  Final Health Check
echo ================================================================
echo.

docker-compose ps

echo.
echo ================================================================
echo                  Service Endpoints
echo ================================================================
echo.
echo Frontend:              http://localhost:3000
echo Backend API:           http://localhost:8000
echo Backend Docs:          http://localhost:8000/docs
echo Neo4j Browser:         http://localhost:7474
echo Grafana:               http://localhost:3001
echo Minio Console:         http://localhost:9001
echo MLflow:                http://localhost:5000
echo.
echo All services initialized successfully!
echo.

exit /b 0

endlocal
