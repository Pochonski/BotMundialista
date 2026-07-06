# Comandos del bot

El bot soporta **dos formas de entrada**:
1. **Comandos explícitos** (`/comando args`) — parseados localmente, alta confianza
2. **Lenguaje natural** (Gemini) — el usuario puede escribir como habla

---

## Tabla maestra de comandos

| Comando | Aliases | Handler | NLU | Descripción |
|---|---|---|---|---|
| `/start` | `/inicio` | telegramBot | no | Mensaje de bienvenida + ayuda |
| `/help` | `/ayuda` | telegramBot | no | Lista de comandos |
| `/partidos` | `/hoy` | telegramBot → matchHandler | sí | Partidos de hoy |
| `/manana` | `/mañana`, `/tomorrow` | telegramBot | sí | Partidos de mañana |
| `/tabla` | `/clasificacion` | telegramBot → tableHandler | sí | Tabla de posiciones (de la liga que infiera o del Mundial) |
| `/mundial` | — | telegramBot → tableHandler | sí | Tabla del Mundial |
| `/goles` | — | telegramBot → statsHandler | sí | Goles de un equipo en últimos partidos |
| `/corners` | — | telegramBot → statsHandler | sí | Córners de un equipo |
| `/posesion` | `/posesión` | telegramBot → statsHandler | sí | Posesión promedio |
| `/tarjetas` | — | telegramBot → statsHandler | sí | Tarjetas |
| `/goleador` | — | telegramBot → statsHandler | sí | Goleador del equipo |
| `/racha` | — | telegramBot | sí | Racha W/L/D + forma reciente |
| `/yo` | `/perfil`, `/profile` | telegramBot → messageHandler | no | Perfil del usuario (alias, equipos seguidos) |
| `/cambiarnombre` | `/cambiarusuario` | telegramBot | no | Cambiar alias |
| `/mialias` | — | telegramBot | no | Ver mi alias actual |
| `/reset` | — | telegramBot | no | Resetear mis datos |
| `/follow <id>` | — | telegramBot → followHandler | sí | Seguir un ticket |
| `/unfollow <id>` | `/dejarseguir` | telegramBot → followHandler | sí | Dejar de seguir |
| `/misapuestas` | `/siguiendo` | telegramBot → followHandler | sí | Ver tickets que sigo |
| `/live` | `/envivo` | telegramBot → mundialista365 | sí | Partidos en vivo ahora (365scores) |
| `/tip <eq1> vs <eq2>` | — | telegramBot → mundialista365 | sí | Tip con confianza (betting_tips + trends) |
| `/tendencias` | `/trends` | telegramBot → mundialista365 | sí | Top 10 tendencias del Mundial |
| `/tendencias [eq1] vs [eq2]` | — | telegramBot → mundialista365 | sí | Tendencias de un partido (resuelve por nombres) |
| `/predicciones <gameId>` | `/prediccion` | telegramBot → mundialista365 | sí | Predicciones de la comunidad |
| `/stats-vivo <gameId>` | `/statsvivo`, `/live-stats` | telegramBot → mundialista365 | sí | Stats del último snapshot (game_snapshots) |
| `/alineacion <gameId>` | `/lineup`, `/titulares` | telegramBot → mundialista365 | sí | Titulares y formación (game_overviews) |
| `/previa <gameId>` | `/preview` | telegramBot → mundialista365 | sí | Pre-match stats (game_pre_stats) |
| `/h2h <gameId>` | `/historial-partido` | telegramBot → mundialista365 | sí | Historial entre los equipos (game_h2h) |
| `/noticias` | — | telegramBot → mundialistaStats | sí | Últimas 10 noticias del Mundial |
| `/noticias <equipo>` | — | telegramBot → mundialistaStats | sí | Noticias de los partidos de un equipo |
| `/equipoideal` | `/idealtm`, `/tow` | telegramBot → mundialistaStats | sí | Team of the Week con formación y ratings |
| `/bracket` | `/llaves` | telegramBot → mundialistaStats | sí | Llaves eliminatorias del Mundial |
| `/bracket grupos` | — | telegramBot → mundialistaStats | sí | Fase de grupos (12 grupos) |
| `/historial` | — | telegramBot → mundialistaStats | sí | Campeones 1930–2022 |
| `/historial <año>` | — | telegramBot → mundialistaStats | sí | Detalle de la final de ese año |
| `/historial <equipo>` | — | telegramBot → mundialistaStats | sí | Ediciones en que participó ese equipo |
| `/goleadores` | `/rankinggoleador`, `/topgoleador` | telegramBot → mundialistaStats | sí | Ranking de goleadores del Mundial |

