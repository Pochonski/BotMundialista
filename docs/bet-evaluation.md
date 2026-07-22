# Evaluación de apuestas — motores

> Estado: **dos motores coexisten**. `betTrackingEngine` es el canónico activo
> (WhatsApp, cron); `betEvaluator` es el planeado (event-driven, PUSH correcto),
> hoy dormido tras `ENABLE_LIVE_NOTIFIER=false`. La consolidación es un cambio
> mayor pendiente.

## Resumen

| Aspecto | `betTrackingEngine.js` ✅ canónico | `betEvaluator.js` 💤 dormido |
|---|---|---|
| Trigger | Cron (`node-cron`), polling cada 60s de todos los tickets abiertos | Event-driven: reacciona a `goal:scored`/`corner` emitidos por `liveGamesPoller` |
| Fuente del estado | `mundialCache.getMatchStats()` | `scores365_state.last_snapshot` (Postgres) |
| Vocabulario | `cumplida`/`no_cumplida`/`pendiente` (español) | `PENDING`/`WINNING`/`LOSING`/`PUSH` (enum inglés) |
| Over/Under en la línea exacta | `>=` → cumplida (gana) | `>` gana, `===` → **PUSH** (correcto para casas reales) |
| Handicap en empate | Sin concepto de push → queda `pendiente` indefinidamente | Retorna `PUSH` |
| Mutaciones DB | Sí: escribe `apuesta_selecciones.estado`, `apuestas.estado`/`marcador_*`/`fecha_cierre` | Solo lectura + de-dup en `bet_followers.last_notified_status` |
| Sink de notificación | `notificationService` (WhatsApp) | `telegramNotifier.notifyChats` (Telegram) |
| Activación | Automática al subir imagen de apuesta (`betImageHandler.js:180`) | Requiere `ENABLE_LIVE_NOTIFIER=true` + proceso `liveGamesPoller` corriendo |

## Trazado de llamadas

### betTrackingEngine (canónico, WhatsApp)
```
[imagen de apuesta en WhatsApp]
  → bot.js → messageHandler.js:216
  → betImageHandler.procesarImagenApuesta
  → betImageHandler.js:180-181  if (!betTrackingEngine.isRunning()) iniciar(60)
  → betTrackingEngine.iniciar(60)
    → cron.schedule('*/1 * * * *', cicloEvaluacion)
      → por cada ticket abierto: evaluarApuesta → evaluarSeleccion
      → notificationService.notificarSeleccionCumplida/Fallida
```

### betEvaluator (dormido)
```
liveGamesPoller.js (standalone, `node services/liveGamesPoller.js`)
  → cron.schedule('*/25 * * * * *', tickGuarded)
  → pollGame → detectEvents → notifier.emitMatchEvent

notifier (EventEmitter) → 'event:any'
  → telegramNotifier.attach()  [solo si ENABLE_LIVE_NOTIFIER=true]
  → notifyChats(event)
    → evaluator.findAffectedChats(event)
      → getGameStateFromSupabase + fetchTicketFromDb
      → evaluateTicket → BET_TYPES[...].evaluate
  → bot.sendMessage(chatId, ...)
```

## Por qué coexisten hoy

- `betTrackingEngine` funciona sin configuración extra y persiste el estado que
  consume el panel admin (`/admin/api/apuestas`).
- `betEvaluator` tiene **semántica correcta** (PUSH en línea exacta y en
  handicap empatado), lee del snapshot de Supabase, y solo recomputa tickets
  afectados por eventos reales. Pero requiere:
  1. `ENABLE_LIVE_NOTIFIER=true` (default `false`).
  2. `liveGamesPoller` corriendo como proceso separado (no arranca solo).
  3. `telegramNotifier.attach()` llamado desde `bot.js` (hoy solo lo llama
     `telegramBot.js:25-32`).

## Camino para consolidar (futuro, no esta ronda)

1. Arrancar `liveGamesPoller.start()` desde el boot del bot (`bot.js` ready y/o
   `telegramBot.js init()`).
2. Flipping `ENABLE_LIVE_NOTIFIER=true`.
3. Llamar `telegramNotifier.registerBot(...)` + `attach()` también desde `bot.js`.
4. Hacer que `betEvaluator` escriba el estado español (`cumplida`/`fallida`) en
   `apuesta_selecciones.estado` para que `betImageHandler.formatearApuesta` y
   `/admin/api/apuestas` sigan funcionando, o migrar esos lectores al enum nuevo.
5. Auto-poblar `bet_followers` para cada ticket nuevo (hoy requiere `/follow` manual).
6. Eliminar la llamada a `betTrackingEngine.iniciar(60)` en `betImageHandler.js:180`.
7. Una vez sin referencias, borrar `services/betTrackingEngine.js`.

## Bug conocido (importante)

La **divergencia de semántica PUSH vs cumplida** significa que **el mismo ticket
evaluado por los dos motores puede dar resultados distintos al usuario**. Por
ejemplo, over 2 goles con exactamente 2 goles:

- `betTrackingEngine` → `cumplida` (gana).
- `betEvaluator` → `PUSH` (se devuelve la apuesta).

Esto NO es un bug hoy porque los motores no corren simultáneamente sobre el
mismo ticket (el path de betEvaluator está apagado por defecto), pero **debe
resolverse antes de promover betEvaluator**.
