@echo off
REM BM CRM Server - Windows Startup Script
REM Bu fayl Windows startup'da avtomatik ishga tushadi

echo Starting BM CRM Server...

REM PowerShell scriptni ishga tushirish
PowerShell -NoProfile -ExecutionPolicy Bypass -File "C:\bm-crm-server\start-server.ps1"

pause
