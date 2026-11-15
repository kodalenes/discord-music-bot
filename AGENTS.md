# AGENTS.md — Architecture Rules for muzik.ikarusgg.me

> Every agent, task, and contributor MUST follow the rules below.
> Do not deviate from these conventions without explicit approval.

## Monorepo Layout

```
discord-music-bot/
├── infra/          # Docker Compose, Lavalink config, Cloudflare tunnel
├── backend/        # Node.js server (API + Discord bot + WebSocket)
├── frontend/       # React SPA (web player dashboard)
├── .env.example    # Template for required env vars
├── .gitignore
└── AGENTS.md       # ← this file
```

## Tech Stack

| Layer      | Stack                                                                      | Port |
| ---------- | -------------------------------------------------------------------------- | ---- |
| Backend    | Node.js · TypeScript · Discord.js v14 · Shoukaku v4 · Express · Socket.io | 3001 |
| Frontend   | Vite · React · TypeScript · Tailwind CSS                                   | 5173 |
| Audio      | Lavalink (Docker)                                                          | 2333 |
| Tunnel     | Cloudflare Tunnel (cloudflared)                                            | —    |

## URLs

| Environment | Frontend                  | Backend (API / WS)        |
| ----------- | ------------------------- | ------------------------- |
| Development | http://localhost:5173     | http://localhost:3001      |
| Production  | https://muzik.ikarusgg.me | https://api.ikarusgg.me   |

## Rules

1. **TypeScript everywhere** — no `.js` source files in backend/ or frontend/.
2. **Strict mode** — `"strict": true` in every `tsconfig.json`.
3. **ESM** — `"type": "module"` in every `package.json`.
4. **Environment** — all secrets live in the root `.env`; never commit it.
5. **Ports** — backend 3001, frontend dev-server 5173, Lavalink 2333. No exceptions.
6. **Package manager** — pnpm (workspace root + per-project).
7. **Formatting** — Prettier defaults; use semicolons.
8. **Monorepo dirs** — `infra/`, `backend/`, `frontend/` at root. No new top-level dirs without approval.