Además:
- **Mensaje libre (no comando)** → pasa por `messageHandler` que usa Gemini para detectar intent
- **Comando desconocido `/X`** → si tiene argumentos, se reenvía a messageHandler con el prefijo `/` removido
- **Imagen con apuesta** → `betImageHandler` + `betParserService` (OCR con Tesseract + parser)

---

## Lenguaje natural (Gemini)

El bot entiende frases coloquiales en español. Ejemplos de intents que detecta:

### INTENTS del `geminiService.js` (legacy)

| Intent | Usuario dice | Bot hace |
|---|---|---|
| `SALUDO` | "hola", "buenas", "qué tal" | Saludo amigable |
| `HELP` | "qué puedes hacer", "ayuda" | Lista de comandos |
| `PARTIDOS_HOY` | "qué hay hoy", "partidos de hoy" | Lista de partidos del día |
| `PARTIDO_FECHA` | "qué juega Brasil mañana", "partidos del viernes" | Partidos de una fecha futura |
| `RESULTADO` | "cómo le fue a Brasil", "resultado del último partido de Argentina" | Último resultado del equipo |
| `RESULTADO_VS` | "Brasil vs Argentina", "última vez México vs Argentina" | H2H histórico |
| `INFO_EQUIPO` | "quién es Scaloneta", "info de Alemania" | Descripción del equipo |
| `ESTADISTICA` | "stats de Brasil", "cuántos goles hizo Brasil" | Stats del equipo |
| `TABLA` | "cómo va la premier", "tabla de la liga española" | Tabla de la liga |
| `TABLA_MUNDIAL` | "tabla del mundial" | Tabla general del Mundial |
| `TABLA_GRUPO` | "tabla del grupo A", "cómo va el grupo C" | Tabla del grupo específico |
| `ANALISIS` | "analiza el próximo Brasil vs Francia", "pronóstico" | Análisis pre-partido |
| `SEGUIR_EQUIPO` | "quiero seguir a México", "notifícame de X" | Agrega equipo a seguimiento |
| `DEJAR_SEGUIR` | "ya no quiero seguir a Chile", "deja de seguir a X" | Quita equipo |
| `MIS_EQUIPOS` | "a quién sigo", "mis equipos" | Lista de equipos seguidos |
| `UNKNOWN` | "qué cracks", insultos alegres, etc. | Conversación casual |

### INTENTS del `intentParser.js` (nuevo)

| Intent | Usuario dice | Bot hace |
|---|---|---|
| `follow` | "sígueme el 555", "avísame del 123" | Llama `followHandler.followTicket()` |
| `unfollow` | "deja de seguir el 555" | Llama `followHandler.unfollowTicket()` |
| `list_followed` | "qué tickets sigo", "qué sigo" | Llama `followHandler.listFollowed()` |
| `change_mode` | "cambia el 555 a solo cuando gane" | Llama `followHandler.changeMode()` |
| `query_stats` | "stats de Portugal Croacia" | (futuro) stats del partido |
| `query_live` | "partidos en vivo" | (futuro) lista partidos en vivo |
| `chat` | (todo lo demás) | Deja que messageHandler decida |

---

## Flujo de un mensaje

```
👤 "sígueme el 555 solo cuando gane"
                    │
                    ▼
        ┌───────────────────────┐
        │     telegramBot.js     │  polling → /getUpdates
        │     onMessage()        │
        └───────────┬───────────┘
                    │ text.startsWith('/') = false (no es comando)
                    ▼
        ┌───────────────────────┐
        │  conversationalHandler│  quickParse: no match
        │  .handleMessage()     │  → Gemini: intent=follow, ticketId=555, mode=outcome_only
        └───────────┬───────────┘
                    │ confidence ≥ 0.6
                    ▼
        ┌───────────────────────┐
        │  followHandler        │  getTicketInfo(555) → ticket del user
        │  .handleIntentFollow() │  upsert bet_followers mode=outcome_only
        └───────────┬───────────┘
                    │
                    ▼
        🤖 "✅ Listo, sigo tu ticket #555 (Portugal vs Croacia). Te aviso solo cuando sepas si ganaste."
```

---

## Flujo cuando ocurre un evento (live poller)

