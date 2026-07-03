# Datos en Cosmos DB — Detalle por container

> Estado a julio 2026. Conteos y samples medidos en vivo.

## Resumen de cantidades

| Container | Count | TTL | Partition Key | Doc ID format | Origen de datos |
|---|---:|---|---|---|---|
| `catalog` | 78 | ∞ | `/entityType` | `sports-{id}`, `countries-{id}`, `competitions-{id}`, `competitors-{id}` | `api.getSports()`, `getCompetitionsFeatured()`, `getTopCompetitors()` |
| `games` | 88 | ∞ | `/competitionId` | `{gameId}` | `api.getGamesAllScores()` (filtro Mundial 5930) |
| `game_h2h` | 88 | ∞ | `/gameId` | `{gameId}` | `api.getGameH2H()` con `matchupId={homeId}-{awayId}-5930` |
| `game_overviews` | 1 | ∞ | `/gameId` | `{gameId}-{lastUpdateId}` | `api.getGameOverview()` |
| `game_pre_stats` | 11 | ∞ | `/gameId` | `{gameId}` | `api.getGamePreStats()` (solo para partidos `statusGroup=2` "Prog.") |
| `game_snapshots` | 0 | 90d | `/gameId` | `{gameId}-{lastUpdateId}` | `liveGamesPoller` cada 25s (solo en vivo) |
| `standings` | 0 | ∞ | `/competitionId` | `{competitionId}-s{stageNum}-se{seasonNum}` | `api.getStandings(5930, 1, 25)` |
| `tournament_stats` | 2 | ∞ | `/competitionId` | `{competitionId}-se{seasonNum}-{statKey}` | `api.getTournamentStats()` |
| `predictions` | 7 | 7d | `/gameId` | `{gameId}` | `api.getPredictions()` |
| `odds_lines` | 0 | 2h | `/gameId` | `{gameId}-{lastUpdateId}` | `api.getOddsLines()` (reemplazado por `odds_misc`) |
| `odds_misc` | 0 | 6h | `/kind` | `outrights-{competitionId}`, `bestodds-{token}` | `api.getOutrights()` (reemplaza `odds_outrights`) |
| `fixtures` | 0 | 7d | `/competitionId` | `{competitionId}-{token}` | `api.getFixtures()` |
| `brackets` | 0 | ∞ | `/competitionId` | `{competitionId}` | `api.getBrackets()` |
| `competition_history` | 22 | ∞ | `/competitionId` | `{competitionId}-se{seasonNum}` | `api.getCompetitionHistory(5930)` (1930-2022, falta 1942/1946 WWII) |
| `highlights` | 1 | ∞ | `/kind` | `tow-{competitionId}-se{seasonNum}-s{stageNum}-r{roundNum}` | `api.getTeamOfWeek(5930)` |
| `trends` | 638 | 30d | `/scope` | `game-{gameId}-{trendId}`, `comp-{competitionId}-{trendId}` | `api.getTrends('game'\|'comp', id)` |
| `news` | 141 | 30d | `/scope` | `sport-{id}`, `comp-{id}`, `game-{id}`, `athlete-{id}` | `api.getNews('sport'\|'comp'\|'game'\|'athlete', id)` |
| `betting_tips` | 88 | ∞ | `/gameId` | `{gameId}-composite` | Generado por `bootstrap.generateBettingTips()` |
| `athletes` | 1,300 | ∞ | `/id` | `{id}` | `api.getAthlete(id, fullDetails=true)` (32 squads × ~40 jugadores) |
| `athlete_careers` | 13,661 | ∞ | `/athleteId` | `{athleteId}-{seasonKey}` | `athletes[].careerStats.seasons` |
| `athlete_trophies` | 1,113 | ∞ | `/athleteId` | `{athleteId}` | `athletes[].trophies` agrupado |
| `athlete_transfers` | 2,714 | ∞ | `/athleteId` | `{athleteId}-{transferId}` | `athletes[].transfers[]` |
| `athlete_games` | 0 | ∞ | `/athleteId` | `{athleteId}-{gameId}` | `api.getAthleteGames()` (lazy) |
| `athlete_chart_events` | 33 | ∞ | `/athleteId` | `{athleteId}` | `api.getAthleteChartEvents()` (lazy) |
| `athlete_next_games` | 154 | 7d | `/athleteId` | `{athleteId}-{lastUpdateId}` | `api.getAthleteNextGame()` (lazy) |
| `bet_followers` | 0 | ∞ | `/ticketId` | `ticket-{ticketId}` | `handlers/followHandler.js` (cuando user usa `/follow`) |

