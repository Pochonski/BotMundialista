# Fase 1 — Estabilizar lo existente

## Objetivo

Eliminar los bugs visibles hoy sin tocar arquitectura ni datos. Cinco arreglos puntuales con bajo riesgo y alta visibilidad para el usuario final.

**Esfuerzo**: 2-3 horas
**Riesgo**: Bajo. Cada cambio es contenido en un archivo.
**Impacto**: Alto para usuarios (especialmente 1.1 y 1.2 son bugs visibles).

---

## Cambios

### 1.1 — `TeamDetailPage.tsx`: respetar Rules of Hooks

**Problema**: `useMemo(formStats)` se declara en líneas 73-85, después de dos early returns (`if (infoLoading) return …`, `if (!info) return …`). Cuando `infoLoading` pasa de true a false, el conteo de hooks cambia → React error #310 (misma clase de bug que `f1f21f7` corrigió en `CompetitionPage`).

**Archivo**: `dashboard/src/presentation/pages/TeamDetailPage.tsx`

**Cambio**:
- Mover la declaración de `formStats` antes de las dos returns, o
- Calcular `formStats` directamente como variable (es computación barata, no necesita `useMemo`).

Recomiendo la segunda (eliminar hook muerto):

```tsx
// ANTES (líneas 73-85)
if (infoLoading) return <Loading />;
if (!info) return <ErrorState />;

const formStats = useMemo(() => {
  return info.recentForm?.filter(...) ?? [];
}, [info]);
```

```tsx
// DESPUÉS
const formStats = info?.recentForm?.filter(...) ?? [];

if (infoLoading) return <Loading />;
if (!info) return <ErrorState />;
```

**Regla ESLint**: activar `react-hooks/rules-of-hooks` en `dashboard/eslint.config.js` para evitar regresión futura. Verificar que `react-hooks/exhaustive-deps` también esté activo.

**Tests**:
- Añadir `dashboard/tests/pages/TeamDetailPage.test.tsx` mínimo: render con `infoLoading=true`, luego transición a `info` cargado. Verificar que no se rompe con error #310. Por ahora, validación manual hasta tener infraestructura de testing de pages completa.

---

### 1.2 — `transfersController.js`: corregir agregación de summary

**Problema**: el summary agrupa por `COALESCE(origin_id, target_id)`. Cuando un fichaje tiene tanto origen como destino distintos, agrupa por origen pero también suma una llegada a ese mismo equipo — produciendo conteos cruzados.

**Archivo**: `dashboard/server/controllers/transfersController.js` (líneas 123-150)

**Cambio**: reemplazar el `GROUP BY` único por dos agregaciones separadas con `UNION ALL`:

```sql
-- ANTES
SELECT
  COALESCE(origin_id, target_id) AS team_id,
  SUM(CASE WHEN target_id IS NOT NULL THEN 1 ELSE 0 END) AS arrivals,
  SUM(CASE WHEN origin_id IS NOT NULL THEN 1 ELSE 0 END) AS departures
FROM competition_transfers
WHERE competition_id = $1
GROUP BY team_id
```

```sql
-- DESPUÉS
WITH transfers_split AS (
  SELECT origin_id AS team_id, 'departure'::text AS kind
  FROM competition_transfers
  WHERE competition_id = $1 AND origin_id IS NOT NULL
  UNION ALL
  SELECT target_id AS team_id, 'arrival'::text AS kind
  FROM competition_transfers
  WHERE competition_id = $1 AND target_id IS NOT NULL
)
SELECT
  team_id,
  COUNT(*) FILTER (WHERE kind = 'arrival') AS arrivals,
  COUNT(*) FILTER (WHERE kind = 'departure') AS departures
FROM transfers_split
GROUP BY team_id
```

Mantener el filtro por `games` (introducido en `98f6828`): envolver el filtro en una CTE previa de equipos activos.

**Tests**:
- `dashboard/server/tests/transfersController.test.js`:
  - Caso A: misma transferencia con origen y destino distintos → un equipo recibe 1 arrival, otro 1 departure.
  - Caso B: equipo externo no aparece en summary (regresión del fix anterior).

---

