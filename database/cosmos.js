// cosmos.js — ELIMINADO.
// Cosmos DB fue reemplazado por 365scores API directa (dashboard)
// y Supabase PostgreSQL (bot data).
// Ver docs/migration-supabase-vercel.md

const errorMsg = '[cosmos.js] Cosmos DB ya no está disponible. Los datos ahora vienen de 365scores API directa (dashboard) y Supabase PostgreSQL (bot).';

const stub = new Proxy({}, {
  get() {
    return async () => { throw new Error(errorMsg); };
  },
});

module.exports = stub;
