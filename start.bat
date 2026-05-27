@echo off
SET PATH=%PATH%;C:\Users\Hakku\scoop\apps\nodejs\current;C:\Users\Hakku\scoop\apps\yt-dlp\current
title RuneBeats
color 0A

echo.
echo  ==========================================
echo    RuneBeats ^| Starting...
echo  ==========================================
echo.

if not exist ".env" (
    echo  [ERROR] .env not found. Run setup.bat first.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo  [ERROR] node_modules not found. Run setup.bat first.
    pause
    exit /b 1
)

echo  Bot is running. Press Ctrl+C to stop.
echo.
node src/index.js
pause
