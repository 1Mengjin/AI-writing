@echo off
cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

echo Starting Gongsheng dev server...
call npm run dev

pause
