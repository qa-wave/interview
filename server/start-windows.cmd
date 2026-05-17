@echo off
setlocal
set DIR=%~dp0
if "%PORT%"=="" set PORT=4010
if "%MOCK_DATA_PATH%"=="" set MOCK_DATA_PATH=%DIR%mocks\books.mock.json
start "" "http://localhost:4010/services"
if exist "%DIR%books-mock.exe" (
  "%DIR%books-mock.exe" %*
) else (
  echo Chybi books-mock.exe. Ze zdrojoveho projektu spust npm start.
  pause
)
