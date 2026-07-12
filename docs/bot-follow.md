# Comandos del Bot

## Comandos explícitos (sintaxis `/comando args`)

### Seguimiento de tickets (nuevo)

```
/follow <ticketId>           # Seguir todas las estadísticas del ticket
/follow <ticketId> all       # (alias explícito) Cada evento (gol, tarjeta, etc.)
/follow <ticketId> outcome   # Solo cuando sepas si ganaste o perdiste

/unfollow <ticketId>         # Dejar de seguir
/unfollow <ticketId>         # Alias: /dejarseguir

/misapuestas                 # Ver todos los tickets que seguís
/siguiendo                   # Alias corto
```

### Con permiso por modo

| Modo | Significado |
|------|-------------|
| `all_events` (default) | Te aviso con cada gol, tarjeta, cambio de posesión relevante |
| `outcome_only` | Te aviso SOLO cuando el ticket se decide (gana/pierde) |

### Cambio de modo

```
/follow 555 outcome          # Cambia el 555 a outcome_only
/follow 555 all              # Vuelve a all_events
```

### Ejemplos conversacionales

El bot también entiende lenguaje natural (via Gemini):

```
"sígueme el 555"
"avísame del 123 solo cuando gane"
"quiero saber qué pasa con mi ticket 123 pero solo al final"
"deja de seguir el 555"
"qué tickets sigo"
"cambia el 555 a solo cuando gane"
```

---

## Comandos existentes (resumen)

Ver `EndpointsDisp.md` para la lista completa de comandos de fútbol.

---

## Arquitectura de notificaciones

```
LiveGamesPoller (cada 25s)
    ↓ detecta eventos (goles, tarjetas)
notifier.emit('goal:scored', event)
    ↓
telegramNotifier escucha
    ↓
betEvaluator.findAffectedChats(event)
    ↓ busca bet_followers WHERE gameId = event.gameId
    ↓ por cada chatId suscrito:
        - all_events: notifica siempre
        - outcome_only: notifica solo si el estado del ticket CAMBIÓ
    ↓
bot.sendMessage(chatId, formatted_message)
```

### Eventos emitidos por `notifier`

| Evento | Cuándo |
|--------|--------|
| `goal:scored` | Cambia `totalGoals` o goles por equipo |
| `card:yellow` | Aumenta amarillas |
| `card:red` | Aumenta rojas |
| `corner` | Aumenta córners |
| `match:end` | statusGroup = 4 |
| `stat:changed` | Cambio de posesión >5% |

### Bet types soportados

- `goles_over_X` / `goles_under_X`
- `ambos_marcan` / `ambos_no_marcan`
- `resultado_final` (local/visitante/empate)
- `handicap_local_X` / `handicap_visitante_X`
- `tarjetas_over_X`
- `corners_over_X`

### Estados de evaluación

- `pending` - El ticket aún no se decide
- `winning` - El ticket va ganando
- `losing` - El ticket va perdiendo
- `push` - Empate (ej: goles exactos)

---

## Configuración

En `.env`:
```bash
ENABLE_LIVE_NOTIFIER=true   # Activa el listener en telegramBot.js
SCORES365_POLL_MS=25000     # Cada cuánto el poller escribe a Cosmos
```

Para activar: `ENABLE_LIVE_NOTIFIER=true`. Por default está en `false` (no spam durante tests).