### 1.3 — `liveGamesPoller.js`: multi-comp + fix rama duplicada

**Problema**:
- La constante `COMPETITION_ID = 5930` ignora el resto de competiciones activas. El refactor multi-comp no tocó este archivo.
- En `detectEvents` (líneas 67-69), la rama "away goals" usa `getStatValue(stats, 1)` (mismo ID que home goals), duplicando el branch y nunca disparándose.

**Archivo**: `services/liveGamesPoller.js`

**Cambios**:

1. Reemplazar constante por iteración sobre `active_competitions`:
```js
// ANTES
const COMPETITION_ID = 5930;
const games = await api.getGamesCurrent(COMPETITION_ID);

// DESPUÉS
const { forEachActive } = require('./syncCompetitions');
const allGames = [];
await forEachActive(async (comp) => {
  const games = await api.getGamesCurrent(comp.id);
  allGames.push(...games.map(g => ({ ...g, competitionId: comp.id })));
});
```

2. En `detectEvents`, distinguir ID de home goals vs away goals. Buscar en `data.statistics` el mapping real; si no se conoce, fallback a buscar por valor mayor:
```js
// ANTES (líneas 67-69)
const newAwayGoals = getStatValue(newStats, 1);
const prevAwayGoals = getStatValue(prevStats, 1);

// DESPUÉS (TODO: confirmar ID correcto con 365scores; mientras, buscar por comparative)
const findGoals = (stats, side) => {
  // side = 'home' | 'away'
  return stats.find(s => /* match home/away goals */)?.value ?? null;
};
```

3. Eliminar `getCompetitorScore` si no se usa (código muerto, definido líneas 84-90 aprox).

**Investigación previa**:
- Confirmar la estructura exacta del payload de `getGameStats` que devuelve 365scores. Buscar cómo se identifican home goals vs away goals en el array `statistics`.
- Si 365scores no separa claramente por lado, documentar la limitación en el código y solo emitir un evento genérico por cambio de score.

**Tests**:
- Validar manualmente con partido en vivo en Mundial: confirmar que se emiten eventos.
- Validar manualmente con partido en vivo en Premier League: confirmar que se emiten eventos.
- Regresión: tras tocar el `forEachActive`, verificar que no se duplican eventos entre múltiples competiciones.

---

### 1.4 — `athleteController.js`: reconectar `AbortController.signal`

**Problema**: `hydrateFromUpstream` crea un `AbortController` con `HYDRATE_TIMEOUT_MS = 8000` pero nunca pasa su `signal` al cliente HTTP. El timeout no aborta realmente la petición. Además, `HYDRATE_RETRIES` se declara pero no se usa.

**Archivo**: `dashboard/server/controllers/athleteController.js`

**Cambios**:

1. Pasar `signal` a `api.getAthlete`:
```js
// ANTES (líneas 68-97 aprox)
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), HYDRATE_TIMEOUT_MS);
try {
  const fresh = await api.getAthlete(id, true);
  // ...
} finally {
  clearTimeout(timeoutId);
}

// DESPUÉS
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), HYDRATE_TIMEOUT_MS);
try {
  const fresh = await api.getAthlete(id, true, { signal: controller.signal });
  // ...
} finally {
  clearTimeout(timeoutId);
}
```

Verificar la firma real de `api.getAthlete()` en `services/scores365Service.js`. Si no acepta opciones, refactorizar para que sí (agregar 3er parámetro o aceptar opciones en el 2do).

2. Eliminar `HYDRATE_RETRIES` o implementar retry loop real:
```js
// Opción A: si no hay retry, eliminar la constante
// Opción B: implementar
const HYDRATE_RETRIES = 2;
let lastErr;
for (let attempt = 0; attempt <= HYDRATE_RETRIES; attempt++) {
  try {
    const fresh = await api.getAthlete(id, true, { signal: controller.signal });
    return fresh;
  } catch (err) {
    lastErr = err;
    if (attempt < HYDRATE_RETRIES) await sleep(500 * (attempt + 1));
  }
}
throw lastErr;
```

Recomiendo opción A por simplicidad. La constante actual sin uso es mentir sobre cobertura.

