@echo off
title FitLog Launcher
cls
echo.
echo  [FitLog] Stopping old dev server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 "') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo  [FitLog] Starting npm run dev...
cd /d "%~dp0"
start "FitLog Dev" cmd /k "npm run dev"

echo  [FitLog] Waiting for server to start...
timeout /t 5 /nobreak >nul

echo  [FitLog] Opening http://localhost:3000
start http://localhost:3000
exit
