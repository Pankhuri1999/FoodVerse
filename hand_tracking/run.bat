@echo off
REM FOODIVERSE Phase 1 — double-click this file to start the hand tracker.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
if errorlevel 1 pause