```
⏰ liveGamesPoller cada 25s
                    │
                    ▼
        ┌───────────────────────┐
        │  api.getGameStats()   │  con lastUpdateId
        │  calcula diff        │  goles: 0→1, tarj: 0→0
        └───────────┬───────────┘
                    │
                    ▼
        notifier.emit('goal:scored', { gameId, team: 'Portugal', minute: '32' })
                    │
                    ▼
        ┌───────────────────────┐
        │  telegramNotifier    │  notifier.on('event:any', ...)
        │  .notifyChats(event) │  → findAffectedChats(event)
        └───────────┬───────────┘
                    │ betEvaluator busca bet_followers WHERE gameId=event.gameId
                    ▼
        ┌───────────────────────┐
        │  betEvaluator         │  por cada chatId suscrito:
        │  .findAffectedChats() │  si mode='all_events' → notifica
        └───────────┬───────────┘   si mode='outcome_only' → evalúa, notifica solo si cambió
                    │
                    ▼
        🤖 Al chat: "⚽ Portugal (min 32')
              🎫 Ticket #555 (Portugal vs Croacia)
              📊 Marcador: 1-0
              🎯 Ganaste: ambos equipos marcan (goles 1-0)
              ⏳ Pendiente: total goles (1)"
```

---

## Comandos `/` detallados

### `/start`, `/inicio`
Mensaje de bienvenida + lista de ejemplos de uso.

### `/partidos`, `/hoy`
Llama `messageHandler` con `body: "partidos de hoy"`. Este detecta el equipo y fecha. Si no hay equipos específicos, usa el Mundial.

### `/manana`, `/mañana`, `/tomorrow`
Idem pero con "mañana" en el body. Si Gemini detecta una fecha específica, usa esa.

### `/tabla [equipo]`, `/clasificacion`
Si no se especifica liga, muestra la tabla del Mundial. Si se especifica equipo, muestra la tabla del grupo (si es selección del Mundial) o la liga (si es club).

### `/mundial`
Muestra la tabla general del Mundial 2026 (todos los grupos en formato compacto).

### `/goles <equipo>`
Muestra los últimos goles anotados/recibidos por el equipo en partidos recientes.

### `/posesion <equipo>` / `/posesión <equipo>`
Muestra la posesión promedio del equipo en sus últimos partidos.

### `/corners <equipo>`
Muestra córners a favor y en contra.

### `/tarjetas <equipo>`
Muestra tarjetas amarillas y rojas.

### `/goleador <equipo>`
Muestra el ranking de goleadores del equipo en el Mundial.

### `/racha <equipo>`
Muestra últimos 5-10 resultados (W/L/D) y forma reciente (ej. WWWDL).

### `/yo`, `/perfil`, `/profile`
Muestra:
- Tu alias configurado
- Equipos que sigues
- Tickets de apuesta que sigues (si está implementado)

### `/cambiarnombre <nuevo_alias>`, `/cambiarusuario <nuevo>`
Cambia el alias. Límite: 30 caracteres.

### `/mialias`
Muestra el alias actual.

### `/reset`
Resetea todos los datos del usuario (alias, equipos seguidos, tickets seguidos). Pide confirmación.

### `/follow <ticket_id> [all|outcome]`
Suscribe al usuario a un ticket de apuesta. Valida que el ticket existe y pertenece al usuario.

- `/follow 555` → modo `all_events` (default): notifica con cada gol, tarjeta, etc.
- `/follow 555 outcome` → modo `outcome_only`: notifica solo cuando sepas si ganaste o perdiste
- `/follow 555 all` → explícito `all_events`

### `/unfollow <ticket_id>`, `/dejarseguir <ticket_id>`
Desuscribe del ticket.

### `/misapuestas`, `/siguiendo`
Lista los tickets que el usuario sigue actualmente, con su modo y estado.

---

## Ejemplos de conversación

```
👤: hola
🤖: ¡Hola! Soy BotMundialista 🏆. Pregúntame sobre el Mundial 2026, equipos o apuestas. Ej: "cómo le fue a Brasil", "tabla del grupo A", o "sígueme el ticket 555".

👤: tabla grupo c
🤖: 🏆 Grupo C - Mundial 2026:
     1. 🇦🇷 Argentina   7 pts (3-1)
     2. 🇧🇷 Brasil      4 pts
     3. 🇲🇽 México      4 pts
     4. 🇸🇪 Suecia      1 pt
     ...

👤: avísame del ticket 123 solo cuando gane
🤖: ✅ Listo, sigo tu ticket #123. Te aviso solo cuando sepas si ganaste o perdiste.

👤: sigue el 555
🤖: ✅ Sigo el ticket #555 (Portugal vs Croacia). Modo: todos los eventos (goles, tarjetas, etc.).

👤: deja de seguirlo
🤖: ❓ ¿Qué ticket querés dejar de seguir? Decime el número.

👤: 555
🤖: ✅ Dejé de seguir el ticket #555 para ti.
```

