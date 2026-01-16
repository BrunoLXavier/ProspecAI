@echo off
setlocal EnableDelayedExpansion
set SERVICE=postgres
echo START TEST
set "CID="
for /f "usebackq delims=" %%i in (`docker compose ps -q !SERVICE! 2^>nul`) do (
  if "!CID!"=="" set "CID=%%i"
)







exit /b 0endlocalecho FINDSTR-ERR=%ERRORLEVEL%docker compose ps !SERVICE! 2>nul | findstr /i "healthy" >nul 2>&1echo CID-after-trunc=!CID!set "CID=!CID:~0,64!"necho CID-before-trunc=!CID!