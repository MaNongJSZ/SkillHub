@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1

set "SDK_INCLUDE=C:\Program Files (x86)\Windows Kits\10\Include\10.0.26100.0"
set "INCLUDE=%INCLUDE%;%SDK_INCLUDE%\um;%SDK_INCLUDE%\ucrt;%SDK_INCLUDE%\shared"
set "LIB=%LIB%;C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\um\x64;C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\ucrt\x64"
set "PATH=%PATH%;C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64"

cd /d E:\webtest\skillforge\src-tauri
cargo test --lib 2>&1
