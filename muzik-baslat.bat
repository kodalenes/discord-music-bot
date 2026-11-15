@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title TARmusic - Arka Planda Baslatiliyor...

echo ===================================================
echo    TARmusic - Discord Muzik Hub (Arka Plan Modu)
echo ===================================================
echo.

:: 1. .env kontrolu ve yuklenmesi
if not exist ".env" (
    echo [HATA] .env dosyasi bulunamadi!
    echo Lutfen .env.example dosyasini .env olarak kopyalayin ve gerekli alanlari doldurun.
    pause
    exit /b 1
)
for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
    if not "%%A"=="" set "%%A=%%B"
)

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

:: 4. Log klasoru
if not exist "logs" mkdir "logs"

:: 5. Backend derli degilse derle
if not exist "backend\dist\index.js" (
    echo [INFO] Backend derleniyor...
    pushd "%~dp0backend"
    call pnpm run build
    popd
)

:: 6. Onceki acik surecler varsa temizle (cift baslatmayi onlemek icin)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":2333" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
taskkill /f /im cloudflared.exe >nul 2>&1

:: 7. Lavalink baslat (tamamen gizli arka plan)
echo [1/3] Lavalink baslatiliyor ^(Port 2333^)...
powershell -NoProfile -Command "Start-Process -FilePath '%JAVA_EXE%' -ArgumentList '-Xmx160m','-Xms64m','-XX:+UseSerialGC','-jar','%~dp0infra\bin\Lavalink.jar' -WorkingDirectory '%~dp0infra' -WindowStyle Hidden -RedirectStandardOutput '%~dp0logs\lavalink.log' -RedirectStandardError '%~dp0logs\lavalink.err.log'"

:: 8. Cloudflare Tunnel baslat (tamamen gizli arka plan)
echo [2/3] Cloudflare Tunnel baslatiliyor...
powershell -NoProfile -Command "Start-Process -FilePath '%~dp0infra\bin\cloudflared.exe' -ArgumentList 'tunnel','--no-autoupdate','run','--token','%CLOUDFLARE_TUNNEL_TOKEN%' -WorkingDirectory '%~dp0infra' -WindowStyle Hidden -RedirectStandardOutput '%~dp0logs\cloudflared.log' -RedirectStandardError '%~dp0logs\cloudflared.err.log'"

:: 9. Lavalink hazirlik beklemesi
echo [INFO] Ses sunucusu hazirlaniyor ^(6 saniye^)...
timeout /t 6 /nobreak >nul

:: 10. Backend sunucusunu baslat (tamamen gizli arka plan)
echo [3/3] Backend baslatiliyor ^(Port 3001^)...
powershell -NoProfile -Command "Start-Process -FilePath 'node' -ArgumentList 'dist/index.js' -WorkingDirectory '%~dp0backend' -WindowStyle Hidden -RedirectStandardOutput '%~dp0logs\backend.log' -RedirectStandardError '%~dp0logs\backend.err.log'"

echo.
echo [OK] Tum servisler arka planda calisiyor! Bu pencere kapanacak.
echo Durdurmak icin: muzik-durdur.bat
echo Loglar: logs\ klasoru
timeout /t 2 /nobreak >nul
exit /b 0
