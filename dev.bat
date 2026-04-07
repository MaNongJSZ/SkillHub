@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
set "VCVARS_BAT="

if exist "%VSWHERE%" (
  for /f "usebackq delims=" %%I in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -find VC\Auxiliary\Build\vcvars64.bat`) do (
    set "VCVARS_BAT=%%I"
  )
)

if not defined VCVARS_BAT if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" set "VCVARS_BAT=%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if not defined VCVARS_BAT if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" set "VCVARS_BAT=%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
if not defined VCVARS_BAT if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat" set "VCVARS_BAT=%ProgramFiles%\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat"
if not defined VCVARS_BAT if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvars64.bat" set "VCVARS_BAT=%ProgramFiles%\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvars64.bat"

if not defined VCVARS_BAT (
  echo [ERROR] Unable to find vcvars64.bat.
  echo [HINT] Please install Visual Studio Build Tools with C++ workload.
  pause
  exit /b 1
)

call "%VCVARS_BAT%" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Failed to initialize MSVC build environment.
  echo [HINT] vcvars64.bat path: "%VCVARS_BAT%"
  pause
  exit /b 1
)

set "WINDOWS_KITS_ROOT=%ProgramFiles(x86)%\Windows Kits\10"
set "WINDOWS_SDK_VERSION="

if exist "%WINDOWS_KITS_ROOT%\Include" (
  for /f "delims=" %%I in ('dir /b /ad /o-n "%WINDOWS_KITS_ROOT%\Include" 2^>nul') do (
    if not defined WINDOWS_SDK_VERSION set "WINDOWS_SDK_VERSION=%%I"
  )
)

if defined WINDOWS_SDK_VERSION (
  set "WINDOWS_SDK_INCLUDE=!WINDOWS_KITS_ROOT!\Include\!WINDOWS_SDK_VERSION!"
  set "WINDOWS_SDK_LIB=!WINDOWS_KITS_ROOT!\Lib\!WINDOWS_SDK_VERSION!"
  set "WINDOWS_SDK_BIN=!WINDOWS_KITS_ROOT!\bin\!WINDOWS_SDK_VERSION!\x64"

  if exist "!WINDOWS_SDK_INCLUDE!\um\Windows.h" (
    set "WindowsSdkDir=!WINDOWS_KITS_ROOT!\"
    set "WindowsSDKVersion=!WINDOWS_SDK_VERSION!\"
    set "UniversalCRTSdkDir=!WINDOWS_KITS_ROOT!\"
    set "UCRTVersion=!WINDOWS_SDK_VERSION!"
    set "INCLUDE=!INCLUDE!;!WINDOWS_SDK_INCLUDE!\shared;!WINDOWS_SDK_INCLUDE!\ucrt;!WINDOWS_SDK_INCLUDE!\um;!WINDOWS_SDK_INCLUDE!\winrt;!WINDOWS_SDK_INCLUDE!\cppwinrt"
    set "LIB=!LIB!;!WINDOWS_SDK_LIB!\ucrt\x64;!WINDOWS_SDK_LIB!\um\x64"
    set "LIBPATH=!LIBPATH!;!WINDOWS_SDK_LIB!\ucrt\x64;!WINDOWS_SDK_LIB!\um\x64"
    if exist "!WINDOWS_SDK_BIN!" set "PATH=!PATH!;!WINDOWS_SDK_BIN!"
  )
)

where cl.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] cl.exe is not available after vcvars64 initialization.
  echo [HINT] vcvars64.bat path: "%VCVARS_BAT%"
  pause
  exit /b 1
)

echo ============================================
echo   SkillForge dev server is starting...
echo ============================================
echo.

npm run tauri dev
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo [ERROR] Dev server exited with code %EXIT_CODE%.
  pause
)

exit /b %EXIT_CODE%
