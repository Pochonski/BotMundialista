# Fase 5 — Backend: Cosmos enrichment + nuevos endpoints de historia

## Objetivo

Enriquecer los datos históricos almacenados en Cosmos DB y exponerlos a través de nuevos endpoints de API. Actualmente el bootstrap guarda el `row` completo de la API de 365scores (`...row`), pero el controlador `getHistory()` en su fallback guarda solo un subconjunto, y la respuesta final filtra la mayoría de los campos disponibles.

## Entregables

### 5.1 Backfill de datos históricos en Cosmos

- [ ] **Corregir fallback en `getHistory()`** — Reemplazar el mapeo manual (solo `hasTable`, `hasGroup`, `group`) con el spread completo del row, alineándose con lo que ya hace `cosmos-bootstrap.js`:

```diff
- const doc = {
-   id: `${MUNDIAL_ID}-se${r.seasonNum}`,
-   competitionId: MUNDIAL_ID,
-   seasonNum: r.seasonNum,
-   hasTable: r.hasTable,
-   hasGroup: r.hasGroup,
-   group: r.group || null,
-   _fetchedAt: new Date().toISOString(),
- };
+ const doc = {
+   id: `${MUNDIAL_ID}-se${r.seasonNum}`,
+   competitionId: MUNDIAL_ID,
+   seasonNum: r.seasonNum,
+   ...r,
+   _fetchedAt: new Date().toISOString(),
+ };
```

- [ ] **Script de backfill** — `scripts/backfill-history.js`:
  - Lee todos los documentos de `competition_history` desde Cosmos
  - Para cada doc con menos de N campos (detecta si falta `title`, `entityId`, etc.), refetch desde API de 365scores y upsert con el row completo
  - Log de cuántos docs se actualizaron

### 5.2 Enriquecer `GET /api/football/history`

- [ ] **Ampliar entidad de respuesta** — El endpoint actual retorna:

```json
{
  "seasonNum": 22,
  "year": 2022,
  "champion": { "name": "Argentina", "competitorId": 2378, "badgeUrl": "..." },
  "runnerUp": { "name": "Francia", "competitorId": 5061, "badgeUrl": "..." },
  "venue": "Lusail Stadium",
  "group": { "name": "", "participants": [...] }
}
```

Debe retornar **además**:

| Campo | Tipo | Fuente | Descripción |
|-------|------|--------|-------------|
| `entityId` | `number` | `row.entityId` | ID del competidor campeón |
| `host` | `string` | `row.title` (parseado) | País anfitrión (extraído del title "Suiza 1954") |
| `title` | `string` | `row.title` | Título completo (ej. "Suiza 1954") |
| `secondaryTitle` | `string` | `row.secondaryTitle` | Resultado formateado (ej. "Hungría 3-2") |
| `games` | `HistoricalGame[]` | `row.group.games` | Todos los partidos disponibles de la edición |
| `hasTable` | `boolean` | `row.hasTable` | Si tiene tabla de posiciones |
| `matchId` | `number` | `row.group.games[0]?.gameId` | ID del partido final (para enlazar a detalle) |
| `homeScore` | `number` | `row.group.games[0]?.game.homeCompetitor.score` | Goles del campeón |
| `awayScore` | `number` | `row.group.games[0]?.game.awayCompetitor.score` | Goles del subcampeón |
| `homeCompetitorId` | `number` | `row.group.games[0]?.game.homeCompetitor.id` | ID del local |
| `awayCompetitorId` | `number` | `row.group.games[0]?.game.awayCompetitor.id` | ID del visitante |

- [ ] **Invertir lógica de `isFinal`** — Actualmente detecta la final con `d.group?.name === 'Final'`, pero en los datos reales el `group.name` suele ser `""`. Detectar por: el `group` solo tiene 1 game y es el último `seasonNum` disponible, o cambia a detectar por `group.games.length === 1`.

- [ ] **Helper `parseHistoryDoc(doc, teamMap)`** — Extraer la lógica de mapeo a un helper reutilizable para usarlo en los nuevos endpoints.

### 5.3 Nuevos endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /history/stats` | GET | Estadísticas agregadas del historial (equipo con más títulos, más finales, etc.) |
| `GET /history/:seasonNum` | GET | Detalle completo de una edición específica |
| `GET /history/:seasonNum/match-stats` | GET | Estadísticas del partido final de esa edición |
| `GET /history/:seasonNum/match-overview` | GET | Alineaciones y detalles del partido final |

#### `GET /history/stats`

Retorna estadísticas agregadas de todas las ediciones:

```json
{
  "totalEditions": 22,
  "mostTitles": { "team": "Brasil", "count": 5, "competitorId": 2379 },
  "mostFinals": { "team": "Alemania", "count": 8, "competitorId": 2372 },
  "hosts": [
    { "country": "Qatar", "year": 2022 },
    { "country": "Rusia", "year": 2018 }
  ],
  "champions": [
    { "year": 2022, "name": "Argentina", "competitorId": 2378 },
    ...
  ],
  "repeatingChampions": ["Italia (1934, 1938)"]
}
```

