; Books Mock - Windows Installer
!include "MUI2.nsh"

!define PRODUCT_NAME "Books Mock"
!define PRODUCT_EXE "books-mock.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "${OUT_FILE}"
InstallDir "$PROGRAMFILES\BooksMock"
ShowInstDetails show
RequestExecutionLevel admin

!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Books Mock"
!define MUI_WELCOMEPAGE_TEXT "Instalace mock sluzeb pro prakticky test integracniho testera.$\r$\n$\r$\nPo instalaci najdete na plose odkazy na server, sluzby, klientskou cast a SQL."

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetOutPath "$INSTDIR"
  File "${SOURCE_DIR}\books-mock.exe"
  File "${SOURCE_DIR}\start-windows.cmd"
  File "${SOURCE_DIR}\README.md"
  File "${SOURCE_DIR}\openapi.yaml"

  SetOutPath "$INSTDIR\mocks"
  File "${SOURCE_DIR}\mocks\books.mock.json"

  SetOutPath "$INSTDIR\docs"
  File "${SOURCE_DIR}\docs\openapi-books.yaml"
  File "${SOURCE_DIR}\docs\openapi-loans.yaml"

  SetOutPath "$INSTDIR\client"
  File /nonfatal "${CLIENT_DIR}\sluzby.html"
  File /nonfatal "${CLIENT_DIR}\zadani.html"
  File /nonfatal "${CLIENT_DIR}\zadani.md"

  SetOutPath "$INSTDIR\sql"
  File /nonfatal "${SQL_DIR}\schema.sql"
  File /nonfatal "${SQL_DIR}\seed.sql"
  File /nonfatal "${SQL_DIR}\examples.sql"
  File /nonfatal "${SQL_DIR}\books.db"
  File /nonfatal "${SQL_DIR}\README.md"

  SetOutPath "$INSTDIR"
  File /nonfatal "${SETUP_SCRIPT}"

  CreateShortcut "$DESKTOP\Books Mock Server.lnk" "$INSTDIR\start-windows.cmd" "" "$INSTDIR\${PRODUCT_EXE}" 0
  CreateShortcut "$DESKTOP\Books Mock Services.lnk" "cmd.exe" '/c start http://localhost:4010/services' "$INSTDIR\${PRODUCT_EXE}" 0
  CreateShortcut "$DESKTOP\Books Mock Client.lnk" "$INSTDIR\client\sluzby.html"
  CreateShortcut "$DESKTOP\Books SQL Folder.lnk" "$INSTDIR\sql"

  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Books Mock Server.lnk" "$INSTDIR\start-windows.cmd" "" "$INSTDIR\${PRODUCT_EXE}" 0
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Books Mock Services.lnk" "cmd.exe" '/c start http://localhost:4010/services'
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Books Mock Client.lnk" "$INSTDIR\client\sluzby.html"
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"

  WriteUninstaller "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegDWORD HKLM "${PRODUCT_UNINST_KEY}" "NoModify" 1

  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Books Mock" dir=in action=allow program="$INSTDIR\${PRODUCT_EXE}" enable=yes profile=private'
SectionEnd

Section "Uninstall"
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Books Mock"'
  Delete "$DESKTOP\Books Mock Server.lnk"
  Delete "$DESKTOP\Books Mock Services.lnk"
  Delete "$DESKTOP\Books Mock Client.lnk"
  Delete "$DESKTOP\Books SQL Folder.lnk"
  RMDir /r "$SMPROGRAMS\${PRODUCT_NAME}"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
SectionEnd