---

## Configuración del modo de notificaciones

| Modo | Significado | Costo de RU |
|---|---|---|
| `all_events` (default) | Cada gol, tarjeta, cambio importante | ~15 RU por evento × N chats |
| `outcome_only` | Solo cuando el ticket gana/pierde/se decide | ~30 RU por evento (evalúa ticket) |

Para cambiar entre modos:
```
/follow 555 outcome      # Cambiar a outcome_only
/follow 555 all          # Volver a all_events
```

---

## Estados del usuario

El bot mantiene un mapa en memoria `userStates` con el estado de conversación:
- `ESPERANDO_ALIAS`: cuando el usuario ejecutó `/cambiarnombre` sin args
- `ESPERANDO_RESET`: cuando ejecutó `/reset`
- `MODO_DEMO`: cuando no hay DB

Estos estados se limpian automáticamente después de 5 minutos de inactividad.

---

## Comandos basados en DB 365scores (Cosmos)

Estos comandos leen **exclusivamente** del container de Cosmos (`betting_tips`, `trends`, `predictions`, `games`, `game_snapshots`, `game_overviews`, `game_pre_stats`, `game_h2h`). No llaman a la API de 365scores en tiempo de respuesta; los datos se actualizan vía `cosmosRefresh.js` cada 6h y vía bootstrap.

### `/live`, `/envivo`

Lista partidos del Mundial con `statusGroup=1` (En vivo). Por cada partido muestra marcador actual, status y gameId. Los gameIds se pueden usar directo con `/stats-vivo`, `/alineacion`, `/previa`, `/h2h`.

### `/tip [eq1] vs [eq2]`

Resuelve el partido más próximo (statusGroup 1 o 2) o el último finalizado entre los dos equipos en el Mundial, y devuelve el **tip compuesto** desde `betting_tips`:

- `confidenceScore` (0–1, mostrado como %)
- Top 5 trends con `percentage` y `betCTA` (ej: "Ambos equipos marcarán" al 78%)
- Emoji de fuerza: 🔥 ≥75% · 📈 ≥60% · ➖ ≥50% · 📉 <50%

Si el partido no se resuelve, sugiere usar `/live` para encontrarlo o mostrar el top Mundial con `/tendencias`.

### `/tendencias`, `/trends`

Dos modos:

- `/tendencias` (sin args) → Top 10 tendencias del Mundial desde `trends` (scope=`competition`, partition `/competitionId=5930`).
- `/tendencias [eq1] vs [eq2]` → resuelve el partido por nombres y devuelve sus tendencias desde `trends` (scope=`game`). Usa el mismo algoritmo de ranking que `/tip` (vivo → próximo → finalizado).

_No hay modo numérico: para stats en vivo de un partido, usá nombres con /tip, /stats-vivo, /alineacion, etc._

### `/predicciones <gameId>`, `/prediccion <gameId>`

### `/predicciones <gameId>`, `/prediccion <gameId>`

Predicciones de la comunidad desde `predictions` (container, partition `/gameId`). Muestra cada pregunta con total de votos y porcentaje por opción.

### `/stats-vivo <gameId>`, `/statsvivo`, `/live-stats`

Lee el último doc de `game_snapshots` para ese gameId y devuelve una tabla con: goles, córners, tiros, tiros al arco, tarjetas amarillas/rojas, posesión %, pases totales, faltas. Si no hay snapshot (partido aún no empezó o poller no corrió), devuelve un mensaje informativo.

### `/alineacion <gameId>`, `/lineup`, `/titulares`

Lee de `game_overviews` (con fallback a `game_h2h`) y devuelve titulares agrupados por posición (Portero, Defensa, Mediocampista, Delantero) más formación (si está disponible).

### `/previa <gameId>`, `/preview`

Lee de `game_pre_stats`. Solo disponible para partidos `statusGroup=2` (programados). Devuelve métricas pre-partido agrupadas por categoría (forma reciente, etc.).

### `/h2h <gameId>`, `/historial-partido`