#### `GET /history/:seasonNum`

- **Parámetro**: `seasonNum` (1-22, mapeable a año)
- **Lógica**: 
  1. Lee doc de `competition_history` por ID `${MUNDIAL_ID}-se${seasonNum}`
  2. Si no existe en Cosmos, hace fallback a `scores365.getCompetitionHistory()` y busca el row con ese `seasonNum`
  3. Enriquecer con `teamMap`
  4. Si el doc tiene `gameId`, fetch opcional del game overview para obtener lineups
- **Respuesta**:

```json
{
  "seasonNum": 22,
  "year": 2022,
  "host": "Qatar",
  "champion": { "name": "Argentina", "badgeUrl": "...", "competitorId": 2378 },
  "runnerUp": { "name": "Francia", "badgeUrl": "...", "competitorId": 5061 },
  "homeScore": 3,
  "awayScore": 3,
  "homePenaltyScore": 4,
  "awayPenaltyScore": 2,
  "matchId": 3707409,
  "venue": "Lusail Stadium",
  "venueShortName": "lusail-stadium",
  "startTime": "2022-12-18T18:00:00+03:00",
  "participants": [ { "name": "Argentina", "badgeUrl": "..." }, ... ],
  "extraTime": true,
  "penalties": true
}
```

#### `GET /history/:seasonNum/match-stats`

- **Lógica**:
  1. Obtiene el doc de historia para ese `seasonNum`
  2. Extrae el `gameId` del partido final
  3. Llama a `scores365.getGameStats(gameId)` para obtener estadísticas
  4. Cachea en Cosmos container `history_match_stats` con TTL 90d
- **Respuesta**: Las estadísticas del partido (posesión, tiros, corners, tarjetas, etc.)

#### `GET /history/:seasonNum/match-overview`

- **Lógica**:
  1. Obtiene el doc de historia para ese `seasonNum`
  2. Extrae el `gameId` y `matchupId` del partido final
  3. Llama a `scores365.getGameOverview(gameId, matchupId)` para obtener lineups y alineaciones
  4. Cachea en Cosmos container `history_match_overviews` con TTL 90d
- **Respuesta**: Alineaciones titulares, formación, suplentes, entrenadores

### 5.4 Nuevas rutas

En `dashboard/server/routes/football.js` agregar:

```js
router.get('/history/stats', controller.getHistoryStats);
router.get('/history/:seasonNum', controller.getHistoryBySeason);
router.get('/history/:seasonNum/match-stats', controller.getHistoryMatchStats);
router.get('/history/:seasonNum/match-overview', controller.getHistoryMatchOverview);
```

### 5.5 Nuevo contenedor Cosmos

| Container | Partition Key | TTL | Propósito |
|-----------|---------------|-----|-----------|
| `history_match_stats` | `/seasonNum` | 90 días | Cache de estadísticas de partidos históricos |
| `history_match_overviews` | `/seasonNum` | 90 días | Cache de lineups/alineaciones históricas |

Agregar a `database/cosmos-schema.json`

## Tareas detalladas

```
5.1 Backfill
    → Modificar getHistory() fallback para guardar row completo
    → Crear scripts/backfill-history.js
    → Ejecutar script para actualizar ~22 docs existentes

5.2 Enriquecer GET /history
    → Extraer parseHistoryDoc() helper
    → Agregar entityId, title, secondaryTitle, host, games, scores
    → Corregir lógica de detección de final

5.3 Nuevos endpoints
    → Implementar getHistoryStats()
    → Implementar getHistoryBySeason()
    → Implementar getHistoryMatchStats() con cache-aside
    → Implementar getHistoryMatchOverview() con cache-aside
    → Agregar helpers para fetch y cache

5.4 Rutas
    → Registrar 4 nuevas rutas en football.js

5.5 Cosmos containers
    → Agregar history_match_stats y history_match_overviews al schema
    → Crear containers al deploy
```

## Dependencias

- `services/scores365Service.js` — ya tiene `getGameStats()` y `getGameOverview()`
- `database/cosmos.js` — ya tiene `getOrFetch()` para cache-aside
- `server/controllers/footballController.js` — ya tiene helpers `enrichGame()`, `getCompetitorMap()`

## Criterios de aceptación

- [ ] `GET /api/football/history` retorna todos los campos enriquecidos (title, secondaryTitle, scores, matchId, etc.)
- [ ] `GET /api/football/history/stats` retorna estadísticas agregadas correctas
- [ ] `GET /api/football/history/22` retorna detalle de 2022 con scores, venues, participantes
- [ ] `GET /api/football/history/22/match-stats` retorna stats del Argentina vs Francia
- [ ] Todos los endpoints nuevos tienen fallback a 365scores API si Cosmos no tiene datos
- [ ] No se rompe el frontend existente (el HistoryTab actual debe seguir funcionando con los nuevos campos)
- [ ] Script de backfill actualiza todos los docs existentes sin duplicar datos
