# Fase 2 — Integridad de datos en sync

## Objetivo

Detener la destrucción de datos que hace el sync al sobrescribir JSON canónicos con payloads parciales, y agregar transacciones reales a los pares `DELETE + INSERT` que actualmente pueden dejar huecos.

**Esfuerzo**: 6-8 horas (1 sesión completa)
**Riesgo**: Medio. Requiere testing cuidadoso de sync después de cambios.
**Impacto**: Alto a mediano plazo. Datos que actualmente desaparecen dejan de desaparecer.

---

## Contexto

El sync guarda todo en columnas JSONB (`competitors.data`, `athletes.data`, etc.) usando `INSERT … ON CONFLICT DO UPDATE SET data = EXCLUDED.data`. Esto es seguro solo cuando cada sync entrega el documento completo. En la práctica:

- `syncTransfersForComp` escribe competidores con `data` que solo contiene info de transfer (sin `shortName`, `imageVersion`, `countryId`, etc.).
- `syncAthletes` primero reemplaza la fila con un objeto de roster (`{competitorId, position, …}`), luego intenta rehidratar uno por uno con `getAthlete`. Si la hidratación falla, el perfil completo se pierde.
- `syncCatalog` sobrescribe competidores desde el catálogo, lo cual está bien, pero su orden de ejecución compite con los otros dos.
- 5 pares `DELETE + INSERT` no están en transacciones, así que un crash a mitad produce un hueco real.

---

## Cambios

### 2.1 — Helpers de upsert diferenciados

**Archivo**: `services/syncService.js`

Crear 4 helpers especializados, reemplazando el `upsertMany(table, conflictCols, rows)` genérico para los casos críticos:

