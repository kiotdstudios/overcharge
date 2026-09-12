@echo off
REM PUBLISH_LEVELS.bat - push the levels you saved from the editor to the live game.
REM
REM ORDER 005: Git JSON is the ONLY authored level source. Point the editor's
REM FOLDER button at your clone's levels folder:
REM     %USERPROFILE%\Documents\GitHub\overcharge\src_scroll\levels
REM SAVE writes + verifies the canonical level<N>.json (and keeps levels.json,
REM the Git-tracked level ORDER manifest, in sync). Run this afterwards and the
REM live GitHub Pages game plays it. Until you run this, the level exists only
REM in your working tree - there is NO browser-storage copy anymore.

setlocal
set GIT="%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
set REPO=%~dp0
cd /d "%REPO%"

if not exist %GIT% (
  echo ERROR: git not found at %GIT%
  pause
  exit /b 1
)

echo == Levels changed since the last publish ==
%GIT% status --short -- src_scroll/levels
echo.

%GIT% diff --quiet -- src_scroll/levels
if %ERRORLEVEL%==0 (
  %GIT% ls-files --others --exclude-standard -- src_scroll/levels | findstr /r "." >nul
  if errorlevel 1 (
    echo Nothing new to publish. Did you SAVE with the folder set to src_scroll\levels ?
    pause
    exit /b 0
  )
)

%GIT% add -- src_scroll/levels
%GIT% commit -m "level: publish editor save %DATE% %TIME%"
if errorlevel 1 (
  echo Commit failed - nothing staged, or git refused.
  pause
  exit /b 1
)

%GIT% push origin HEAD
if errorlevel 1 (
  echo PUSH FAILED. You are still committed locally; fix the remote and re-run.
  pause
  exit /b 1
)

echo.
echo PUBLISHED. GitHub Pages takes about a minute to redeploy, then:
echo   https://kiotdstudios.github.io/overcharge/index.html?committed=1
echo.
pause