**Total**: ~44,000 docs en ~70 MB.

---

## Samples por container

### `games` (88 docs, partition `/competitionId`)

```json
{
  "id": "4627866",
  "competitionId": 5930,
  "statusGroup": 4,
  "homeCompetitor": { "id": 5071, "name": "Colombia", "score": 0.0, ... },
  "awayCompetitor": { "id": 5028, "name": "Portugal", "score": 0.0, ... },
  "startTime": "2026-06-11T13:00:00-06:00",
  "stageName": "Fase de grupos",
  "_fetchedAt": "2026-07-02T..."
}
```

### `athletes` (1,300 docs, partition `/id`)

```json
{
  "id": "817",
  "name": "Cristiano Ronaldo",
  "shortName": "Ronaldo",
  "age": 41,
  "position": { "id": 4, "name": "Delantero" },
  "formationPosition": { "id": 12, "name": "Centro Delantero", "order": 15 },
  "nationalTeamId": 5028,
  "clubId": 7549,
  "nationalTeamStatsText": "Partidos(231) Goles (145)",
  "shortBio": "Cristiano Ronaldo (Portugal, 41) es un jugador de fútbol..."
}
```

### `game_h2h` (88 docs, partition `/gameId`)

```json
{
  "id": "4627866",
  "gameId": 4627866,
  "matchupId": "5071-5028-5930",
  "game": {
    "homeCompetitor": {
      "name": "Colombia",
      "lineups": { "members": [...27 jugadores...] },
      "recentGames": [...]
    },
    "awayCompetitor": {
      "name": "Portugal",
      "lineups": { "members": [...27 jugadores...] }
    },
    "members": [...54 jugadores totales...]
  }
}
```

### `competition_history` (22 ediciones, partition `/competitionId`)

```json
{
  "id": "5930-se16",
  "competitionId": 5930,
  "seasonNum": 16,
  "group": {
    "name": "Final",
    "participants": [{ "name": "Argentina" }, { "name": "Francia" }],
    "games": [{ "venue": { "name": "Lusail Stadium" } }]
  }
}
```

Ediciones guardadas: `[1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]` — todas desde 1930, faltan 1942/1946 (no se jugaron por WWII).

### `trends` (638 docs, partition `/scope`)

```json
{
  "id": "12165555",
  "scope": "competition",
  "competitionId": 5930,
  "text": "Ambos equipos marcaron - 7/9 Últimos partidos",
  "percentage": 0.7778,
  "betCTA": "Ambos equipos marcarán",
  "lineTypeId": 12,
  "competitorIds": [],
  "confidenceTrendIds": [12165562]
}
```

### `betting_tips` (88 docs, partition `/gameId`)

```json
{
  "id": "4627861-composite",
  "gameId": 4627861,
  "tipType": "composite",
  "confidenceScore": 0.981,
  "generatedAt": "2026-07-02T...",
  "topTrends": [/* top 5 trends para este partido */],
  "allTrends": [...]
}
```

### `news` (141 docs, partition `/scope`)

```json
{
  "id": "comp-186137307",
  "scope": "competition",
  "competitionId": 5930,
  "title": "Unai Simón rompió un récord histórico de los Mundiales: la mayor racha de imbatibilidad",
  "publishDate": "2026-07-02T17:58:51-06:00",
  "image": "https://www.365scores.com/es/news/...",
  "url": "https://www.365scores.com/es/news/...",
  "sourceId": 2389
}
```

### `tournament_stats` (2 docs, partition `/competitionId`)

```json
{
  "id": "5930-se25-athletesStats",
  "competitionId": 5930,
  "seasonNum": 25,
  "statKey": "athletesStats",
  "payload": { "0": { "entity": {...}, "value": "..." }, "1": {...} }
}
```

### `highlights` (1 doc, partition `/kind`)

```json
{
  "id": "tow-5930_25_1_3_5",
  "kind": "team_of_week",
  "competitionId": 5930,
  "seasonNum": 25,
  "stageNum": 1,
  "roundNum": 3,
  "teamOfWeek": {
    "key": "5930_25_1_3_5",
    "lineup": { "formation": "4-4-2", "members": [...] }
  }
}
```

### `game_pre_stats` (11 docs, partition `/gameId`)

