# ScoreHub — Documentación General

Bot asistente de fútbol/apuestas multi-competencia.
Funciona en **Telegram** (producción) y **WhatsApp** (legacy, vía `whatsapp-web.js`).

> **Última actualización:** julio 2026
> **Bot status:** `Running`
> **DB:** Supabase PostgreSQL (apuestas, usuarios)
> **Cache de fútbol:** 365scores (webws.365scores.com)

---

## Tabla de contenidos

1. [Estado actual](#estado-actual)
2. [Arquitectura](#arquitectura)
3. [API de 365scores](#api-de-365scores)
4. [Comandos del bot](#comandos-del-bot)
5. [Variables de entorno](#variables-de-entorno)
6. [Estructura del proyecto](#estructura-del-proyecto)
7. [Cómo correr localmente](#cómo-correr-localmente)
8. [Troubleshooting](#troubleshooting)

---

## Estado actual

### Bot
- **Telegram**: `@botmundialistabot` (token `8626115394:AAF...`)
- **Webhook**: usa **polling largo** (long-polling de 30s) con `offset` para no perder updates
- **Heartbeat**: cada 5 min imprime `💓 Bot vivo | uptime=Xs | offset=Y`

### Datos en Supabase PostgreSQL

Tabla | Descripción
---|---
`usuarios` | Registro de usuarios de WhatsApp/Telegram
`equipos_seguidos` | Equipos favoritos por usuario
`historial_consultas` | Historial de preguntas
`apuestas` | Tickets de apuesta parseados de imágenes
`apuesta_selecciones` | Selecciones individuales de cada ticket
`eventos_apuesta` | Eventos (goles, cambios) en apuestas

---

## Arquitectura

```
┌──────────────┐    ┌──────────────┐
│  Telegram    │    │  365scores   │
│  (polling)   │◄──►│  web API     │
└──────────────┘    └──────────────┘
       │                    ▲
       ▼                    │
┌──────────────┐    ┌──────────────┐
│ messageHandler│───►│scoring logic │
│  (router)    │    │  (Gemini)    │
└──────────────┘    └──────────────┘
       │
       ▼
┌──────────────┐
│  Supabase   │
│  PostgreSQL │
└──────────────┘
```

### Componentes principales

- **`telegramBot.js`** — bot principal, long-polling de updates, dispatch a `messageHandler`
- **`bot.js`** — bot legacy de WhatsApp (no en producción)
- **`handlers/messageHandler.js`** — router principal: parsea intent con Gemini, dispatch a handler específico
- **`services/scores365Service.js`** — cliente HTTP para `webws.365scores.com` (gzip, retry, throttling)
- **`services/footballApi.js`** — cliente legacy para RapidAPI (Free Football Data)
- **`services/geminiService.js`** — wrapper Gemini 2.5 Flash (NLU + generación)
- **`services/liveGamesPoller.js`** — cron 25s que escribe datos de partidos en vivo
- **`services/cosmosRefresh.js`** — cron 6h que refresca catálogo
- **`services/notifier.js`** — EventEmitter para eventos del juego (goles, tarjetas, etc.)
- **`services/telegramNotifier.js`** — listener que notifica a suscriptores
- **`services/betEvaluator.js`** — evalúa tickets contra estado del partido (9 BET_TYPES)
- **`services/intentParser.js`** — quick regex + Gemini fallback para entender lenguaje natural
- **`services/conversationContext.js`** — memoria por chat (in-memory + archivo `database/.conversation-context.json`)
- **`database/connection.js`** — pool de Supabase
- **`database/bootstrapState.js`** — state cache para re-runs rápidos del bootstrap
- **`scripts/cosmos-bootstrap.js`** — ingesta inicial
- **`scripts/test-365-mundial.js`** — checks E2E

---

## API de 365scores

Ver [`docs/api-365scores.md`](./api-365scores.md) para los 30+ endpoints usados.

Base URL: `https://webws.365scores.com/web/`

Parámetros comunes en todos:
- `appTypeId=5` (web)
- `langId=14` (español)
- `timezoneName=America/Costa_Rica`
- `userCountryId=153`
- (más según endpoint)

Headers: `User-Agent: Mozilla/5.0`, `Origin: https://www.365scores.com`, `Accept-Encoding: gzip`

Categorías de endpoints:
- **Catálogo**: sports, competitions, competitors, related entities
- **Partidos**: allscores, featured, current, results, fixtures, h2h, game, game/stats
- **Stats y trends**: stats/preGame, tournament, standings, brackets, competition history, team of week
- **Apuestas y predicciones**: predictions, odds (lines, outrights, teaser, best odds), trends
- **Atletas**: athletes, nextGame, games, chartEvents
- **Contenido**: news

---

## Comandos del bot

Ver [`docs/bot-commands.md`](./bot-commands.md) para detalle completo.

El bot entiende **lenguaje natural en español** (parseado por Gemini) y **comandos `/` explícitos**.

### Comandos `/` (alta confianza, sin Gemini)

```
/start, /inicio, /help, /ayuda
/partidos, /hoy, /manana, /tomorrow
/tabla, /clasificacion, /mundial
/goles, /corners, /posesion, /tarjetas, /goleador
/racha
/yo, /perfil, /profile
/cambiarnombre, /cambiarusuario, /mialias
/reset
/follow <id> [all|outcome]
/unfollow <id>
/misapuestas, /siguiendo
```

### Lenguaje natural (Gemini)

```
"Cómo le fue a Brasil"
"Argentina vs Francia"
"Tabla del Grupo A"
"Quién es Scaloneta"
"Quiero seguir a México"
"Sígueme el ticket 555"
"Avísame del 123 solo cuando gane"
"Deja de seguir el 555"
"Qué tickets sigo"
```

---

## Variables de entorno

Ver [`docs/env-vars.md`](./env-vars.md) para el detalle.

```bash
# DBs
DB_HOST=aws-1-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.<ref>
DB_PASSWORD=...

# APIs externas
RAPIDAPI_KEY=...
GEMINI_API_KEY=...
TELEGRAM_BOT_TOKEN=<bot-token>

# 365scores
SCORES365_TIMEZONE=America/Costa_Rica
SCORES365_USER_COUNTRY=153
SCORES365_LANG=14
SCORES365_APP_TYPE=5
SCORES365_POLL_MS=25000
PRIMARY_COMPETITION_ID=5930

# Notificaciones live
ENABLE_LIVE_NOTIFIER=false

# Server
ADMIN_PORT=3001
```

---

## Estructura del proyecto

```
ScoreHub/
├── bot.js                          # Bot legacy WhatsApp
├── telegramBot.js                   # Bot principal Telegram (long-polling)
├── package.json
├── .env / .env.example
├── .github/workflows/azure.yml      # CI/CD
├── README.md
│
├── database/
│   ├── connection.js                # Pool Supabase
│   ├── cosmos-schema.json           # Schema declarativo de 25 containers
│   ├── bootstrapState.js            # State cache para bootstrap incremental
│   ├── schema.sql                   # Schema PostgreSQL
│   ├── migrations/
│   │   └── 002_scores365_state.sql
│   └── .scores365-state.json        # Generado por bootstrap
│   └── .conversation-context.json   # Generado en runtime
│
├── handlers/                        # Router de mensajes
│   ├── messageHandler.js            # Entry point: parse intent + dispatch
│   ├── queryParser.js               # Parser legacy de queries
│   ├── conversationalHandler.js     # NLU: "sigueme el 555" → follow
│   ├── followHandler.js             # /follow, /unfollow, /misapuestas
│   ├── matchHandler.js              # "Brasil vs Francia"
│   ├── teamHandler.js               # "Dame info de Alemania"
│   ├── statsHandler.js              # /goles, /corners
│   ├── tableHandler.js              # /tabla, /mundial
│   ├── summaryHandler.js            # /resumen
│   ├── bettingHandler.js            # OCR + parse de tickets
│   └── betImageHandler.js           # Procesa imágenes de tickets
│
├── services/                        # Lógica de negocio
│   ├── scores365Service.js          # Cliente 365scores (gzip, retry)
│   ├── footballApi.js                # Cliente RapidAPI legacy
│   ├── geminiService.js             # Wrapper Gemini 2.5 Flash
│   ├── betParserService.js          # OCR + parser de tickets
│   ├── betTrackingEngine.js         # Motor legacy de tracking
│   ├── betEvaluator.js              # NEW: evalúa 9 tipos de apuesta
│   ├── notifier.js                  # NEW: EventEmitter
│   ├── telegramNotifier.js          # NEW: listener que envía mensajes
│   ├── intentParser.js              # NEW: quick regex + Gemini
│   ├── conversationContext.js       # NEW: memoria por chat
│   ├── liveGamesPoller.js           # Polling live (25s cron)
│   ├── cosmosRefresh.js             # Refresh periódico (6h cron)
│   ├── notificationService.js       # Notificaciones legacy WhatsApp
│   ├── cacheService.js              # Cache in-memory
│   ├── ocrService.js                # OCR con Tesseract
│   ├── imageStorageService.js       # Almacena imágenes de tickets
│   ├── marketNormalizer.js          # Normaliza mercados de apuesta
│   └── countryFlagsService.js      # Banderas de países
│
├── dashboard/                       # Dashboard Web Premium
│   ├── docs/                        # Documentación del dashboard
│   ├── server/                      # Express API (30+ endpoints)
│   └── src/                         # React + Clean Architecture
│
├── scripts/                         # Scripts de admin
│   ├── cosmos-bootstrap.js          # Ingesta inicial 365scores
│   ├── backfill-history.js          # Backfill de historial Mundial
│   └── test-365-mundial.js         # Checks E2E
│
├── admin/
│   └── server.js                    # Panel admin (Express)
│
├── utils/                           # Helpers
│   ├── userStorage.js
│   ├── constants.js
│   ├── formatters.js
│   └── teamContext.js
│
└── docs/                            # Documentación
    ├── README.md (este archivo)
    ├── api-365scores.md
    ├── api-rapidapi-endpoints.md     # Endpoints RapidAPI
    ├── api-rapidapi-overview.md      # Overview RapidAPI
    ├── azure-deploy.md              # DEPRECATED
    ├── bot-commands.md
    ├── bot-follow.md                # Comandos follow/unfollow
    └── env-vars.md
```

---

## Cómo correr localmente

```bash
# 1. Instalar deps del bot
npm install

# 2. Copiar y completar .env
cp .env.example .env
# Editar con: DB_*, GEMINI_*, TELEGRAM_*, RAPIDAPI_*

# 3. Iniciar bot
npm start                # = node bot.js (WhatsApp legacy)
npm run start:telegram   # = node telegramBot.js (recomendado)

# 4. (Opcional) Iniciar Dashboard Web
cd dashboard
npm install
npm run dev              # Vite dev server (puerto 5173)
# En otra terminal: node server/index.js (Express API, puerto 3002)
```

---

## Dashboard Web

El dashboard es una app React independiente con su propio servidor Express. Documentación completa en [`dashboard/docs/`](../dashboard/docs/):

| Archivo | Descripción |
|---------|-------------|
| [`00-VISION.md`](../dashboard/docs/00-VISION.md) | Visión general del dashboard |
| [`01-DESIGN-TOKENS.md`](../dashboard/docs/01-DESIGN-TOKENS.md) | Sistema de diseño (colores, tipografía, layout) |
| [`02-ARCHITECTURE.md`](../dashboard/docs/02-ARCHITECTURE.md) | Clean Architecture + endpoints |
| [`03-PHASE-01-foundation.md`](../dashboard/docs/03-PHASE-01-foundation.md) | Fase 1: Fundación |
| [`04-PHASE-02-core-matches-standings.md`](../dashboard/docs/04-PHASE-02-core-matches-standings.md) | Fase 2: Partidos + Tabla |
| [`05-PHASE-03-stats-tips-news-players.md`](../dashboard/docs/05-PHASE-03-stats-tips-news-players.md) | Fase 3: Stats + Tips + Noticias |
| [`06-PHASE-04-polish-premium.md`](../dashboard/docs/06-PHASE-04-polish-premium.md) | Fase 4: Polish premium |
| [`07-PHASE-05-history-backend.md`](../dashboard/docs/07-PHASE-05-history-backend.md) | Fase 5: History backend |
| [`08-PHASE-06-history-data-layer.md`](../dashboard/docs/08-PHASE-06-history-data-layer.md) | Fase 6: History data layer |
| [`09-PHASE-07-history-ui.md`](../dashboard/docs/09-PHASE-07-history-ui.md) | Fase 7: History UI |
| [`10-PHASE-08-history-refresh.md`](../dashboard/docs/10-PHASE-08-history-refresh.md) | Fase 8: History refresh |
```

---

## Troubleshooting

### Bot crasheado con `Cannot find module 'X'`
- Verifica que el path del require es relativo a la ubicación del archivo
- `telegramBot.js` está en el root → paths deben empezar con `./` o ser absolutos

### Bot vivo pero no responde a mensajes
- Verifica `TELEGRAM_BOT_TOKEN`

### `userStorage is not defined`
- Bug conocido: si modificas `handlers/messageHandler.js` y olvidas `const userStorage = require('../utils/userStorage')` al top, explota. El test E2E lo detecta.
