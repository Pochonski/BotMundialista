/**
 * jobGuard.js — Mutex por nombre para evitar solapamiento de tareas periódicas.
 *
 * node-cron no salta ejecuciones si la anterior sigue corriendo. Para crons
 * frecuentes (15s, 60s) y llamadas a APIs externas que pueden tardar más que
 * el intervalo, esto evita acumular instancias del mismo job y saturar la DB
 * o el upstream.
 *
 * Uso:
 *   const guard = require('../utils/jobGuard');
 *   cron.schedule(every15secs, guard.wrap('syncLiveGames', sync.syncLiveGames));
 *
 * Si una corrida lanza, se loguea el error y el guard se libera (gracias al
 * finally). El error no se propaga al caller para no romper node-cron.
 */
const running = new Map();

function isRunning(name) {
  return running.get(name) === true;
}

/**
 * Envuelve un handler async para que no se solape consigo mismo.
 */
function wrap(name, fn) {
  return async (...args) => {
    if (running.get(name)) {
      console.warn(`[jobGuard] "${name}" saltada: ya en curso`);
      return;
    }
    running.set(name, true);
    try {
      await fn(...args);
    } catch (e) {
      console.error(`[jobGuard] "${name}" falló:`, e.message);
    } finally {
      running.set(name, false);
    }
  };
}

module.exports = { wrap, isRunning };
