@echo off
setlocal

echo ============================================
echo  Books Mock - Windows VM Setup
echo ============================================
echo.

set "SCRIPT_DIR=%~dp0"
set "APP_DIR=%SCRIPT_DIR%"
set "DESKTOP=%USERPROFILE%\Desktop"

echo App directory: %APP_DIR%
echo.

if exist "%APP_DIR%start-windows.cmd" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('%DESKTOP%\Books Mock Server.lnk'); $sc.TargetPath = '%APP_DIR%start-windows.cmd'; $sc.WorkingDirectory = '%APP_DIR%'; if (Test-Path '%APP_DIR%books-mock.exe') { $sc.IconLocation = '%APP_DIR%books-mock.exe,0' }; $sc.Save()"
  echo Server shortcut created.
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('%DESKTOP%\Books Mock Services.lnk'); $sc.TargetPath = 'cmd.exe'; $sc.Arguments = '/c start http://localhost:4010/services'; $sc.WorkingDirectory = '%APP_DIR%'; $sc.Save()"
echo Services shortcut created.

if exist "%APP_DIR%client\sluzby.html" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('%DESKTOP%\Books Mock Client.lnk'); $sc.TargetPath = '%APP_DIR%client\sluzby.html'; $sc.WorkingDirectory = '%APP_DIR%client'; $sc.Save()"
  echo Client shortcut created.
)

if exist "%APP_DIR%sql\books.db" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('%DESKTOP%\Books SQL Folder.lnk'); $sc.TargetPath = '%APP_DIR%sql'; $sc.WorkingDirectory = '%APP_DIR%sql'; $sc.Save()"
  echo SQL shortcut created.
)

echo.
echo Setup complete.
pause
