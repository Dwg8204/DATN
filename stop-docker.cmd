@echo off
setlocal
cd /d "%~dp0"
docker compose stop
if errorlevel 1 (
    echo Could not stop AptiMate. Check Docker Desktop.
    pause
    exit /b 1
)
echo AptiMate stopped. Database and uploaded files are preserved.
pause
