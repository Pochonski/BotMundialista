# BotMundialista — Documentación General

Bot asistente de fútbol/apuestas con integración al Mundial 2026.
Funciona en **Telegram** (producción) y **WhatsApp** (legacy, vía `whatsapp-web.js`).

> **Última actualización:** julio 2026
> **Bot status:** `Running` en Azure App Service (Linux, Node 22)
> **DB primaria:** Supabase PostgreSQL (apuestas, usuarios)
> **DB secundaria:** Azure Cosmos DB Free tier (cache de 365scores, 25 contenedores)
> **Cache de fútbol:** 365scores (webws.365scores.com)

---

## Tabla de contenidos

1. [Estado actual](#estado-actual)
2. [Arquitectura](#arquitectura)
3. [Datos en Cosmos DB](#datos-en-cosmos-db)
4. [API de 365scores](#api-de-365scores)
5. [Comandos del bot](#comandos-del-bot)
6. [Variables de entorno](#variables-de-entorno)
7. [Estructura del proyecto](#estructura-del-proyecto)
8. [Cómo correr localmente](#cómo-correr-localmente)
9. [Cómo deployar](#cómo-deployar)
10. [Troubleshooting](#troubleshooting)

---

## Estado actual

### Bot
- **Telegram**: `@botmundialistabot` (token `8626115394:AAF...`)
- **Webhook**: usa **polling largo** (long-polling de 30s) con `offset` para no perder updates
- **Heartbeat**: cada 5 min imprime `💓 Bot vivo | uptime=Xs | offset=Y`
- **Deploys**: continuo vía GitHub Actions (`.github/workflows/azure.yml`)

### Datos en Cosmos DB (a la fecha)

Container | Count | Descripción
---|---|---
`athlete_careers` | 13,661 | Temporadas de cada atleta
`athlete_transfers` | 2,714 | Transferencias de los 1,300 atletas
`athletes` | 1,300 | Atletas del Mundial 2026 (fichas básicas)
`athlete_trophies` | 1,113 | Trofeos ganados por atleta
`trends` | 638 | Tendencias de apuestas (per-game + Mundial + compet.)
`athlete_next_games` | 154 | Próximos partidos de atletas
`news` | 141 | Noticias del Mundial
`games` | 88 | Partidos del Mundial (48 grupos + 16avos + ...)
`game_h2h` | 88 | Historial cara a cara
`betting_tips` | 88 | Tips generados a partir de trends
`catalog` | 78 | Equipos, países, deportes, competidores
`athlete_chart_events` | 33 | Eventos de tiro (shot map)
`competition_history` | 22 | Ediciones históricas del Mundial (1930-2022)
`game_pre_stats` | 11 | Stats pre-partido
`predictions` | 7 | Predicciones de la comunidad
`tournament_stats` | 2 | Rankings de goleadores/xG/asistidores
`game_overviews` | 1 | Overviews de partidos (mayoría perdida por throttling)
`highlights` | 1 | Team of the week
`standings` | 0 | Tabla de posiciones (se pierde por throttling)
`brackets` | 0 | Estructura de llaves (se pierde por throttling)
`bet_followers` | 0 | Subscripciones de chat a tickets (vacío hasta que un user use `/follow`)
`game_snapshots` | 0 | Snapshots en vivo (los crea el poller cada 25s)
`odds_misc` | 0 | Outrights / bestodds
`fixtures` | 0 | Partidos futuros
`athlete_games` | 0 | Stats por partido de cada atleta

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
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Telegram    │    │  365scores   │    │  Azure       │
│  (polling)   │◄──►│  web API     │    │  Cosmos DB   │
└──────────────┘    └──────────────┘    └──────────────┘
       │                    ▲                   ▲
       ▼                    │                   │
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ messageHandler│───►│scoring logic │───►│ scores365Svc │
│  (router)    │    │  (Gemini)    │    │  (HTTP+gzip) │
└──────────────┘    └──────────────┘    └──────────────┘
       │                                        ▲
       ▼                                        │
┌──────────────┐                          ┌──────────────┐
│  Supabase   │                          │  cosmos-     │
│  PostgreSQL │                          │  bootstrap.js│
└──────────────┘                          └──────────────┘
```

### Componentes principales

- **`telegramBot.js`** — bot principal, long-polling de updates, dispatch a `messageHandler`
- **`bot.js`** — bot legacy de WhatsApp (no en producción)
- **`handlers/messageHandler.js`** — router principal: parsea intent con Gemini, dispatch a handler específico
- **`services/scores365Service.js`** — cliente HTTP para `webws.365scores.com` (gzip, retry, throttling)
- **`services/footballApi.js`** — cliente legacy para RapidAPI (Free Football Data)
- **`services/geminiService.js`** — wrapper Gemini 2.5 Flash (NLU + generación)
- **`services/liveGamesPoller.js`** — cron 25s que escribe snapshots de partidos en vivo a `game_snapshots`
- **`services/cosmosRefresh.js`** — cron 6h que refresca catálogo
- **`services/notifier.js`** — EventEmitter para eventos del juego (goles, tarjetas, etc.)
- **`services/telegramNotifier.js`** — listener que notifica a suscriptores
- **`services/betEvaluator.js`** — evalúa tickets contra estado del partido (9 BET_TYPES)
- **`services/intentParser.js`** — quick regex + Gemini fallback para entender lenguaje natural
- **`services/conversationContext.js`** — memoria por chat (in-memory + archivo `database/.conversation-context.json`)
- **`database/cosmos.js`** — wrapper de `@azure/cosmos` con helpers
- **`database/connection.js`** — pool de Supabase
- **`database/bootstrapState.js`** — state cache para re-runs rápidos del bootstrap
- **`scripts/cosmos-bootstrap.js`** — ingesta inicial (87 games, 1300 atletas, etc.)
- **`scripts/test-365-mundial.js`** — 73 checks E2E

---

## Datos en Cosmos DB

Ver [`docs/cosmos-data.md`](./cosmos-data.md) para detalle de cada container con samples.

### Top 5 containers por tamaño

1. `athlete_careers` (13,661 docs) — una fila por temporada-atleta
2. `athlete_transfers` (2,714 docs) — una fila por transferencia
3. `athletes` (1,300 docs) — perfil de cada atleta del Mundial 2026
4. `athlete_trophies` (1,113 docs) — un doc por atleta con sus trofeos agrupados
5. `trends` (638 docs) — tendencias de apuestas (per-game + Mundial)

### Containers notables que están vacíos

`game_snapshots`, `bet_followers`, `game_overviews`, `brackets`, `standings` están vacíos en este momento. **No significa que fallen las escrituras** — significa que:
- `game_snapshots` solo se llena cuando el `liveGamesPoller` corre (cada 25s) y hay partidos en vivo. En la última corrida de bootstrap, no se ejecutó este paso.
- `bet_followers` se llena cuando un usuario hace `/follow <ticketId>`. Nadie lo ha hecho aún en producción.
- `brackets`/`standings`/`game_overviews` son chicos (1-2 docs) y se pierden en throttling durante el bootstrap inicial con Strong consistency. Se regeneran con un re-run del bootstrap o del refresh.

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
COSMOS_ENDPOINT=https://botmundialista-cosmos.documents.azure.com:443/
COSMOS_DATABASE=scores365
COSMOS_KEY=<master-key>

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
SCORES365_COMPETITION_MUNDIAL=5930

# Notificaciones live
ENABLE_LIVE_NOTIFIER=false

# Server
ADMIN_PORT=3001
```

---

## Estructura del proyecto

```
BotMundialista/
├── bot.js                          # Bot legacy WhatsApp
├── telegramBot.js                   # Bot principal Telegram (long-polling)
├── package.json
├── .env / .env.example
├── .github/workflows/azure.yml      # CI/CD
├── AZURE_DEPLOY.md                  # Guía de deploy en Azure
├── README.md
│
├── database/
│   ├── connection.js                # Pool Supabase
│   ├── cosmos.js                    # Wrapper @azure/cosmos
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
├── scripts/                         # Scripts de admin
│   ├── cosmos-bootstrap.js          # Ingesta inicial 365scores → Cosmos
│   └── test-365-mundial.js         # 73 checks E2E
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
    ├── cosmos-data.md
    ├── api-365scores.md
    ├── bot-commands.md
    └── env-vars.md
```

---

## Cómo correr localmente

```bash
# 1. Instalar deps
npm install

# 2. Copiar y completar .env
cp .env.example .env
# Editar con: DB_*, COSMOS_*, GEMINI_*, TELEGRAM_*, RAPIDAPI_*

# 3. Probar conexión a Cosmos
node scripts/test-365-mundial.js

# 4. (Opcional) Bootstrap inicial de datos
node scripts/cosmos-bootstrap.js

# 5. Iniciar bot
npm start                # = node bot.js (WhatsApp legacy)
npm run start:telegram   # = node telegramBot.js (recomendado)
```

El test E2E (`scripts/test-365-mundial.js`) tarda ~70s y verifica 73 checks.

---

## Cómo deployar

CI/CD vía GitHub Actions (`.github/workflows/azure.yml`):

1. Push a `master`
2. GitHub Actions corre `npm ci` y `azure/webapps-deploy@v3` con el publish profile
3. La app se reinicia automáticamente

App Service Plan: `botmundialista-plan` (Free tier, East US)
Web App: `botmundialista.azurewebsites.net` (Linux, Node 22)
Cosmos DB: `botmundialista-cosmos` (Free tier, Central US, SQL API)
Managed Identity: Web App → `Cosmos DB Built-in Data Contributor`

Para restart manual:
```powershell
Restart-AzWebApp -ResourceGroupName 'botmundialista-rg' -Name 'botmundialista'
```

---

## Troubleshooting

### Bot crasheado con `Cannot find module 'X'`
- Verifica que el path del require es relativo a la ubicación del archivo
- `telegramBot.js` está en el root → paths deben empezar con `./` o ser absolutos

### Bot vivo pero no responde a mensajes
- Verifica `TELEGRAM_BOT_TOKEN` en App Service Configuration
- Revisa logs: `https://botmundialista.scm.azurewebsites.net/api/vfs/LogFiles/`

### Datos faltantes en Cosmos
- Re-corre el bootstrap: `node scripts/cosmos-bootstrap.js` (tarda ~15 min primera vez, ~10s re-runs con state)
- Containers chicos (brackets, standings, game_overviews) pueden perderse en throttling — el test los recupera automáticamente

### `userStorage is not defined`
- Bug conocido: si modificas `handlers/messageHandler.js` y olvidas `const userStorage = require('../utils/userStorage')` al top, explota. El test E2E lo detecta.

### Throttling en bootstrap
- Free tier 1000 RU/s compartido. Si el bootstrap escribe mucho, algunos docs se pierden.
- Solución: re-correr el bootstrap (state cache evita re-trabajo), o upgrade a autoscale 1000-10000 RU/s (~$5-50/mes)
