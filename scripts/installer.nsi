; Interview Mock - Windows Installer
; Built with NSIS (Nullsoft Scriptable Install System)

!include "MUI2.nsh"
!include "FileFunc.nsh"

; ---------------------------------------------------------------------------
; Configuration
; ---------------------------------------------------------------------------

!define PRODUCT_NAME "Interview Mock"
!define PRODUCT_PUBLISHER "Interview Mock"
!define PRODUCT_EXE "interview-mock.exe"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_EXE}"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define DEFAULT_PORT "4010"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "${OUT_FILE}"
InstallDir "$PROGRAMFILES\InterviewMock"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show
RequestExecutionLevel admin

; ---------------------------------------------------------------------------
; Modern UI Settings
; ---------------------------------------------------------------------------

!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Welcome page
!define MUI_WELCOMEPAGE_TITLE "Interview Mock Service"
!define MUI_WELCOMEPAGE_TEXT "This wizard will install the Interview Mock service on your computer.$\r$\n$\r$\nThe service provides REST and SOAP APIs for integration tester interviews.$\r$\n$\r$\nDefault port: ${DEFAULT_PORT}"

; ---------------------------------------------------------------------------
; Pages
; ---------------------------------------------------------------------------

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ---------------------------------------------------------------------------
; Install Section
; ---------------------------------------------------------------------------

Section "Install" SecInstall
  SetOutPath "$INSTDIR"

  ; Main executable
  File "${SOURCE_DIR}\interview-mock.exe"
  File "${SOURCE_DIR}\start-windows.cmd"
  File "${SOURCE_DIR}\openapi.yaml"
  File "${SOURCE_DIR}\README.md"

  ; Mock data
  SetOutPath "$INSTDIR\mocks"
  File "${SOURCE_DIR}\mocks\interview.mock.json"

  ; Docs
  SetOutPath "$INSTDIR\docs"
  File "${SOURCE_DIR}\docs\test-requests.http"
  File "${SOURCE_DIR}\docs\soap-create-interview.xml"
  File "${SOURCE_DIR}\docs\soap-update-status.xml"

  ; Interview materials (PDF)
  File /nonfatal "${DOCS_DIR}\interview-zadani.pdf"
  File /nonfatal "${DOCS_DIR}\interview-hodnoceni.pdf"

  ; Postman collection
  SetOutPath "$INSTDIR\postman"
  File "${SOURCE_DIR}\postman\interview-mock.postman_collection.json"

  ; SoapUI project
  SetOutPath "$INSTDIR\soapui"
  File /nonfatal "${SOAPUI_DIR}\InterviewMock-soapui-project.xml"
  File /nonfatal "${SOAPUI_DIR}\README.md"

  ; SQL files
  SetOutPath "$INSTDIR\sql"
  File /nonfatal "${SQL_DIR}\schema.sql"
  File /nonfatal "${SQL_DIR}\seed.sql"
  File /nonfatal "${SQL_DIR}\examples.sql"
  File /nonfatal "${SQL_DIR}\README.md"
  File /nonfatal "${SQL_DIR}\build.sh"

  ; Back to install dir
  SetOutPath "$INSTDIR"

  ; Create start menu shortcuts
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Interview Mock.lnk" "$INSTDIR\start-windows.cmd" "" "$INSTDIR\${PRODUCT_EXE}" 0
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Open Install Folder.lnk" "$INSTDIR"
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"

  ; Desktop shortcut
  CreateShortcut "$DESKTOP\Interview Mock.lnk" "$INSTDIR\start-windows.cmd" "" "$INSTDIR\${PRODUCT_EXE}" 0

  ; Write uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; Registry - App Paths
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\${PRODUCT_EXE}"

  ; Registry - Add/Remove Programs
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegDWORD HKLM "${PRODUCT_UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${PRODUCT_UNINST_KEY}" "NoRepair" 1

  ; Calculate installed size
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "${PRODUCT_UNINST_KEY}" "EstimatedSize" "$0"

  ; Add firewall rule for the service
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Interview Mock Service" dir=in action=allow program="$INSTDIR\${PRODUCT_EXE}" enable=yes profile=private'
SectionEnd

; ---------------------------------------------------------------------------
; Uninstall Section
; ---------------------------------------------------------------------------

Section "Uninstall"
  ; Remove firewall rule
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Interview Mock Service"'

  ; Remove shortcuts
  Delete "$DESKTOP\Interview Mock.lnk"
  RMDir /r "$SMPROGRAMS\${PRODUCT_NAME}"

  ; Remove files
  RMDir /r "$INSTDIR\mocks"
  RMDir /r "$INSTDIR\docs"
  RMDir /r "$INSTDIR\postman"
  RMDir /r "$INSTDIR\soapui"
  RMDir /r "$INSTDIR\sql"
  Delete "$INSTDIR\interview-mock.exe"
  Delete "$INSTDIR\start-windows.cmd"
  Delete "$INSTDIR\openapi.yaml"
  Delete "$INSTDIR\README.md"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"

  ; Remove registry keys
  DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
SectionEnd
