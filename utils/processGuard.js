/**
 * processGuard.js — Instala handlers de proceso para evitar caídas silenciosas.
 *
 * - `unhandledRejection`: loguea y deja correr (Node >= 15 terminaría el proceso).
 * - `uncaughtException`: loguea y termina con exit code 1 para que el supervisor
 *   (PM2, systemd, Vercel) lo reinicie limpio. Mantener este comportamiento es
 *   más seguro que seguir corriendo con estado corrupto.
 *
 * Uso: require('./utils/processGuard').install({ name: 'telegramBot' });
 * El segundo argumento es un logger opcional con .error/.warn; si no se pasa,
 * se usa console.
 */
function install({ name = 'process', logger = null } = {}) {
  const log = logger || console;

  process.on('unhandledRejection', (reason, promise) => {
    log.error(`[${name}] unhandledRejection:`, reason);
    // No terminamos: solo logueamos. Las promesas rechazadas sin handler
    // suelen ser bugs pero típicamente no comprometen el estado global.
  });

  process.on('uncaughtException', (err) => {
    log.error(`[${name}] uncaughtException:`, err && err.stack ? err.stack : err);
    // Estado potencialmente corrupto: salir limpio para que el supervisor reinicie.
    process.exit(1);
  });
}

module.exports = { install };
