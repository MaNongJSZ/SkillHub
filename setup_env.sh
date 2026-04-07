#!/bin/bash
# SkillForge - VS Build Tools 环境设置 (bash 环境使用)
# 用法: source setup_env.sh

MSVC_BASE="/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/14.44.35207"
SDK_BASE="/c/Program Files (x86)/Windows Kits/10"
SDK_VER="10.0.26100.0"

export VCINSTALLDIR='C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\'
export VCToolsVersion="14.44.35207"
export INCLUDE="C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Tools\\MSVC\\14.44.35207\\include;C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Auxiliary\\VS\\include;C:\\Program Files (x86)\\Windows Kits\\10\\Include\\10.0.26100.0\\um;C:\\Program Files (x86)\\Windows Kits\\10\\Include\\10.0.26100.0\\ucrt;C:\\Program Files (x86)\\Windows Kits\\10\\Include\\10.0.26100.0\\shared"
export LIB="C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Tools\\MSVC\\14.44.35207\\lib\\x64;C:\\Program Files (x86)\\Windows Kits\\10\\Lib\\10.0.26100.0\\um\\x64;C:\\Program Files (x86)\\Windows Kits\\10\\Lib\\10.0.26100.0\\ucrt\\x64"
export PATH="$MSVC_BASE/bin/HostX64/x64:$SDK_BASE/bin/$SDK_VER/x64:$PATH"

echo "VS Build Tools 环境已设置"
which cl.exe 2>/dev/null && echo "cl.exe: OK" || echo "cl.exe: NOT FOUND"
