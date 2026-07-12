# Fase 8 — Mantenimiento: refresh periódico, cache y backfill history

## Objetivo

Asegurar que los datos históricos se mantengan actualizados y que el sistema tenga mecanismos de cache y recuperación ante fallos. También incluye la incorporación del endpoint `seo-management` para descripciones enriquecidas.

## Entregables

### 8.1 Refresh periódico de `competition_history`

**Archivo:** `services/cosmosRefresh.js`

- [ ] **Agregar refresh de history** al ciclo de 6h:

```js
// Dentro del refresh loop existente, agregar:
async function refreshHistory() {
  try {
    const apiData = await scores365.getCompetitionHistory(MUNDIAL_ID);
    const rows = apiData?.table?.rows || [];
    if (rows.length === 0) return;
    
    const promises = rows.map(row => {
      const doc = {
        id: `${MUNDIAL_ID}-se${row.seasonNum}`,
        competitionId: MUNDIAL_ID,
        seasonNum: row.seasonNum,
        ...row,
        _fetchedAt: new Date().toISOString(),
      };
      return cosmos.upsert('competition_history', doc).catch(e => {
        console.error(`[refreshHistory] Error upserting season ${row.seasonNum}:`, e.message);
      });
    });
    
    await Promise.all(promises);
    log(`[refresh] History: ${rows.length} editions refreshed`);
  } catch (e) {
    console.error('[refreshHistory] Error:', e.message);
  }
}
```

- [ ] **Rate limiting**: no refrescar más de una vez cada 6h (ya controlado por el ciclo principal)
- [ ] **Detección de cambios**: upsert siempre (es idempotente), no necesita diff

### 8.2 Cache de match stats y overviews históricos

**Archivo:** En `dashboard/server/controllers/footballController.js`, los nuevos endpoints usan cache-aside:

```js
async function getHistoryMatchStats(req, res) {
  try {
    const seasonNum = parseInt(req.params.seasonNum, 10);
    
    // Buscar en cache primero
    let cached = await cosmos.getById('history_match_stats', `stats-se${seasonNum}`, seasonNum);
    if (cached) {
      return res.json(cached.data);
    }
    
    // Fetch desde el doc de history para obtener gameId
    const doc = await cosmos.getById('competition_history', `${MUNDIAL_ID}-se${seasonNum}`, MUNDIAL_ID);
    if (!doc) return res.status(404).json({ error: 'Edition not found' });
    
    const gameId = doc.group?.games?.[0]?.gameId || doc.group?.games?.[0]?.game?.id;
    if (!gameId) return res.json(null);
    
    // Fetch desde 365scores
    const stats = await scores365.getGameStats(gameId);
    
    // Guardar en cache con TTL
    await cosmos.upsert('history_match_stats', {
      id: `stats-se${seasonNum}`,
      seasonNum,
      data: stats,
      _ttl: 90 * 24 * 60 * 60, // 90 días
      _fetchedAt: new Date().toISOString(),
    }).catch(() => {});
    
    res.json(stats);
  } catch (err) {
    console.error(`[GET /history/${req.params.seasonNum}/match-stats]`, err.message);
    res.status(500).json({ error: err.message });
  }
}
```

- [ ] TTL de 90 días para `history_match_stats` (los datos históricos no cambian)
- [ ] TTL de 90 días para `history_match_overviews`
- [ ] Si el fetch a 365scores falla, retornar null (no romper la UI)

### 8.3 Endpoint de descripción enriquecida (seo-management)

**Archivo:** En `services/scores365Service.js`, agregar:

```js
getEntityDescription: (entityType, entityId, sectionNames = 'ENTITY_DESCRIPTION') => 
  get('/web/sections/', `appTypeId=${APPTYPE}&langId=${LANG}&timezoneName=${encodeURIComponent(TZ)}&userCountryId=${COUNTRY}&apiType=webws&sportType=1&entityType=${entityType}&entityId=${entityId}&sectionNames=${sectionNames}&activateLinks=true`, 
  'https://seo-management.365scores.com'),
```

Nota: el `get()` helper actual asume `BASE = 'https://webws.365scores.com'`. Modificar para aceptar base URL opcional:

```js
async function get(path, extraQuery = '', baseUrl = BASE) {
  const url = `${baseUrl}${path}?${buildQuery(extraQuery)}`;
  // ... resto igual
}
```

- [ ] **Nuevo endpoint**: `GET /api/football/history/:seasonNum/description`
- [ ] **Entity types**: `entityType=5` para Game, `entityType=2` para Competition
- [ ] **Cache**: Cosmos container `history_descriptions` con TTL 30d
- [ ] **Procesamiento**: parsear el HTML devuelto para extraer texto limpio

**Archivo:** `services/scores365Service.js`

