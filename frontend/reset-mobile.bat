@echo off
REM Mobile App Reset and Install Script for Windows

echo.
echo Cleaning up...
echo.

REM Remove node_modules
if exist node_modules (
    echo Removing node_modules...
    rmdir /s /q node_modules
)

REM Clear npm cache
echo Clearing npm cache...
call npm cache clean --force

REM Remove package-lock.json
if exist package-lock.json (
    echo Removing package-lock.json...
    del package-lock.json
)

echo.
echo Installing dependencies...
echo.
call npm install

echo.
echo Clearing Expo cache...
echo.
call expo start -c

echo.
echo Done! Run 'npm run android' or 'npm run ios' to test the app
echo.
pause
