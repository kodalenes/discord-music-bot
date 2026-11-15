# muzik.ikarusgg.me — On-Demand Discord Music Hub

On-demand, web-kontrollü Discord müzik botu ve senkronize web oynatıcısı monoreposu.

---

## 🏛️ Mimari ve Dizin Yapısı

```
discord-music-bot/
├── infra/               # Lavalink v4 (Docker) ve Cloudflare Tunnel (cloudflared)
├── backend/             # Node.js + TypeScript + Discord.js v14 + Shoukaku v4 + Express + Socket.io
├── frontend/            # Vite + React + TypeScript + Tailwind CSS (SPA Web Player)
├── muzik-baslat.bat     # Windows tek tıkla başlatma betiği
├── muzik-durdur.bat     # Windows tek tıkla durdurma ve kaynak temizleme betiği
├── .env.example         # Temel ortam değişkenleri şablonu
├── .gitignore
└── AGENTS.md            # Katı mimari kuralları ve standartlar
```

### Portlar & Servisler

| Katman | Teknoloji | Geliştirme Portu | Production URL |
| :--- | :--- | :--- | :--- |
| **Frontend** | React (Vite) + Tailwind | `5173` | `https://muzik.ikarusgg.me` |
| **Backend** | Express + Socket.io + Discord.js | `3001` | `https://api.ikarusgg.me` |
| **Ses Motoru** | Lavalink v4 | `2333` | Yerel / Docker İç Ağı |
| **Tünel** | Cloudflare Tunnel (`cloudflared`) | — | `https://api.ikarusgg.me` -> `localhost:3001` |

---

## ⚙️ Ortam Değişkenleri (.env Kurulumu)

Kök dizinde `.env.example` dosyasını `.env` olarak kopyalayın:

```bash
copy .env.example .env
```

### Değişken Açıklamaları

| Değişken | Açıklama | Örnek Değer |
| :--- | :--- | :--- |
| `DISCORD_BOT_TOKEN` | Discord Developer Portal'dan alınan bot token'ı (Privileged Voice/Guild Intents açık olmalı) | `MTE...` |
| `DISCORD_GUILD_ID` | Botun müzik çalacağı hedef Discord Sunucusu ID'si | `123456789012345678` |
| `DISCORD_VOICE_CHANNEL_ID` | Botun bağlanıp ses ileteceği Ses Kanalı ID'si | `123456789012345678` |
| `CLOUDFLARE_TUNNEL_TOKEN` | Cloudflare Zero Trust panelinden oluşturulan tünel belirteci | `eyJh...` |
| `LAVALINK_PASSWORD` | Lavalink ile Shoukaku arasındaki yetkilendirme şifresi | `youshallnotpass` |
| `LAVALINK_HOST` | Lavalink ana makine adresi | `127.0.0.1` |
| `LAVALINK_PORT` | Lavalink portu | `2333` |
| `APP_ACCESS_PIN` | Web arayüzüne girişte istenecek güvenlik PIN kodu | `1923` |

> [!IMPORTANT]
> `.env` dosyası hassas veriler içerir; `.gitignore` tarafından otomatik olarak korunur ve asla Git'e commit edilmemelidir.

---

## 🚀 Windows Hızlı Başlangıç

### 1. Başlatma (`muzik-baslat.bat`)
`muzik-baslat.bat` dosyasına çift tıklayın. Betik şunları gerçekleştirir:
1. `.env` dosyasının varlığını doğrular.
2. Docker Desktop servisinin çalıştığını teyit eder.
3. `infra/docker-compose.yml` ile Lavalink ve Cloudflare Tunnel konteynerlerini arka planda başlatır.
4. Lavalink ses motorunun hazır olması için 6 saniye bekler.
5. Port `3001` üzerinde Node.js backend sunucusunu ayağa kaldırır.

### 2. Durdurma (`muzik-durdur.bat`)
Sistemi kapatıp tüm sistem kaynaklarını (RAM/CPU) serbest bırakmak için `muzik-durdur.bat` dosyasını çalıştırın:
1. Port 3001'de çalışan Node.js backend sürecini güvenle sonlandırır.
2. Docker konteynerlerini (`lavalink` ve `cloudflared`) tamamen durdurup bellekten kaldırır.

---

## 🌐 Vercel Üzerinde Frontend Yayını (muzik.ikarusgg.me)

Frontend SPA'sını Vercel'e dağıtmak için aşağıdaki adımları izleyin:

### 1. Projeyi İçe Aktarın
1. [Vercel Dashboard](https://vercel.com/dashboard) sayfasına gidin.
2. **Add New...** > **Project** seçeneğine tıklayıp bu Git deposunu seçin.

### 2. Proje Yapılandırması (Build & Output Settings)
- **Framework Preset**: `Vite`
- **Root Directory**: `frontend` *(Edit diyerek `frontend` seçilmelidir)*
- **Build Command**: `pnpm run build` *(veya `npm run build`)*
- **Output Directory**: `dist`
- **Install Command**: `pnpm install` *(veya `npm install`)*

### 3. Ortam Değişkeni (Environment Variables)
Vercel projenize şu değişkeni ekleyin:
- **Key**: `VITE_API_URL`
- **Value**: `https://api.ikarusgg.me`

### 4. Özel Alan Adı (Custom Domain) Tanımlama
1. Vercel proje panelinde **Settings** > **Domains** sekmesine gidin.
2. `muzik.ikarusgg.me` alan adını ekleyin.
3. DNS sağlayıcınızda (Cloudflare vb.) aşağıdaki kaydı oluşturun:
   - **Type**: `CNAME`
   - **Name**: `muzik`
   - **Target**: `cname.vercel-dns.com`
   - **Proxy status**: DNS Only veya Proxied (Vercel SSL sertifikası otomatik tamamlanacaktır).

---

## 🔒 Cloudflare Tunnel Yapılandırması (api.ikarusgg.me)

Docker konteynerindeki `cloudflared` servisinin trafiği yerel backend'e yönlendirebilmesi için Cloudflare Zero Trust konsolunda:
- **Domain**: `api.ikarusgg.me`
- **Type**: `HTTP`
- **URL**: `host.docker.internal:3001` (veya `localhost:3001`)
- **Websocket**: Aktif (Socket.io için gereklidir).
