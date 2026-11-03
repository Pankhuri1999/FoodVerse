@echo off
echo FOODIVERSE Phase 4 - Cooking and recipe discovery
cd /d "%~dp0"
set "PY=%LOCALAPPDATA%\FoodiverseCosmicKitchen\venv\Scripts\python.exe"
if not exist "%PY%" (
  echo Virtual environment not found. Run setup.ps1 first.
  pause
  exit /b 1
)
if not exist "%~dp0recipes.py" (
  echo Missing recipes.py in hand_tracking folder.
  pause
  exit /b 1
)
"%PY%" -u phase4_cooking.py %*
set ERR=%ERRORLEVEL%
if not "%ERR%"=="0" (
  echo.
  echo Phase 4 exited with error code %ERR%
  pause
)
