@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title muzik.ikarusgg.me - Baslatiliyor...

echo ===================================================
echo    muzik.ikarusgg.me - Discord Muzik Hub (Yerel)
echo ===================================================
echo.

:: 1. .env kontrolu ve yuklenmesi
if not exist ".env" (
    echo [HATA] .env dosyasi bulunamadi!
    echo Lutfen .env.example dosyasini .env olarak kopyalayin ve gerekli alanlari doldurun.
    echo.
    pause
    exit /b 1
)
for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
    if not "%%A"=="" set "%%A=%%B"
)
echo [OK] .env dosyasi yuklendi.

:: 2. Java kontrolu (PATH veya Eclipse Adoptium kurulum yolu)
set "JAVA_EXE=java"
where java >nul 2>&1
if %ERRORLEVEL% neq 0 (
    for /d %%D in ("C:\Program Files\Eclipse Adoptium\jre-*") do (
        if exist "%%D\bin\java.exe" set "JAVA_EXE=%%D\bin\java.exe"
    )
)
"%JAVA_EXE%" -version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] Java bulunamadi! Lutfen Java 21 JRE kurun.
    pause
    exit /b 1
)
echo [OK] Java hazir.

:: 3. Yerel binary kontrolu
if not exist "infra\bin\Lavalink.jar" (
    echo [HATA] infra\bin\Lavalink.jar bulunamadi!
    pause
    exit /b 1
)
if not exist "infra\bin\cloudflared.exe" (
    echo [HATA] infra\bin\cloudflared.exe bulunamadi!
    pause
    exit /b 1
)

:: 4. Lavalink baslat (160 MB RAM limiti + SerialGC ile arka planda)
echo [INFO] Lavalink baslatiliyor ^(Port 2333, Optimize Bellek^)...
start "muzik-lavalink" /min cmd /c "cd /d "%~dp0infra" && "%JAVA_EXE%" -Xmx160m -Xms64m -XX:+UseSerialGC -jar "%~dp0infra\bin\Lavalink.jar""

:: 5. Cloudflare Tunnel baslat (arka planda)
echo [INFO] Cloudflare Tunnel baslatiliyor...
start "muzik-cloudflared" /min cmd /c ""%~dp0infra\bin\cloudflared.exe" tunnel --no-autoupdate run --token %CLOUDFLARE_TUNNEL_TOKEN%"

:: 6. Lavalink hazirlik beklemesi
echo [INFO] Lavalink ses sunucusunun hazirlanmasi bekleniyor ^(6 saniye^)...
timeout /t 6 /nobreak >nul
echo [OK] Lavalink ve Cloudflare Tunnel arka planda aktif.

:: 7. Backend sunucusunu baslatma
echo.
echo ===================================================
echo    Backend Sunucusu Baslatiliyor ^(Port 3001^)...
echo ===================================================
echo.

cd /d "%~dp0backend"
if not exist "dist\index.js" (
    echo [INFO] Backend derleniyor...
    call npm run build
)
if exist "dist\index.js" (
    call node dist/index.js
) else (
    call npm run dev
)

echo.
echo [UYARI] Backend sunucusu durdu ^(Cikis kodu: %ERRORLEVEL%^).
pause
