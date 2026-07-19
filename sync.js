require('dotenv').config();
const cron = require('node-cron');
const sync = require('./services/syncService');
const { testConnection } = require('./database/connection');

async function main() {
  const connected = await testConnection();
  if (!connected) {
    console.error('[Sync] Cannot connect to database. Exiting.');
    process.exit(1);
  }

  // Run full sync immediately on startup
  console.log('[Sync] Starting initial full sync...');
  await sync.syncAll();

  // Schedule recurring jobs
  // Live games — every 15 seconds
  cron.schedule('*/15 * * * * *', sync.syncLiveGames);
  cron.schedule('*/15 * * * * *', sync.syncLiveStats);

  // Games, results, fixtures — every 60 seconds
  cron.schedule('*/60 * * * * *', sync.syncGames);
  cron.schedule('*/60 * * * * *', sync.syncGamesResults);
  cron.schedule('*/60 * * * * *', sync.syncFixtures);

  // Standings, trends — every 2 minutes
  cron.schedule('*/2 * * * *', sync.syncStandings);
  cron.schedule('*/2 * * * *', sync.syncTrends);

  // Predictions, odds — every 5 minutes
  cron.schedule('*/5 * * * *', sync.syncPredictions);
  cron.schedule('*/5 * * * *', sync.syncOdds);

  // Brackets, tournament stats, team of week, game details, outrights, venues, athletes — every 10 minutes
  cron.schedule('*/10 * * * *', sync.syncBrackets);
  cron.schedule('*/10 * * * *', sync.syncTournamentStats);
  cron.schedule('*/10 * * * *', sync.syncTeamOfWeek);
  cron.schedule('*/10 * * * *', sync.syncGameDetails);
  cron.schedule('*/10 * * * *', sync.syncOutrights);
  cron.schedule('*/10 * * * *', sync.syncVenues);
  cron.schedule('*/10 * * * *', sync.syncAthletes);

  // News — every 10 minutes
  cron.schedule('*/10 * * * *', sync.syncNews);

  // Catalog and countries — every 6 hours
  cron.schedule('0 */6 * * *', sync.syncCatalog);
  cron.schedule('0 */6 * * *', sync.syncCountries);

  // History — every 24 hours
  cron.schedule('0 3 * * *', sync.syncCompetitionHistory);



  console.log('[Sync] All cron jobs scheduled. Service running.');
  console.log('[Sync] Press Ctrl+C to stop.');
}

main().catch(err => {
  console.error('[Sync] Fatal error:', err);
  process.exit(1);
});