Lee de `game_h2h`. Devuelve últimos partidos de cada equipo y enfrentamientos directos históricos.

---

## Comandos basados en DB 365scores — Estadísticas & Contenido (Tier 1)

Estos comandos leen de los containers `news`, `highlights`, `brackets`, `competition_history`, y `tournament_stats`. No llaman a la API de 365scores en tiempo de respuesta; los datos se actualizan vía `cosmosRefresh.js` (cada 6h) y bootstrap.

### `/noticias [equipo]`, `/noticias <equipo>`

- **Sin args**: Query `news` con `scope='comp'` y `competitionId=5930`, ordenado por `publishDate DESC`, limit 10. Muestra título, fecha y URL de cada noticia.
- **Con equipo**: Busca todos los partidos del equipo en el Mundial via `matchSearch.findGamesByCompetitorName()`, luego filtra `news` con `scope='game'` por esos gameIds. Si no hay noticias de partidos, cae a noticias de competición que mencionen al equipo en el título.
- **Cómo se genera**: Las noticias se refrescan cada 6h. Si el container está vacío, el bootstrap genera las primeras (141 docs aprox).

### `/equipoideal`, `/idealtm`, `/tow`

- Lee el doc más reciente del container `highlights` con `kind='team_of_week'`.
- Muestra formación (ej: 4-4-2) y jugadores agrupados por posición (Portero, Defensa, Mediocampista, Delantero).
- Cada jugador muestra: nombre corto, equipo (si disponible) y rating ⭐.
- **Si no hay datos**: sugiere re-correr el bootstrap.

### `/bracket [grupos|eliminatorias|todo]`, `/llaves`

- Lee el doc `5930` del container `brackets` con partition `/competitionId`.
- **Sin args** (default = `eliminatorias`): Muestra solo las rondas eliminatorias (16avos → 8vos → 4tos → semis → final). Cada ronda lista los cruces con marcador si está disponible.
- **`/bracket grupos`**: Muestra la fase de grupos (12 grupos). Cada grupo lista los equipos participantes separados por ·.
- **`/bracket todo`**: Muestra ambas fases (grupos + eliminatorias) en un solo mensaje.
- **Si `brackets` está vacío** (probable): Muestra mensaje amigable + sugerencia de `/mundial` o `/grupo X` + instrucción de bootstrap.
- Las llaves se generan durante el bootstrap. Si están vacías, puede deberse a que el torneo no tiene estructura de knockout aún.

### `/historial [año|equipo]`

- Lee del container `competition_history` con `competitionId=5930` (22 ediciones, 1930–2022, faltan 1942/1946 WWII).
- **Sin args**: Lista todas las ediciones en orden descendente mostrando año, campeón (🥇), subcampeón y sede.
- **Con año** (`/historial 2022`): Muestra detalle de la final: sede (estadio), campeón 🥇, subcampeón 🥈.
- **Con equipo** (`/historial brasil`): Filtra las 22 ediciones por participantes y muestra en cuáles el equipo fue campeón (🥇), subcampeón (🥈) o finalista (🎗️).
- **Mapeo seasonNum → año**: Tabla interna en `mundialistaStatsHandler.js` (`SEASON_TO_YEAR`). Los seasonNum saltan de 3→6 por las ediciones no jugadas en 1942/1946.

### `/goleadores`, `/rankinggoleador`, `/topgoleador`

- Lee el doc `5930-se25-athletesStats` del container `tournament_stats` (partition `/competitionId`).
- Procesa el campo `payload` (objeto con keys `0..N`, cada uno con un `entity` que tiene `name`, `teamName`, `value`).
- Ordena por `value` (goles) descendente, muestra top 10 con 🥇🥈🥉 para el podio.
- **Si el doc no existe**: sugiere correr el bootstrap.
- **Nota**: El doc `athletesStats` contiene 16 atletas. Si el payload tiene estructura no estándar, se intenta parsear de forma flexible.

### Encontrar gameIds

Tres formas de obtener un gameId:

1. `/live` → te los lista directo
2. `/tip brasil vs argentina` → resuelve el partido más probable (e.g. mirando el tip devuelto)
3. Cualquier query Cosmos directa (DBA only): `SELECT c.id FROM c WHERE c.competitionId = 5930 AND c.statusGroup = 2`

> Nota: `/tendencias` solo acepta nombres de equipos. Para tendencias por gameId, primero hay que identificar el partido vía `/live` o `/tip`.
