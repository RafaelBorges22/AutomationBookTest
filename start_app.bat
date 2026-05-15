@echo off
setlocal

set "PROJECT_DIR=%~dp0"

start "AutomationBookTest Backend Parser" cmd /k "cd /d ""%PROJECT_DIR%"" && npm run dev"
timeout /t 2 /nobreak >nul

start "AutomationBookTest Frontend" cmd /k "cd /d ""%PROJECT_DIR%"" && node frontend-server.mjs"
timeout /t 3 /nobreak >nul

start "" "http://localhost:3001"

endlocal
