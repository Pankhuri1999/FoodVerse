@echo off
set PATH=C:\Program Files\nodejs;%PATH%
set npm_config_devdir=
set SRC=%~dp0
set DEST=%LOCALAPPDATA%\FoodiverseCosmicKitchen\webxr
if not exist "%DEST%" mkdir "%DEST%"
robocopy "%SRC%." "%DEST%" /E /XD node_modules dist .iwsdk .git /NFL /NDL /NJH /NJS /XO
cd /d "%DEST%"
call npx --no-install iwsdk dev down
npm run dev