```js
// Para datos canónicos (catálogo de competidores)
async function upsertCompetitorCanonical(client, row) {
  // Solo actualiza si EXCLUDED.data es "completo" (tiene imageVersion, shortName, countryId…)
  const isComplete = row.data?.imageVersion && row.data?.shortName;
  if (!isComplete && await exists(client, 'competitors', row.id)) return; // skip
  await client.query(
    `INSERT INTO competitors (id, competition_id, name, data, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (id) DO UPDATE
     SET name = EXCLUDED.name, data = EXCLUDED.data, updated_at = now()`,
    [row.id, row.competition_id, row.name, row.data]
  );
}

// Para referencias desde transfers/lineup (no toca data canónico)
async function upsertCompetitorReference(client, row) {
  await client.query(
    `INSERT INTO competitors (id, name, data, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (id) DO UPDATE
     SET name = COALESCE(NULLIF(EXCLUDED.name, ''), competitors.name),
         updated_at = now()`,
    [row.id, row.name, row.data ?? { }]
  );
}

// Para perfiles canónicos de atletas
async function upsertAthleteCanonical(client, row) {
  // data debe tener career, transfers, trophies — solo entonces es "canónico"
  const isComplete = row.data?.career?.seasons;
  if (!isComplete && await exists(client, 'athletes', row.id)) return;
  await client.query(/* similar al de competitor */);
}

// Para roster (lineup/transfers): solo pisa campos atómicos de referencia
async function upsertRosterMembership(client, row) {
  await client.query(
    `UPDATE athletes
     SET data = jsonb_set(
       jsonb_set(data, '{competitorId}',
         to_jsonb($2::bigint), true),
       '{lastSeenInLineupAt}',
       to_jsonb(now()), true)
     WHERE id = $1`,
    [row.id, row.teamId]
  );
}
```

Aplicar en:
- `syncCatalog` (línea ~620): usar `upsertCompetitorCanonical`.
- `syncTransfersForComp` (línea ~870): usar `upsertCompetitorReference`.
- `syncLineups` → `syncGameDetails`: usar `upsertRosterMembership` en lugar de upsert completo.
- `syncAthletes` (línea ~750): usar `upsertRosterMembership` para la fase de roster, dejar la fase de hidratación (`getAthlete`) intacta.

**Criterio para "canónico"**: definir explícitamente qué campos debe tener `data` para cada entidad. Documentar en `docs/multi-competition.md`.

---

### 2.2 — Transacciones en pares DELETE+INSERT

**Archivo**: `services/syncService.js`

Crear helper en `database/connection.js`:

```js
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}
```

Envolver los siguientes pares:

| Función | Líneas aprox | Operación |
|---|---|---|
| `syncTrendsForComp` | ~348 | DELETE trends → INSERT trends |
| `syncSuggestionsForComp` | ~980 | DELETE game_suggestions → INSERT |
| `syncTransfersForComp` | ~926 | DELETE competition_transfers → INSERT |
| `syncCatalog` (competitors) | ~663 | DELETE competitors WHERE competition_id = … → upsert |
| `syncAthletes` (roster cleanup) | ~741 | DELETE athletes WHERE id <> canonical → upsert |

Convertir cada uno a:

```js
await withTransaction(async (client) => {
  await client.query('DELETE FROM ... WHERE ...', [...]);
  // ... insert / upsert logic con client en lugar de pool
});
```

**IMPORTANTE**: dentro del `withTransaction`, todas las queries deben usar `client` no `pool`. Revisar cada función cuidadosamente.

---

### 2.3 — Columna `source` en `athletes`

**Archivo**: Nueva `database/migrations/011_athletes_source.sql`

```sql
ALTER TABLE athletes
  ADD COLUMN source TEXT NOT NULL DEFAULT 'catalog';

-- Constraint CHECK para valores válidos
ALTER TABLE athletes
  ADD CONSTRAINT athletes_source_check
  CHECK (source IN ('catalog', 'roster', 'transfer', 'profile'));

-- Comentario
COMMENT ON COLUMN athletes.source IS
  'catalog = full profile hydrated. roster = row from lineup. transfer = row from transfer. profile = manually upserted.';
```

Aplicar en código:
- `syncCatalog` (línea ~750): set `source = 'catalog'` al insertar.
- `upsertRosterMembership`: NO actualizar `data` (ya cubre 2.1), pero sí `source = 'roster'` cuando el row viene de lineup, `'transfer'` cuando viene de transfers.
- `loadAthlete` en controller: al hidratar manualmente, setear `source = 'profile'`.

Rechazar en runtime:
```sql
-- Opcional: trigger que bloquea UPDATE a data si source = 'roster'/'transfer'
CREATE OR REPLACE FUNCTION athletes_protect_canonical_data()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.source IN ('roster', 'transfer') AND NEW.data IS DISTINCT FROM OLD.data THEN
    -- Permitir solo ciertos campos
    NEW.data := OLD.data;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER athletes_protect_canonical_data
BEFORE UPDATE ON athletes
FOR EACH ROW
EXECUTE FUNCTION athletes_protect_canonical_data();
```

Opcional pero recomendado para Fase 3. Implementación más sencilla: saltarse el trigger y confiar en que `upsertRosterMembership` no toque `data`.

---

### 2.4 — `getTeamByName` con query indexada

**Archivo**: `services/mundialCache.js`

Reemplazar fallback que escanea todos los games en memoria por:

```js
async function getTeamByName(name) {
  const { rows } = await pool.query(
    `SELECT id, name, data->>'imageVersion' as image_version
     FROM competitors
     WHERE lower(name) LIKE '%' || lower($1) || '%'
     ORDER BY length(name) ASC
     LIMIT 20`,
    [name]
  );
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    imageVersion: r.image_version,
  }));
}
```

Aplicar migración para añadir índice:

**Archivo**: `database/migrations/012_competitors_name_trgm.sql`

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_competitors_name_trgm
  ON competitors USING gin (lower(name) gin_trgm_ops);
```

---

### 2.5 — Logger estructurado en `syncService.js`

**Archivo**: `services/syncService.js`

Reemplazar `console.log(LOG_PREFIX, ...)` por `logger.info/warn/error({...})` usando `utils/logger.js`.

```js
// ANTES
const log = (...args) => console.log(LOG_PREFIX, ...args);
log(`Syncing trends for comp ${comp.id}`);

// DESPUÉS
const { logger } = require('../utils/logger');
logger.info({ compId: comp.id, job: 'syncTrends' }, 'starting trends sync');
```

Cambiar todos los `console.error` también. Solo dejar `console.log` para stdout de cron startup.

**Beneficios en Vercel**:
- Logs JSON lineados, parseables por Log Drain.
- Cada log puede correlacionarse por `request_id`.
- Errores distinguibles de info.

---

## Tests a añadir

| Archivo | Tipo | Cubre |
|---|---|---|
| `tests/sync/upsertHelpers.test.js` | Unit | 2.1 — no se pisan datos canónicos |
| `tests/sync/transactions.test.js` | Integration | 2.2 — rollback funciona en mitad de DELETE+INSERT |
| `tests/migrations/011_source_constraint.test.js` | Migration | 2.3 — constraint rechaza valores inválidos |
| `tests/integration/getTeamByName.test.js` | Integration | 2.4 — usa índice, no escaneo |

## Criterio de aceptación

- [ ] Si `syncTransfers` se interrumpe, ningún competitor queda con `data = {transfer_ref}` cuando antes tenía datos completos
- [ ] Si `syncAthletes` falla en la hidratación, el documento canónico previo se conserva
- [ ] Todos los pares DELETE+INSERT están dentro de `withTransaction`
- [ ] `getTeamByName` ejecuta una sola query, no escanea games
- [ ] Logs del sync son JSON line en Vercel
- [ ] `athletes.source` se setea correctamente en cada sync path

## Riesgos abiertos

| Riesgo | Mitigación |
|---|---|
| Definir "canónico" es subjetivo | Documentar el contrato en `docs/multi-competition.md` y mantenerlo revisado |
| Cambiar upserts puede romper otras sync que dependan de esos datos | Revisar todos los consumidores de `competitors` y `athletes` |
| Trigger `athletes_protect_canonical_data` puede ser costoso en UPDATE massivos | Solo aplicar si perfil es completamente nuevo; medir tiempo |
| Transacciones pueden bloquear tablas si tienen más queries dentro | Mantener bloques de transaction pequeños, sin awaits a APIs externas |
