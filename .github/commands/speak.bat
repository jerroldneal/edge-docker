@echo off
REM Copilot Speak Command - Windows Batch Wrapper
REM Usage: speak.bat "Your message here"

setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Usage: speak.bat "Your message here"
    exit /b 1
)

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%..\..\"

REM Call the Node.js implementation
node "%SCRIPT_DIR%speak-command.mjs" %*
