@echo off
cd /d "%~dp0"
set NODE_ENV=production
set HOSTNAME=0.0.0.0
set PORT=3027
"C:\Program Files\nodejs\node.exe" ".next\standalone\server.js"
echo.
echo Petlore server stopped with exit code %ERRORLEVEL%.
pause