**Tests**:
- Verificar manualmente que un upstream lento (>8s) ya no cuelga al dashboard.
- Revisar que los tests existentes del athlete controller siguen pasando.

---

### 1.5 — `telegramBot.js`: `telegramRequest` rechaza `ok:false`

**Problema**: `telegramRequest` rechaza solo respuestas 429. Cualquier `ok:false` (Markdown inválido, chat ID malo, media rota, oversized text) se resuelve como éxito. El bot cree que envió mensajes que nunca llegaron, y `saveHistory()` los registra como entregados.

**Archivo**: `telegramBot.js`

**Cambios**:

1. En `telegramRequest`, rechazar cualquier `parsed.ok === false` con detalle saneado:
```js
// ANTES (líneas ~700 aprox)
if (parsed.statusCode === 429) return reject(...);
// ...

// DESPUÉS
if (!parsed.ok) {
  const err = new Error(`Telegram API error ${parsed.statusCode}: ${parsed.description || 'unknown'}`);
  err.status = parsed.statusCode;
  err.telegramError = true;
  err.description = parsed.description;
  return reject(err);
}
```

2. En `sendMessage`/`sendPhoto`/`sendMediaGroup`, capturar el error y hacer fallback a plain text cuando falle por Markdown:
```js
async function sendMessage(chatId, text, options = {}) {
  try {
    return await telegramRequest('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown', ...options });
  } catch (err) {
    if (err.telegramError && options.parse_mode === 'Markdown') {
      // Reintentar sin parse_mode
      return await telegramRequest('sendMessage', { chat_id: chatId, text, ...options, parse_mode: undefined });
    }
    throw err;
  }
}
```

3. Revisar la propagación de errores en handlers: con el `telegramRequest` ahora rechazante, muchos comandos que asumían éxito empezarán a fallar. Revisar caso por caso (la mayoría ahora tendrán que responder con un mensaje de error al usuario).

**Riesgo**: medio. Es un cambio de comportamiento — algunos flujos que ahora "parece que funcionan" en realidad nunca lo hacían. Pero también es la corrección del bug original.

**Tests**:
- Test manual: enviar un mensaje con caracteres Markdown no escapados que rompan la respuesta. Verificar que el bot (a) loguea el error, (b) reintenta sin parse_mode, (c) el mensaje llega eventualmente.
- Test de regresión: comandos normales siguen funcionando.

---

## Tests a añadir

| Archivo | Tipo | Cubre |
|---|---|---|
| `dashboard/tests/pages/TeamDetailPage.test.tsx` | Componente | 1.1 — render sin error #310 |
| `dashboard/server/tests/transfersController.test.js` | Controller | 1.2 — counts correctos |
| `dashboard/tests/hooks/useLiveEvents.test.ts` (nuevo) | Hook | 1.3 — multi-comp (futuro) |
| `dashboard/server/tests/athleteController.test.js` | Controller | 1.4 — timeout real |
| Manual checklist | e2e | 1.5 — bot reporta errores |

## Criterio de aceptación

- [ ] Cero React #310 en consola al navegar entre equipos en `/equipo/:id`
- [ ] Las sumas de arrivals/departures cuadran con la realidad cuando origen ≠ destino
- [ ] `liveGamesPoller` muestra actividad para Premier League, LaLiga, etc. (no solo Mundial)
- [ ] Mensajes de Telegram fallan visiblemente en consola cuando upstream rechaza Markdown; el usuario recibe el mensaje en plain text como fallback
- [ ] Peticiones a `getAthlete` con upstream lento (>8s) abortan en lugar de colgar

## Riesgos abiertos

| Riesgo | Mitigación |
|---|---|
| 1.3 requiere entender el payload de 365scores para separar home/away goals | Si no se puede, fallback conservador: solo emitir "gol detectado" sin lado, anotar con TODO |
| 1.5 cambia comportamiento del bot | Documentar en `docs/bot-commands.md` qué respuestas ahora pueden aparecer; revisar logs por algunas horas post-deploy |
| 1.2 podría ser más complejo de lo que parece si hay joins adicionales | Mantener CTE separada para filtro de equipos activos |