Solo se llena para partidos `statusGroup=2` (Programado / próximo a jugar). Contiene pre-match stats (forma reciente, lesiones, etc.).

### `athlete_careers` (13,661 docs, partition `/athleteId`)

Una fila por temporada-atleta. Promedio ~10 carreras por atleta. Cada doc:
```json
{
  "id": "817-2026",
  "athleteId": 817,
  "seasonKey": "2026",
  "name": "25/26",
  "stats": { "categories": [...], "tables": [...] }
}
```

### `athlete_transfers` (2,714 docs, partition `/athleteId`)

Una fila por transferencia. Promedio ~2 por atleta. Cada doc:
```json
{
  "id": "817-256964",
  "athleteId": 817,
  "transferId": 256964,
  "date": "2023-01-01T...",
  "competitorId": 7549,
  "transferTitle": "Pase libre",
  "contractUntil": "30-06-2027 00:00"
}
```

### `athlete_trophies` (1,113 docs, partition `/athleteId`)

Un doc por atleta con trofeos agrupados:
```json
{
  "id": "817",
  "athleteId": 817,
  "categories": {
    "Club": {
      "type": 2, "name": "Club",
      "trophies": [
        { "competitionId": 572, "name": "UEFA Champions League", "count": 5 },
        { "competitionId": 11, "name": "LaLiga", "count": 2 },
        { "competitionId": 7, "name": "Premier League", "count": 3 }
      ]
    },
    "Internacional": {
      "type": 3, "name": "Internacional",
      "trophies": [
        { "competitionId": 6316, "name": "Eurocopa", "count": 1 }
      ]
    }
  }
}
```

### `predictions` (7 docs, partition `/gameId`)

Predicciones de la comunidad. Cada doc:
```json
{
  "id": "4749268",
  "gameId": 4749268,
  "promotedPredictions": {
    "predictions": [
      { "id": -245857042, "type": 1, "title": "¿Quién va a ganar?", "totalVotes": 18566, "options": [...] }
    ]
  },
  "_fetchedAt": "2026-07-02T..."
}
```

---

## Containers vacíos pero funcionales

| Container | Por qué vacío | Cuándo se llena |
|---|---|---|
| `game_snapshots` | Solo se llena con `liveGamesPoller` durante partidos en vivo | Cuando hay partidos activos y el poller corre |
| `bet_followers` | Solo se llena con `/follow` | Cuando un usuario sigue un ticket |
| `game_overviews` | Mayoría perdida por throttling en bootstrap | Re-correr bootstrap las regenera |
| `brackets` | Mismo | Mismo |
| `standings` | Mismo | Mismo |
| `odds_lines` | Reemplazado por `odds_misc` | Migrado |
| `odds_misc` | Sin uso activo aún | Cuando se implemente feature de odds |
| `fixtures` | Sin uso activo aún | Cuando se implemente feature de fixtures |
| `athlete_games` | Lazy load bajo demanda | Cuando se consulta un atleta |
| `athlete_chart_events` | Lazy load, 33 docs ya capturados | Cuando se consulta shot map |

---

## Cómo regenerar datos

```bash
# Re-correr bootstrap (usa state cache, rápido en re-runs)
node scripts/cosmos-bootstrap.js

# Si querés forzar re-ingesta completa
rm database/.scores365-state.json
node scripts/cosmos-bootstrap.js
```

Tiempos:
- Primera vez (state limpio): ~15-25 min
- Re-run con state: ~10-30 s (solo lo nuevo)
- Re-run completo (sin state): ~15-25 min

---

## Cómo consultar datos

```js
const cosmos = require('./database/cosmos');

// Todos los partidos finalizados del Mundial
const games = await cosmos.queryAll('games',
  "SELECT c.id, c.homeCompetitor, c.awayCompetitor, c.startTime FROM c WHERE c.competitionId = 5930 AND c.statusGroup = 4 ORDER BY c.startTime DESC");

// Un atleta específico
const cr7 = await cosmos.getById('athletes', '817', '817');

// Stats en vivo del último snapshot de un partido
const snap = await cosmos.queryOne('game_snapshots',
  { query: 'SELECT TOP 1 c.statistics FROM c WHERE c.gameId = @g ORDER BY c._ts DESC', parameters: [{ name: '@g', value: 4749268 }] });

// Tips para un partido
const tips = await cosmos.getById('betting_tips', '4749268-composite', '4749268');
```
