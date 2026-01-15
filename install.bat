@echo off
echo ========================================
echo   BM CRM SERVER - INSTALL
echo ========================================
echo.

REM Node.js tekshirish
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js topilmadi!
    echo Node.js ni https://nodejs.org dan yuklab o'rnating
    pause
    exit /b 1
)

echo [1/3] Node.js topildi
echo [2/3] Paketlarni o'rnatish...
call npm install

echo [3/3] Firewall qoidasi qo'shish...
netsh advfirewall firewall add rule name="BM CRM Server" dir=in action=allow protocol=tcp localport=5000 >nul 2>&1
netsh advfirewall firewall add rule name="BM CRM ISUP" dir=in action=allow protocol=tcp localport=5200 >nul 2>&1

echo.
echo ========================================
echo   O'RNATISH TUGADI!
echo ========================================
echo.
echo Serverni ishga tushirish uchun:
echo   start-server.bat
echo.
pause
