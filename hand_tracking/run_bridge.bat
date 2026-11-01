@echo off
REM FOODIVERSE Phase 2 — stream hand tracking to Unity (UDP 5005)
cd /d "%~dp0"
set "PY=%LOCALAPPDATA%\FoodiverseCosmicKitchen\venv\Scripts\python.exe"
if not exist "%PY%" (
  echo Virtual environment not found. Run setup.ps1 first.
  pause
  exit /b 1
)
"%PY%" unity_bridge.py %*
if errorlevel 1 pause
