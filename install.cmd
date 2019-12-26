@echo off

REM Begin ->  Trick to run as admin
set "params=%*"
cd /d "%~dp0" && ( if exist "%temp%\getadmin.vbs" del "%temp%\getadmin.vbs" ) && fsutil dirty query %systemdrive% 1>nul 2>nul || (  echo Set UAC = CreateObject^("Shell.Application"^) : UAC.ShellExecute "cmd.exe", "/k cd ""%~sdp0"" && %~s0 %params%", "", "runas", 1 >> "%temp%\getadmin.vbs" && "%temp%\getadmin.vbs" && exit /B )
REM End ->    Trick to run as admin

REM Should need
echo Installing nodejs 13
.\installTools\installnodejs.vbs

echo Installing npm build tools...
cmd /c npm install --global --production windows-build-tools

echo Installing node-gyp....
cmd /c npm install -g node-gyp

echo Installing needed dependencies...
npm install
echo
echo
echo Ready to start.
echo
echo