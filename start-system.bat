@echo off
setlocal
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0scripts\start-system.ps1"
pause
