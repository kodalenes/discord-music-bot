@echo off
setlocal enabledelayedexpansion
title muzik.ikarusgg.me - Baslatiliyor...

echo ===================================================
echo    muzik.ikarusgg.me - Discord Muzik Hub
echo ===================================================
echo.

:: 1. .env kontrolu
if not exist ".env" (
    echo [HATA] .env dosyasi bulunamadi!
    echo Lutfen .env.example dosyasini .env olarak kopyalayin ve gerekli alanlari doldurun:
    echo   copy .env.example .env
    echo.
    pause
    exit /b 1
)
echo [OK] .env dosyasi bulundu.

:: 2. Docker daemon kontrolu
echo [INFO] Docker servisinin durumu kontrol ediliyor...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] Docker calismiyor!
    echo Lutfen Docker Desktop uygulamasini baslatin ve tekrar deneyin.
    echo.
    pause
    exit /b 1
)
echo [OK] Docker servisi aktif.

:: 3. Docker Compose ile Lavalink ve Cloudflare Tunnel baslatma
echo.
echo [INFO] Lavalink ve Cloudflare Tunnel konteynerleri baslatiliyor...
docker compose -f infra/docker-compose.yml --env-file .env up -d
if %ERRORLEVEL% neq 0 (
    echo [HATA] Docker konteynerleri baslatilamadi!
    pause
    exit /b 1
)

:: 4. Lavalink baslangic beklemesi (6 saniye)
echo [INFO] Lavalink ses sunucusunun baslamasi bekleniyor (6 saniye)...
timeout /t 6 /nobreak >nul
echo [OK] Lavalink hazir.

:: 5. Backend sunucusunu baslatma
echo.
echo ===================================================
echo    Backend Sunucusu Baslatiliyor (Port 3001)...
echo ===================================================
echo.

if not exist "backend\package.json" (
    echo [BILGI] backend/ dizini henuz hazir degil.
    echo Lavalink (2333) ve Cloudflare Tunnel arka planda calisiyor.
    echo Backend kodu eklendiginde bu pencereden otomatik calisacaktir.
    echo.
    pause
    exit /b 0
)

cd backend
if exist "pnpm-lock.yaml" (
    pnpm dev
) else if exist "package-lock.json" (
    npm run dev
) else (
    pnpm dev
)
