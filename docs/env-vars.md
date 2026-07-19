# Variables de entorno

El bot lee las variables de `.env`.

## Categorías

### 1. Bases de datos

#### PostgreSQL (DB principal)
| Var | Ejemplo | Notas |
|---|---|---|
| `DB_HOST` | `aws-1-us-east-1.pooler.supabase.com` | FQDN del servidor PostgreSQL |
| `DB_PORT` | `6543` | Puerto |
| `DB_USER` | `postgres.<ref>` | |
| `DB_PASSWORD` | `xxxxx` | |
| `DB_NAME` | `postgres` | Nombre de la base de datos |
| `DB_SSL` | `true` | |

### 2. APIs externas

| Var | Servicio | Notas |
|---|---|---|
| `RAPIDAPI_KEY` | RapidAPI - Free Football Data | Legacy, no usado activamente |
| `RAPIDAPI_HOST` | `free-api-live-football-data.p.rapidapi.com` | Legacy |
| `GEMINI_API_KEY` | Google Gemini 2.5 Flash | Para NLU y generación de respuestas |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Default |
| `TELEGRAM_BOT_TOKEN` | Telegram BotFather | Para el bot de Telegram |

### 3. 365scores (web API)

| Var | Default | Notas |
|---|---|---|
| `SCORES365_TIMEZONE` | `America/Costa_Rica` | Zona horaria del usuario |
| `SCORES365_USER_COUNTRY` | `153` | ID de Costa Rica en 365scores |
| `SCORES365_LANG` | `14` | 14 = español |
| `SCORES365_APP_TYPE` | `5` | 5 = web |
| `SCORES365_POLL_MS` | `25000` | Cada cuánto el `liveGamesPoller` hace requests |
| `PRIMARY_COMPETITION_ID` | `5930` | ID de la competencia principal en 365scores |
| `SCORES365_MIN_INTERVAL_MS` | `120` | Throttle mínimo entre llamadas HTTP |

### 4. Notificaciones live

| Var | Default | Notas |
|---|---|---|
| `ENABLE_LIVE_NOTIFIER` | `false` | Si `true`, el `telegramBot.js` registra el listener del notifier. **Default off** porque requiere partidos en vivo y suscriptores activos. |

### 5. Server y misc

| Var | Default | Notas |
|---|---|---|
| `PORT` | `8080` | Puerto HTTP del health server |
| `ADMIN_PORT` | `3001` | Puerto del panel admin |
| `WA_SESSION_DIR` | `.wwebjs_auth` | Directorio de sesión de WhatsApp Web |

---

## `.env.example` completo

```bash
# WhatsApp Session
WA_SESSION_DIR=.wwebjs_auth

# Database PostgreSQL
DB_HOST=aws-1-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.<ref>
DB_PASSWORD=your-password
DB_NAME=postgres
DB_SSL=true

# Football API (Free API Live Football Data - RapidAPI) - legacy
RAPIDAPI_KEY=your-rapidapi-key
RAPIDAPI_HOST=free-api-live-football-data.p.rapidapi.com

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Gemini AI (Free tier - 1,500 requests/day)
GEMINI_API_KEY=your-gemini-key

# Server
ADMIN_PORT=3001
PORT=8080

# 365scores (webws.365scores.com)
SCORES365_TIMEZONE=America/Costa_Rica
SCORES365_USER_COUNTRY=153
SCORES365_LANG=14
SCORES365_APP_TYPE=5
SCORES365_POLL_MS=25000
PRIMARY_COMPETITION_ID=5930
SCORES365_MIN_INTERVAL_MS=120

# Notificaciones live (goles, tarjetas, etc.)
ENABLE_LIVE_NOTIFIER=false
```

---

## Variables usadas en runtime

| Componente | Variables |
|---|---|
| `telegramBot.js` | TELEGRAM_BOT_TOKEN, SCORES365_*, GEMINI_API_KEY, DB_* |
| `bot.js` (WhatsApp) | DB_*, SCORES365_*, GEMINI_API_KEY |
| `services/scores365Service.js` | SCORES365_* |
| `services/footballApi.js` | RAPIDAPI_* |
| `services/geminiService.js` | GEMINI_API_KEY, GEMINI_MODEL |
| `services/liveGamesPoller.js` | SCORES365_* |
| `services/cosmosRefresh.js` | SCORES365_* |
| `services/telegramNotifier.js` | ENABLE_LIVE_NOTIFIER (gate) |
| `services/betEvaluator.js` | DB_* |
| `scripts/cosmos-bootstrap.js` | SCORES365_* |
| `scripts/test-365-mundial.js` | SCORES365_* |

---

## Costes estimados

| Servicio | Tier | Coste/mes |
|---|---|---|
| Supabase PostgreSQL | Free | $0 |
| Gemini 2.5 Flash | Free | $0 (~1,500 req/día) |
| 365scores (web) | — | $0 (público) |
| **TOTAL** | | **$0/mes** |
