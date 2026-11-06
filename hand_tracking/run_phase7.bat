@echo off
echo FOODIVERSE Phase 7 - Save the Cookie Kingdom
cd /d "%~dp0"
set "PY=%LOCALAPPDATA%\FoodiverseCosmicKitchen\venv\Scripts\python.exe"
if not exist "%PY%" (
  echo Virtual environment not found. Run setup.ps1 first.
  pause
  exit /b 1
)
"%PY%" -u phase7_mission.py %*
set ERR=%ERRORLEVEL%
if not "%ERR%"=="0" (
  echo.
  echo Phase 7 exited with error code %ERR%
  pause
)
