@echo off
setlocal
cd /d "%~dp0"
docker info >nul 2>&1
if errorlevel 1 (
    echo Please start Docker Desktop with Linux containers, then try again.
    pause
    exit /b 1
)
if not exist "backend\.env" (
    echo Missing backend\.env. Copy backend\.env.example and configure it first.
    pause
    exit /b 1
)
docker compose up -d --build --wait --wait-timeout 180
if errorlevel 1 (
    echo Startup failed. Check Docker Desktop logs and ports 3000 / 5173.
    pause
    exit /b 1
)
echo AptiMate is ready at http://localhost:5173
start "" "http://localhost:5173"
