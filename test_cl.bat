@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
set "LIB=%LIB%;C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\um\x64;C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\ucrt\x64"
set "INCLUDE=%INCLUDE%;C:\Program Files (x86)\Windows Kits\10\Include\10.0.26100.0\um;C:\Program Files (x86)\Windows Kits\10\Include\10.0.26100.0\ucrt"
echo INCLUDE=%INCLUDE%
echo LIB=%LIB%
cl.exe -nologo -MD -W4 -Zm2000 -c -FoNUL "C:\Users\REDMI\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\vswhom-sys-0.1.3\ext\vswhom.cpp" 2>&1
