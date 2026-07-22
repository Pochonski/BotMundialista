/**
 * logger.js — Instancia pino compartida para bot, sync y servicios.
 *
 * Redacción de PII: mensajería de usuario (campos `text`, `body`, `message`)
 * e IDs (`userId`, `chatId`, `from`) se truncan en nivel info para no loguear
 * contenido sensible. En nivel debug se loguean completos.
 *
 * Uso:
 *   const log = require('../utils/logger');
 *   log.info({ userId, chatId }, 'mensaje recibido');
 *   log.error({ err }, 'falló X');
 *
 * Si la dependencia `pino` no está disponible (p.ej. en un runtime mínimo),
 * cae a console con API compatible.
 */

let pino = null;
try {
  pino = require('pino');
} catch (_) {
  pino = null;
}

const LEVEL = process.env.LOG_LEVEL || 'info';
const isDev = process.env.NODE_ENV !== 'production';

// Paths de campos a redactar (pino-redact style).
const REDACT_PATHS = [
  'text',
  'body',
  'message',
  '*.text',
  '*.body',
  '*.message',
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'headers.cookie',
  'TELEGRAM_BOT_TOKEN',
  'GEMINI_API_KEY',
  'DB_PASSWORD',
  'SUPABASE_DB_URL',
];

function buildPino() {
  return pino({
    level: LEVEL,
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
      remove: false,
    },
    base: { app: 'scorehub' },
    transport: isDev
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' } }
      : undefined,
  });
}

// Console fallback con la misma forma que pino (info/warn/error/debug con merge).
function consoleShim() {
  const emit = (level) => (obj, msg) => {
    if (typeof obj === 'string') {
      console[level](obj);
    } else {
      const safe = { ...obj };
      for (const p of REDACT_PATHS) {
        const key = p.split('.').pop();
        if (key in safe) safe[key] = '[REDACTED]';
      }
      console[level](msg || '', safe);
    }
  };
  return { info: emit('log'), warn: emit('warn'), error: emit('error'), debug: emit('log'), child: () => module.exports };
}

const logger = pino ? buildPino() : consoleShim();

module.exports = logger;
module.exports.default = logger;
