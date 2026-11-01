# FOODIVERSE Phase 1 setup
# Creates the virtualenv outside OneDrive to avoid sync file locks,
# then installs MediaPipe + OpenCV.

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$VenvRoot = Join-Path $env:LOCALAPPDATA "FoodiverseCosmicKitchen\venv"
$Python = "python"

Write-Host "FOODIVERSE setup"
Write-Host "  project: $ProjectRoot"
Write-Host "  venv:    $VenvRoot"

if (-not (Test-Path $VenvRoot)) {
    Write-Host "Creating virtual environment..."
    & $Python -m venv $VenvRoot
}

$Pip = Join-Path $VenvRoot "Scripts\pip.exe"
$PythonExe = Join-Path $VenvRoot "Scripts\python.exe"

Write-Host "Installing dependencies..."
# Skip `pip install --upgrade pip` on Windows — self-replace often hits WinError 5.
& $Pip install -r (Join-Path $PSScriptRoot "requirements.txt")

Write-Host ""
Write-Host "Done. Run the tracker with:"
Write-Host "  .\run.ps1"
Write-Host "or:"
Write-Host "  & `"$PythonExe`" `"$PSScriptRoot\hand_tracker.py`""
