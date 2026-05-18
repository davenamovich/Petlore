@echo off
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" ".\node_modules\next\dist\bin\next" dev -p 3027
echo.
echo Petlore dev server stopped with exit code %ERRORLEVEL%.
pause
