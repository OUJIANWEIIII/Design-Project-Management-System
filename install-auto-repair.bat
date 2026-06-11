@echo off
setlocal
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0scripts\install-auto-repair-task.ps1"
pause
