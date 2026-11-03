@echo off
echo FOODIVERSE Phase 2 preview — single Cosmic Fruit only.
echo For all 6 ingredients + bowl, run run_phase3.bat instead.
cd /d "%~dp0"
set "PY=%LOCALAPPDATA%\FoodiverseCosmicKitchen\venv\Scripts\python.exe"
if not exist "%PY%" (
  echo Virtual environment not found. Run setup.ps1 first.
  pause
  exit /b 1
)
"%PY%" phase2_preview.py %*
if errorlevel 1 pause
