@echo off
title PC Config Analyzer - Launcher
chcp 65001 >nul

REM Ottieni il percorso dello script
set SCRIPT_DIR=%~dp0

REM Avvia PowerShell con lo script di launcher
PowerShell -NoProfile -ExecutionPolicy Bypass -Command "& '%SCRIPT_DIR%launcher.ps1'"

REM Se PowerShell fallisce, mostra un messaggio
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Errore durante l'esecuzione del launcher
    echo.
    echo Prova ad eseguire manualmente:
    echo   PowerShell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%launcher.ps1"
    echo.
    pause
)