```js
const SEO_BASE = 'https://seo-management.365scores.com';

// En el objeto api:
getEntityDescription: (entityType, entityId, sectionNames = 'ENTITY_DESCRIPTION') =>
  get('/sections/', `appTypeId=${APPTYPE}&langId=${LANG}&timezoneName=${encodeURIComponent(TZ)}&userCountryId=${COUNTRY}&apiType=webws&sportType=1&entityType=${entityType}&entityId=${entityId}&sectionNames=${sectionNames}&activateLinks=true`, SEO_BASE),
```

### 8.4 Script de backfill inicial

**Archivo:** `scripts/backfill-history.js` (ya mencionado en Fase 5)

```
Uso: node scripts/backfill-history.js

Lo que hace:
1. Consulta todos los docs en competition_history
2. Para cada doc, verifica si tiene campos completos (title, entityId, secondaryTitle)
3. Si le faltan campos: fetch de 365scores API, merge con datos existentes, upsert
4. Reporta: N docs actualizados, N docs ya completos, N errores
```

### 8.5 Cache de `competition_history` en dashboard server

- [ ] En `getHistory()`, usar `getOrFetch` pattern de Cosmos (ya implementado en `cosmos.js`) para evitar consultas repetitivas:

```js
const docs = await cosmos.getOrFetch(
  'competition_history',
  'history-all',
  MUNDIAL_ID,
  async () => {
    const apiData = await scores365.getCompetitionHistory(MUNDIAL_ID);
    const rows = apiData?.table?.rows || [];
    const docs = rows.map(r => ({
      id: `${MUNDIAL_ID}-se${r.seasonNum}`,
      competitionId: MUNDIAL_ID,
      seasonNum: r.seasonNum,
      ...r,
      _fetchedAt: new Date().toISOString(),
    }));
    await cosmos.bulkInsert('competition_history', docs);
    return docs;
  },
  3600 // cache por 1 hora
);
```

Actualmente el código hace `queryAll` sin cache intermedio. Esto es aceptable para Cosmos (lectura directa), pero si hay alta concurrencia, conviene cachear en Redis o en memoria. Para esta fase, implementar un cache simple en memoria en `footballController.js`:

```js
const historyCache = { data: null, expiry: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

if (historyCache.data && Date.now() < historyCache.expiry) {
  return res.json(historyCache.data);
}
// ... fetch logic ...
historyCache = { data: result, expiry: Date.now() + CACHE_TTL_MS };
```

### 8.6 Manejo de errores en historical fallbacks

- [ ] Si `scores365.getCompetitionHistory()` falla, retornar datos de Cosmos aunque estén incompletos
- [ ] Si `scores365.getGameStats(gameId)` falla, retornar null en lugar de 500
- [ ] Log de errores con `console.error('[Fallo histórico]', ...)` para monitoreo

## Contenedores Cosmos nuevos

| Container | Partition Key | TTL | Propósito |
|-----------|---------------|-----|-----------|
| `history_match_stats` | `/seasonNum` | 90d | Stats de partidos históricos |
| `history_match_overviews` | `/seasonNum` | 90d | Lineups de partidos históricos |
| `history_descriptions` | `/seasonNum` | 30d | Descripciones SEO enriquecidas |

## Tareas detalladas

```
8.1 Refresh periódico
    → Agregar refreshHistory() a cosmosRefresh.js
    → Upsert completo (idempotente)

8.2 Cache de match stats/overviews
    → Implementar cache-aside en los nuevos endpoints
    → TTL 90 días para datos históricos

8.3 Descripción enriquecida SEO
    → Agregar getEntityDescription() a scores365Service.js
    → Modificar get() para aceptar base URL opcional
    → Crear endpoint /history/:seasonNum/description
    → Cache en history_descriptions con TTL 30d

8.4 Script backfill
    → Crear scripts/backfill-history.js
    → Correr después del deploy para actualizar datos existentes

8.5 Cache en memoria
    → Agregar cache simple en getHistory() para reducir carga en Cosmos

8.6 Manejo de errores
    → Fallback graceful en todos los endpoints históricos
    → Logging de errores
```

## Criterios de aceptación

- [ ] `cosmosRefresh.js` actualiza los 22 docs de history cada 6h sin errores
- [ ] `GET /history/:seasonNum/match-stats` retorna datos cacheados en < 50ms (vs 500ms+ sin cache)
- [ ] `GET /history/:seasonNum/description` retorna datos del endpoint seo-management
- [ ] Si la API de 365scores falla, los endpoints retornan datos parciales/null sin crash
- [ ] Script de backfill completa exitosamente actualizando los 22 docs
- [ ] Cache en memoria reduce consultas repetitivas a Cosmos
- [ ] Los containers nuevos se crean automáticamente al deploy (vía cosmos-schema.json)
