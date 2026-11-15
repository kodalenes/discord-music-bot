@echo off
setlocal enabledelayedexpansion
title muzik.ikarusgg.me - Durduruluyor...

echo ===================================================
echo    muzik.ikarusgg.me - Sistem Durduruluyor
echo ===================================================
echo.

:: 1. Port 3001'deki Backend Node.js surecini sonlandir
echo [INFO] Calisan backend surecleri kontrol ediliyor (Port 3001)...
set "FOUND=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo [INFO] PID %%a sonlandiriliyor...
    taskkill /f /pid %%a >nul 2>&1
    set "FOUND=1"
)
if "%FOUND%"=="1" (
    echo [OK] Backend sureci basariyla durduruldu.
) else (
    echo [BILGI] Port 3001 uzerinde calisan aktif backend sureci bulunamadi.
)

:: 2. Docker Compose servislerini kapat
echo.
echo [INFO] Lavalink ve Cloudflare Tunnel konteynerleri durduruluyor...
docker compose -f infra/docker-compose.yml down
if %ERRORLEVEL% equ 0 (
    echo [OK] Docker konteynerleri durduruldu ve kaldirildi.
) else (
    echo [UYARI] Docker konteynerleri durdurulurken bir sorun olustu.
)

echo.
echo ===================================================
echo [BASARILI] Tum sistem kaynaklari (RAM/CPU) serbest birakildi!
echo ===================================================
echo.
pause
