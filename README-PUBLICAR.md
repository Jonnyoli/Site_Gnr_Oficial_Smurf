# GNR Central — Publicação READY

Este pacote inclui:

```txt
api-server/src      Backend/API protegido
gnr-central/src     Frontend limpo
scripts/            Checks de publicação
```

## O que foi preparado

### Backend

- Demo user bloqueado em produção.
- `SESSION_SECRET` obrigatório em produção.
- Validação de envs críticas quando `NODE_ENV=production`.
- Middleware global de autenticação para APIs sensíveis.
- Exceções apenas para:
  - `/api/healthz`
  - `/api/auth/*`
  - `/api/internal/nic-bot/*` com secret próprio
  - `/api/discord-command-center/bot/*` com secret próprio
  - `/api/school/discord/internal/*` com secret próprio
  - `/api/unit-hub/internal/*` com secret próprio
  - `/api/system-health/bot-heartbeat` com secret próprio
- Headers de segurança básicos sem dependências novas.
- Rate limit em memória para `/api`, `/api/auth` e `/api/youtube`.
- `/transcripts` protegido por sessão.
- Upload de arquivo com validação de extensão e corpo vazio.

### Frontend

- Removidos ficheiros `.before-*`.
- Removida pasta duplicada `src/src`.
- Mantido player, Spotify, YouTube, loja, integração e layout atual.
- `.env.production.example` incluído.

## Instalação local

Backend:

```powershell
cd D:\bot\SITE_GNR\api-server
copy .env.production.example .env
# preencher env
npm install
npm run build
npm start
```

Frontend:

```powershell
cd D:\bot\SITE_GNR\gnr-central
copy .env.production.example .env.production
# preencher VITE_API_URL
npm install
npm run build
npm run preview
```

## Deploy recomendado

### Backend

Publicar como serviço Node:

```txt
D:\bot\SITE_GNR\api-server
```

Variáveis obrigatórias:

```env
NODE_ENV=production
PORT=3002
FRONTEND_URL=https://central.teu-dominio.pt
APP_URL=https://api.teu-dominio.pt
API_URL=https://api.teu-dominio.pt
REDIRECT_URI=https://api.teu-dominio.pt/api/auth/discord/callback
SESSION_SECRET=chave-grande-e-segura
MONGO_URI=mongodb+srv://...
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_TOKEN=
DISCORD_GUILD_ID=
YOUTUBE_API_KEY=
NIC_BOT_API_SECRET=
DISCORD_COMMAND_CENTER_SECRET=
SCHOOL_SYNC_SECRET=
UNIT_DISCORD_SYNC_SECRET=
BOT_HEARTBEAT_SECRET=
```

### Frontend

Publicar Vite/React:

```txt
D:\bot\SITE_GNR\gnr-central
```

Env:

```env
VITE_API_URL=https://api.teu-dominio.pt
```

## Testes obrigatórios

Com sessão:

```txt
/api/healthz
/api/auth/me
/api/data/guardas
/api/operational-sync/me
/api/store/me
/api/youtube/search?q=rfm
/integacao
/loja
/player YouTube
/player Spotify
```

Sem sessão, estas rotas devem dar `401`:

```txt
/api/data/guardas
/api/audit
/api/alerts
/api/store/me
/api/data/arquivos/upload
/transcripts/ficheiro.html
```

Rotas internas devem dar `401` sem secret:

```txt
/api/internal/nic-bot/operations/search
/api/discord-command-center/bot/config/teste
/api/school/discord/internal/sync
/api/unit-hub/internal/health
/api/system-health/bot-heartbeat
```

## Nota importante

O rate limit incluído é em memória. Para produção grande com vários processos/containers, o ideal é Redis. Mas este pacote fica pronto para publicar num serviço Node simples.
