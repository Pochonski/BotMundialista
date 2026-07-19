require('dotenv').config();

const api = require('../services/scores365Service');
const cosmos = require('../database/cosmos');

const COMPETITION_ID = parseInt(process.env.PRIMARY_COMPETITION_ID || '5930', 10);

function now() { return new Date().toISOString(); }
function log(msg) { console.log(`[${now()}] ${msg}`); }

async function main() {
  log('▶ Backfill competition_history');

  // 1. Read existing docs from Cosmos
  const existing = await cosmos.queryAll('competition_history', {
    query: `SELECT * FROM c WHERE c.competitionId = ${COMPETITION_ID} ORDER BY c.seasonNum ASC`,
  });
  log(`  → ${existing.length} docs en Cosmos`);

  // 2. Fetch fresh data from 365scores API
  const apiData = await api.getCompetitionHistory(COMPETITION_ID);
  const apiRows = apiData?.table?.rows || [];
  log(`  → ${apiRows.length} rows desde API`);

  if (apiRows.length === 0) {
    log('✘ No se obtuvieron datos de la API');
    process.exit(1);
  }

  // 3. Analyze each row
  let updated = 0;
  let complete = 0;
  let errors = 0;

  for (const row of apiRows) {
    try {
      const docId = `${COMPETITION_ID}-se${row.seasonNum}`;
      const existingDoc = existing.find(d => d.id === docId);

      // Check if existing doc has all fields
      const hasAllFields = existingDoc
        && existingDoc.title !== undefined
        && existingDoc.entityId !== undefined
        && existingDoc.secondaryTitle !== undefined
        && existingDoc.hasTable !== undefined;

      if (hasAllFields) {
        complete++;
        continue;
      }

      // Upsert with full row data
      const doc = {
        id: docId,
        competitionId: COMPETITION_ID,
        seasonNum: row.seasonNum,
        ...row,
        _fetchedAt: now(),
      };

      await cosmos.upsert('competition_history', doc);
      updated++;
      log(`  ✔ season ${row.seasonNum} actualizado`);
    } catch (e) {
      errors++;
      log(`  ✘ season ${row.seasonNum}: ${e.message}`);
    }
  }

  // 4. Report
  log('');
  log('═══════════════════════════════');
  log('  Resultado del backfill');
  log('═══════════════════════════════');
  log(`  Total rows API:  ${apiRows.length}`);
  log(`  Ya completos:    ${complete}`);
  log(`  Actualizados:    ${updated}`);
  log(`  Errores:         ${errors}`);
  log('═══════════════════════════════');

  process.exit(0);
}

main().catch(e => {
  log(`✘ Error fatal: ${e.message}`);
  process.exit(1);
});
