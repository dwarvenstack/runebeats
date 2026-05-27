@echo off
title RuneBeats Setup
color 0A

echo.
echo  ==========================================
echo    RuneBeats ^| Windows Setup
echo  ==========================================
echo.

:: Check if running as Administrator — Scoop MUST NOT run as admin
net session >nul 2>&1
if %errorlevel% equ 0 (
    echo  [ERROR] Do NOT run this as Administrator.
    echo.
    echo  Close this and double-click setup.bat normally.
    echo.
    pause
    exit /b 1
)

echo  Launching setup...
echo.

:: Unblock the ps1 file first, then run it
powershell.exe -NoProfile -Command "Unblock-File -Path '%~dp0setup.ps1'" >nul 2>&1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

echo.
pause