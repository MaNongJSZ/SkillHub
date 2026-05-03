@echo off
set MSVC_ROOT=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207
set WIN_SDK=10.0.26100.0
set WIN_KIT=C:\Program Files (x86)\Windows Kits\10

set PATH=%MSVC_ROOT%\bin\Hostx64\x64;%WIN_KIT%\bin\%WIN_SDK%\x64;%PATH%
set INCLUDE=%MSVC_ROOT%\include;%WIN_KIT%\Include\%WIN_SDK%\ucrt;%WIN_KIT%\Include\%WIN_SDK%\um;%WIN_KIT%\Include\%WIN_SDK%\shared
set LIB=%MSVC_ROOT%\lib\x64;%WIN_KIT%\Lib\%WIN_SDK%\ucrt\x64;%WIN_KIT%\Lib\%WIN_SDK%\um\x64

npm run tauri dev
