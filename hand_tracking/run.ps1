# Launch the Phase 1 webcam hand tracker using the local AppData venv.

$ErrorActionPreference = "Stop"

$VenvPython = Join-Path $env:LOCALAPPDATA "FoodiverseCosmicKitchen\venv\Scripts\python.exe"
$Tracker = Join-Path $PSScriptRoot "hand_tracker.py"

if (-not (Test-Path $VenvPython)) {
    Write-Host "Virtual environment not found. Run setup first:"
    Write-Host "  .\setup.ps1"
    exit 1
}

& $VenvPython $Tracker @args
