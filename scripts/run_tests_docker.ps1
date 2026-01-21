# Run backend tests inside docker-compose
# Usage: .\scripts\run_tests_docker.ps1

Write-Host "Starting docker-compose services (detached)..."

if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    docker-compose up -d
} else {
    docker compose up -d
}

Write-Host "Running backend tests inside 'backend' service..."

if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    docker-compose run --rm backend pytest -q backend/tests
    exit $LASTEXITCODE
} else {
    docker compose run --rm backend pytest -q backend/tests
    exit $LASTEXITCODE
}
