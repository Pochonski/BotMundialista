# Fase 4 — Migración a Supabase JS (HTTP)

## Objetivo

Reemplazar `pg.Pool` por `@supabase/supabase-js` (PostgREST sobre HTTP) para eliminar el límite de conexiones de Supavisor y permitir concurrencia alta en Vercel sin `EMAXCONNSESSION`. Mantener pg solo para queries que requieren features no soportadas por PostgREST (CTEs complejos, transacciones multi-statement).

**Esfuerzo**: 12-16 horas (2-3 sesiones)
**Riesgo**: Medio. Es refactor grande pero incremental (se puede hacer controller por controller).
**Impacto**: Elimina definitivamente el problema de pool. Habilita concurrencia ilimitada.

---

## Prerequisitos

- `SUPABASE_URL` (https://xxx.supabase.co) y `SUPABASE_SERVICE_ROLE_KEY` en `.env` de Vercel.
- Cuenta de Supabase sin restricciones que bloqueen PostgREST (por defecto habilitado).
- Tests de integración contra Supabase real (no localhost).
- Fase 3 completada para no migrar dos veces.

---

## Cambios

### 4.0 — Decisión arquitectónica

PostgREST (HTTP) y `pg.Pool` (TCP) tienen trade-offs:

| Feature | pg.Pool | Supabase JS (HTTP) |
|---|---|---|
| Conexiones persistentes | Sí | No |
| Riesgo de agotar pool | Sí | No |
| Latencia por query | Baja (~10-50ms) | Ligeramente mayor (~30-100ms) |
| HTTP/1.1 limits | N/A | Sí, pero HTTP/2 lo mitiga |
| Tx multi-statement | Sí | No (solo una "operación" por request) |
| `RETURNING` selectivo | Sí | Limitado (devuelve todo) |
| CTE complejo | Sí | No |
| Joins anidados | Sí (full SQL) | Limitado |
| RLS | No (bypass si service_role) | Si (con anon key) |
| Reseeding ante cold start | No (warm keeps pool) | Sí (cada request es stateless) |

**Decisión**: estrategia dual con wrapper. Queries single-table o joins simples → Supabase JS. Queries con CTEs, transacciones reales, JSONB ops complejos → pg con `max: 1`.

---

### 4.1 — Crear capa de abstracción

**Archivo 1**: Nuevo `database/supabaseClient.js`

```js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
    global: {
      headers: { 'x-application-name': 'scorehub' },
    },
  }
);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Supabase JS client not configured: missing URL or SERVICE_ROLE_KEY');
}

module.exports = { supabase };
```

**Archivo 2**: Nuevo `database/db.js` — wrapper unificado:

```js
const { supabase } = require('./supabaseClient');
const { pool } = require('./connection'); // pg only para avanzadas
const { logger } = require('../utils/logger');

/**
 * Ejecuta una query que es compatible con PostgREST.
 * Retorna { data, error } — la shape del Supabase JS.
 *
 * Para queries complejas (CTE, multi-statement tx) usar db.execAdvanced en su lugar.
 */
async function query(table, options = {}) {
  let q = supabase.from(table);

  if (options.select) q = q.select(options.select);
  if (options.eq) {
    for (const [col, val] of Object.entries(options.eq)) {
      q = q.eq(col, val);
    }
  }
  if (options.in) {
    for (const [col, vals] of Object.entries(options.in)) {
      q = q.in(col, vals);
    }
  }
  if (options.order) {
    if (Array.isArray(options.order)) {
      for (const o of options.order) q = q.order(o.column, { ascending: o.asc });
    } else {
      q = q.order(options.order.column, { ascending: options.order.asc });
    }
  }
  if (options.limit) q = q.limit(options.limit);
  if (options.range) q = q.range(options.range[0], options.range[1]);
  if (options.single) q = q.single();

  const { data, error } = await q;
  return { data, error };
}

/**
 * Para queries que requieren SQL completo (CTE, JSONB ops, multi-row inserts atómicos).
 * Usa pg con max=1 — OK porque son operaciones raras.
 */
async function execAdvanced(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

/**
 * Insertar fila(s). Retorna la fila insertada (incluyendo defaults).
 */
async function insert(table, rows, { onConflict = null } = {}) {
  let q = supabase.from(table).insert(rows);
  if (onConflict) q = q.onConflict(onConflict).select();
  const { data, error } = await q;
  return { data, error };
}

/**
 * Upsert fila(s). Retorna la fila final.
 */
async function upsert(table, rows, onConflict) {
  const { data, error } = await supabase
    .from(table)
    .upsert(rows, { onConflict, returning: 'representation' })
    .select();
  return { data, error };
}

/**
 * Actualizar por filtro. Retorna filas afectadas.
 */
async function update(table, updates, filter) {
  let q = supabase.from(table).update(updates);
  for (const [col, val] of Object.entries(filter.eq || {})) {
    q = q.eq(col, val);
  }
  // Para in:
  for (const [col, vals] of Object.entries(filter.in || {})) {
    q = q.in(col, vals);
  }
  const { data, error } = await q.select();
  return { data, error };
}

/**
 * Eliminar por filtro. Retorna filas eliminadas.
 */
async function remove(table, filter) {
  let q = supabase.from(table).delete();
  for (const [col, val] of Object.entries(filter.eq || {})) {
    q = q.eq(col, val);
  }
  for (const [col, vals] of Object.entries(filter.in || {})) {
    q = q.in(col, vals);
  }
  const { data, error } = await q.select();
  return { data, error };
}

module.exports = {
  query,
  insert,
  upsert,
  update,
  remove,
  execAdvanced,
};
```

**Archivo 3**: `database/connection.js` — reducir a pg-only:

```js
require('dotenv').config();
const { Pool } = require('pg');

const poolConfig = {
  max: parseInt(process.env.DB_POOL_MAX || '1', 10), // Solo para queries avanzadas
  idleTimeoutMillis: 60000,
  maxUses: 100,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
  query_timeout: 30000,
  application_name: 'scorehub-pg-fallback',
};

// ... connection string etc igual

const pool = new Pool(poolConfig);
// ... error handler igual

module.exports = { pool, testConnection };
```

---

### 4.2 — Refactor de repositories y servicios

**Plan incremental**: migrar un archivo a la vez, deployar, validar, siguiente.

**Orden sugerido** (por criticidad):

1. **`dashboard/server/controllers/infoController.js`** (7 handlers, 349 líneas).
   - Queries mayormente single-table (`competitions`, `countries`, `active_competitions`, `standings`).
   - Buen candidato para empezar: validar que el wrapper funciona bien.

2. **`dashboard/server/controllers/standingController.js`** (3 handlers).
   - `getStandings` con jsonb filtering podría necesitar `execAdvanced`.

3. **`dashboard/server/controllers/matchController.js`** (12 handlers).
   - Queries con JSONB casts y filtros complejos → mezcla supabase + execAdvanced.

4. **`dashboard/server/controllers/teamController.js`** + `teamEnhancementsController.js` + `athleteController.js`.

5. **`dashboard/server/controllers/transfersController.js`** + `statsController.js` + `trendController.js`.

6. **`services/mundialCache.js`** — reescribir con `db.query` + cache local.

7. **`handlers/*.js`** — uno por uno.

8. **`services/syncService.js`** — el último. Más complejo por tx multi-statement.

**Patrón de migración**:

```js
// ANTES
const { pool } = require('../../../database/connection');
const { rows } = await pool.query('SELECT * FROM competitions WHERE id = $1', [id]);

// DESPUÉS
const db = require('../../../database/db');
const { data, error } = await db.query('competitions', {
  select: '*',
  eq: { id },
  single: true,
});
if (error) throw error;
const row = data;
```

**Importante**:
- `db.query` con `single: true` lanza si la shape no es 1 fila. Si se esperan 0 filas legítimas, usar `single: false` y validar `data.length === 0`.
- Para joins, preferir `select=col1,col2,related_table(col1,col2)` syntax de Supabase JS:
  ```js
  db.query('games', {
    select: '*,home:home_competitor_id(name,data),away:away_competitor_id(name,data)',
    eq: { 'active_competitions.competition_id': compId },
  })
  ```

---

### 4.3 — Estrategia dual

Para queries que NO encajan en PostgREST (CTE, multi-statement tx, JSONB ops avanzados):

```js
// Ejemplo: Transfer summary (Fase 1.2)
const { rows } = await db.execAdvanced(`
  WITH active_teams AS (
    SELECT competitor_id FROM competition_competitors WHERE competition_id = $1
  ),
  transfers_split AS (
    SELECT origin_id AS team_id, 'departure' AS kind
    FROM competition_transfers
    WHERE competition_id = $1 AND origin_id IN (SELECT competitor_id FROM active_teams)
    UNION ALL
    SELECT target_id AS team_id, 'arrival' AS kind
    FROM competition_transfers
    WHERE competition_id = $1 AND target_id IN (SELECT competitor_id FROM active_teams)
  )
  SELECT team_id,
    COUNT(*) FILTER (WHERE kind = 'arrival') AS arrivals,
    COUNT(*) FILTER (WHERE kind = 'departure') AS departures
  FROM transfers_split
  GROUP BY team_id
`, [compId]);
```

Con `execAdvanced` accediendo a `pool` que tiene `max: 1` (ya no es problema con Supabase JS principal).

---

### 4.4 — Settings de Vercel

En `.env` (Vercel):

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_URL=postgresql://postgres:xxx@aws-0-us-east-1.pooler.supabase.com:6543/postgres
DB_POOL_MAX=1
```

`SUPABASE_DB_URL` permanece solo para las queries `execAdvanced`. `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` para todas las demás.

---

### 4.5 — Observabilidad

**Archivo**: Nuevo `utils/dbStats.js`

```js
const counters = {
  supabaseCalls: 0,
  pgCalls: 0,
  supabaseErrors: 0,
  pgErrors: 0,
};

function wrapDbCall(name, type, fn) {
  return async (...args) => {
    counters[type]++;
    try {
      return await fn(...args);
    } catch (err) {
      counters[type === 'supabase' ? 'supabaseErrors' : 'pgErrors']++;
      throw err;
    }
  };
}

function getStats() {
  return { ...counters };
}

function reset() {
  counters.supabaseCalls = 0;
  counters.pgCalls = 0;
  counters.supabaseErrors = 0;
  counters.pgErrors = 0;
}

module.exports = { wrapDbCall, getStats, reset };
```

Añadir `/api/football/health` devuelve el ratio:

```json
{
  "status": "ok",
  "db": "connected",
  "stats": {
    "supabaseCalls": 1240,
    "pgCalls": 87,
    "supabaseErrors": 2,
    "pgErrors": 0,
    "supabasePercent": 93.4
  }
}
```

Para confirmar que la mayoría de tráfico va por Supabase JS y no por pg.

---

### 4.6 — Cache de Vercel

Aprovechar para invalidar el cache HTTP de Vercel al cambiar DB strategy. Probablemente no sea necesario, pero documentar en README.

---

## Tests a añadir

| Archivo | Tipo | Cubre |
|---|---|---|
| `tests/integration/db-wrapper.test.js` | Integration | 4.1 — wrapper funciona con supabase y pg |
| `tests/integration/infoController.supabase.test.js` | Integration | 4.2 — controller migrado da mismas respuestas |
| `tests/integration/transfersAdvanced.test.js` | Integration | 4.3 — execAdvanced para queries complejas |
| `tests/integration/health-stats.test.js` | Integration | 4.5 — stats visibles |
| `tests/load/concurrency.test.js` | Load | 4 — sin EMAXCONNSESSION con 50 req/s |

## Criterio de aceptación

- [ ] Cero errores `EMAXCONNSESSION` en Vercel con tráfico de 50 req/s por 5 min
- [ ] Latencia p95 similar a la línea base (≤20% diferencia)
- [ ] Todas las rutas del dashboard devuelven la misma shape JSON que antes
- [ ] Tests de integración pasan contra Supabase real
- [ ] Stats endpoint muestra >80% de queries por Supabase JS

## Riesgos abiertos

| Riesgo | Mitigación |
|---|---|
| Latencia mayor en HTTP que TCP | HTTP/2 multiplexing + CDN; comparar antes/después |
| RLS rules pueden bloquear queries | Usar service_role (bypass RLS) o configurar policies |
| Algunos operadores JSONB están limitados en PostgREST | `execAdvanced` cubre esos casos |
| `RETURNING *` en upserts devuelve más columnas de las esperadas | Validar la shape completa; usar select explícito |
| Migración incremental puede dejar inconsistencias temporales | Hacerlo en una sola sesión cerrada o usar feature flag por controller |
| `application_name` cambia de `scorehub` a `scorehub-pg-fallback` | Solo afecta pg_stat_activity; ajustable |
| Auth de Supabase JS requiere el rol adecuado | service_role_key da acceso completo; rotar periódicamente |

## Plan de rollback

Si la migración causa problemas graves:

1. Revertir variables de Vercel: quitar `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`.
2. `database/db.js` detecta ausencia y cae a pg.
3. Restaurar `pool.max = 2` como interim.
4. Investigar sin presión de tráfico.

El wrapper dual permite revertir archivo por archivo si alguno causa problemas específicos.
