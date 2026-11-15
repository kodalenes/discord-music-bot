@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title muzik.ikarusgg.me - Durduruluyor...

echo ===================================================
echo    muzik.ikarusgg.me - Sistem Durduruluyor
echo ===================================================
echo.

:: 1. Port 3001 Backend Node.js surecini sonlandir
echo [INFO] Backend sureci kontrol ediliyor ^(Port 3001^)...
set "FOUND_BE=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    set "FOUND_BE=1"
)
if "%FOUND_BE%"=="1" (
    echo [OK] Backend durduruldu.
) else (
    echo [BILGI] Port 3001 uzerinde calisan backend bulunamadi.
)

:: 2. Port 2333 Lavalink surecini sonlandir
echo [INFO] Lavalink sureci kontrol ediliyor ^(Port 2333^)...
set "FOUND_LL=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":2333" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    set "FOUND_LL=1"
)
if "%FOUND_LL%"=="1" (
    echo [OK] Lavalink durduruldu.
) else (
    echo [BILGI] Port 2333 uzerinde calisan Lavalink bulunamadi.
)

:: 3. Cloudflared surecini sonlandir
echo [INFO] Cloudflare Tunnel durduruluyor...
taskkill /f /im cloudflared.exe >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] cloudflared.exe durduruldu.
) else (
    echo [BILGI] Calisan cloudflared.exe bulunamadi.
)

echo.
echo ===================================================
echo [BASARILI] Tum surecler durduruldu ve RAM serbest birakildi!
echo ===================================================
echo.
pause
