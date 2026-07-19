require('dotenv').config();
const api = require('./scores365Service');
const { pool } = require('../database/connection');

const COMPETITION_ID = parseInt(process.env.PRIMARY_COMPETITION_ID || process.env.COMPETITION_ID || '5930', 10);
const CURRENT_SEASON = parseInt(process.env.PRIMARY_SEASON || process.env.CURRENT_SEASON || '25', 10);
const START_DATE = process.env.SYNC_START_DATE || '20260601';
const END_DATE = process.env.SYNC_END_DATE || '20260815';

const LOG_PREFIX = '[Sync]';

function log(...args) {
  console.log(LOG_PREFIX, ...args);
}

async function upsertMany(table, conflictCols, rows) {
  if (!rows.length) return;
  const conflictArr = Array.isArray(conflictCols) ? conflictCols : [conflictCols];
  const keys = Object.keys(rows[0]);
  const placeholders = rows.map((_, ri) =>
    '(' + keys.map((_, ci) => `$${ri * keys.length + ci + 1}`).join(', ') + ')'
  ).join(', ');

  const conflictClause = conflictArr.join(', ');
  const updates = keys
    .filter(k => !conflictArr.includes(k))
    .map(k => `${k} = EXCLUDED.${k}`)
    .join(', ');

  const values = rows.flatMap(r => keys.map(k => r[k]));

  const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${placeholders} ON CONFLICT (${conflictClause}) DO UPDATE SET ${updates}`;
  await pool.query(query, values);
}

async function upsertGames(games) {
  if (!games?.length) return;
  const rows = games.map(g => ({
    id: g.id,
    competition_id: g.competitionId ?? null,
    status_group: g.statusGroup ?? null,
    status_text: g.statusText ?? null,
    start_time: g.startTime ? new Date(g.startTime).toISOString() : null,
    home_competitor_id: g.homeCompetitorId ?? null,
    away_competitor_id: g.awayCompetitorId ?? null,
    home_score: g.homeScore ?? null,
    away_score: g.awayScore ?? null,
    stage: g.stage ?? null,
    season_num: g.seasonNum ?? null,
    data: JSON.stringify(g),
    updated_at: new Date().toISOString(),
  }));
  await upsertMany('games', 'id', rows);
}

async function syncGames() {
  log('Fetching all games...');
  try {
    const data = await api.getGamesAllScores(START_DATE, END_DATE, 1, {
      onlyMajorGames: true,
      withTop: true,
      showOdds: true,
    });
    const games = (data?.games ?? []).filter(g => g.competitionId === COMPETITION_ID);
    await upsertGames(games);
    log(`Synced ${games.length} games`);
  } catch (e) {
    log('Error syncing games:', e.message);
  }
}

async function syncLiveGames() {
  log('Fetching live games...');
  try {
    const data = await api.getGamesCurrent(COMPETITION_ID);
    const games = data?.games ?? [];
    await upsertGames(games);
    log(`Synced ${games.length} live games`);
  } catch (e) {
    log('Error syncing live games:', e.message);
  }
}

async function syncGamesResults() {
  log('Fetching results...');
  try {
    const data = await api.getGamesResults(COMPETITION_ID);
    const games = data?.games ?? [];
    await upsertGames(games);
    log(`Synced ${games.length} results`);
  } catch (e) {
    log('Error syncing results:', e.message);
  }
}

async function syncFixtures() {
  log('Fetching fixtures...');
  try {
    const data = await api.getFixtures(COMPETITION_ID);
    const games = data?.games ?? [];
    await upsertGames(games);
    log(`Synced ${games.length} fixtures`);
  } catch (e) {
    log('Error syncing fixtures:', e.message);
  }
}

async function syncStandings() {
  log('Fetching standings...');
  try {
    const data = await api.getStandings(COMPETITION_ID, 1, CURRENT_SEASON);
    const rows = [{
      competition_id: COMPETITION_ID,
      stage_num: 1,
      season_num: CURRENT_SEASON,
      data: JSON.stringify(data),
      updated_at: new Date().toISOString(),
    }];
    await upsertMany('standings', ['competition_id', 'stage_num', 'season_num'], rows);
    log('Synced standings');
  } catch (e) {
    log('Error syncing standings:', e.message);
  }
}

async function syncBrackets() {
  log('Fetching brackets...');
  try {
    const data = await api.getBrackets(COMPETITION_ID);
    const rows = [{
      competition_id: COMPETITION_ID,
      data: JSON.stringify(data),
      updated_at: new Date().toISOString(),
    }];
    await upsertMany('brackets', 'competition_id', rows);
    log('Synced brackets');
  } catch (e) {
    log('Error syncing brackets:', e.message);
  }
}

async function syncTournamentStats() {
  log('Fetching tournament stats...');
  try {
    const data = await api.getTournamentStats(COMPETITION_ID, CURRENT_SEASON);
    const rows = [{
      competition_id: COMPETITION_ID,
      season_num: CURRENT_SEASON,
      data: JSON.stringify(data),
      updated_at: new Date().toISOString(),
    }];
    await upsertMany('tournament_stats', ['competition_id', 'season_num'], rows);
    log('Synced tournament stats');
  } catch (e) {
    log('Error syncing tournament stats:', e.message);
  }
}

async function syncTeamOfWeek() {
  log('Fetching team of week...');
  try {
    const data = await api.getTeamOfWeek(COMPETITION_ID);
    const rows = [{
      competition_id: COMPETITION_ID,
      data: JSON.stringify(data),
      updated_at: new Date().toISOString(),
    }];
    await upsertMany('team_of_week', 'competition_id', rows);
    log('Synced team of week');
  } catch (e) {
    log('Error syncing team of week:', e.message);
  }
}

async function syncCompetitionHistory() {
  log('Fetching competition history...');
  try {
    const data = await api.getCompetitionHistory(COMPETITION_ID);
    const docs = data?.docs ?? [];
    const rows = docs.map(d => ({
      competition_id: COMPETITION_ID,
      season_num: d.seasonNum ?? null,
      data: JSON.stringify(d),
      updated_at: new Date().toISOString(),
    }));
    if (rows.length) {
      await upsertMany('competition_history', ['competition_id', 'season_num'], rows);
    }
    log(`Synced ${rows.length} history docs`);
  } catch (e) {
    log('Error syncing competition history:', e.message);
  }
}

async function syncNews() {
  log('Fetching news...');
  try {
    const data = await api.getNews('competition', COMPETITION_ID);
    const items = data?.news ?? [];
    const rows = items.map(n => ({
      id: n.id,
      scope: 'competition',
      entity_id: COMPETITION_ID,
      game_id: n.gameId ?? null,
      publish_date: n.publishDate ? new Date(n.publishDate).toISOString() : null,
      data: JSON.stringify(n),
      updated_at: new Date().toISOString(),
    }));
    await upsertMany('news', 'id', rows);
    log(`Synced ${rows.length} news items`);
  } catch (e) {
    log('Error syncing news:', e.message);
  }
}

async function syncTrends() {
  log('Fetching trends...');
  try {
    const data = await api.getTrends('competition', COMPETITION_ID);
    const items = data?.trends ?? [];
    const rows = items.map(t => ({
      scope: 'competition',
      entity_id: COMPETITION_ID,
      game_id: t.gameId ?? t.homeTeamGameId ?? null,
      line_type_id: t.lineTypeId ?? null,
      data: JSON.stringify(t),
      updated_at: new Date().toISOString(),
    }));
    await pool.query('DELETE FROM trends WHERE scope = $1 AND entity_id = $2', ['competition', COMPETITION_ID]);
    if (rows.length) {
      const placeholders = rows.map((_, i) =>
        `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
      ).join(', ');
      const values = rows.flatMap(r => [r.scope, r.entity_id, r.game_id, r.line_type_id, r.data]);
      await pool.query(
        `INSERT INTO trends (scope, entity_id, game_id, line_type_id, data, updated_at) VALUES ${placeholders}`,
        values
      );
    }
    log(`Synced ${rows.length} trends`);
  } catch (e) {
    log('Error syncing trends:', e.message);
  }
}

async function syncPredictions() {
  log('Fetching predictions...');
  try {
    const data = await api.getPredictions(1);
    const items = data?.predictions ?? [];
    const rows = items.map(p => ({
      game_id: p.gameId ?? p.id,
      data: JSON.stringify(p),
      updated_at: new Date().toISOString(),
    }));
    await upsertMany('predictions', 'game_id', rows);
    log(`Synced ${rows.length} predictions`);
  } catch (e) {
    log('Error syncing predictions:', e.message);
  }
}

async function syncOddsForGame(gameId) {
  try {
    const data = await api.getOddsLines(gameId);
    const rows = [{
      game_id: gameId,
      data: JSON.stringify(data),
      updated_at: new Date().toISOString(),
    }];
    await upsertMany('odds_lines', 'game_id', rows);
  } catch (e) {
    // Silently skip — some games may not have odds
  }
}

async function syncOdds() {
  log('Fetching odds for active games...');
  try {
    const { rows } = await pool.query(
      'SELECT id FROM games WHERE competition_id = $1 AND status_group IN (1, 2) ORDER BY start_time DESC LIMIT 20',
      [COMPETITION_ID]
    );
    let count = 0;
    for (const { id } of rows) {
      await syncOddsForGame(id);
      count++;
    }
    log(`Synced odds for ${count} games`);
  } catch (e) {
    log('Error syncing odds:', e.message);
  }
}

async function syncOutrights() {
  log('Fetching outrights...');
  try {
    const data = await api.getOutrights(COMPETITION_ID);
    const rows = [{
      competition_id: COMPETITION_ID,
      data: JSON.stringify(data),
      updated_at: new Date().toISOString(),
    }];
    await upsertMany('odds_outrights', 'competition_id', rows);
    log('Synced outrights');
  } catch (e) {
    log('Error syncing outrights:', e.message);
  }
}

async function syncGameDetailsForGame(gameId) {
  try {
    const [overview, h2h, preStats] = await Promise.allSettled([
      api.getGameOverview(gameId),
      api.getGameH2H(gameId, undefined, true),
      api.getGamePreStats(gameId),
    ]);

    if (overview.status === 'fulfilled') {
      const rows = [{
        game_id: gameId,
        data: JSON.stringify(overview.value),
        updated_at: new Date().toISOString(),
      }];
      await upsertMany('game_overviews', 'game_id', rows);
    }
    if (h2h.status === 'fulfilled') {
      const rows = [{
        game_id: gameId,
        data: JSON.stringify(h2h.value),
        updated_at: new Date().toISOString(),
      }];
      await upsertMany('game_h2h', 'game_id', rows);
    }
    if (preStats.status === 'fulfilled') {
      const rows = [{
        game_id: gameId,
        data: JSON.stringify(preStats.value),
        updated_at: new Date().toISOString(),
      }];
      await upsertMany('game_pre_stats', 'game_id', rows);
    }
  } catch (e) {
    // Silently skip
  }
}

async function syncGameDetails() {
  log('Fetching game details...');
  try {
    const { rows } = await pool.query(
      'SELECT id FROM games WHERE competition_id = $1 AND status_group IN (1, 2, 4) ORDER BY start_time DESC LIMIT 20',
      [COMPETITION_ID]
    );
    let count = 0;
    for (const { id } of rows) {
      await syncGameDetailsForGame(id);
      count++;
    }
    log(`Synced details for ${count} games`);
  } catch (e) {
    log('Error syncing game details:', e.message);
  }
}

async function syncLiveStats() {
  log('Fetching live stats...');
  try {
    const { rows } = await pool.query(
      'SELECT id FROM games WHERE competition_id = $1 AND status_group = 1',
      [COMPETITION_ID]
    );
    let count = 0;
    for (const { id } of rows) {
      try {
        const data = await api.getGameStats(id);
        const lastUpdateId = data?.lastUpdateId ?? 0;
        const rows_ = [{
          game_id: id,
          last_update_id: lastUpdateId,
          data: JSON.stringify(data),
          updated_at: new Date().toISOString(),
        }];
        await upsertMany('game_stats', 'game_id', rows_);
        count++;
      } catch (_) { /* skip */ }
    }
    log(`Synced live stats for ${count} games`);
  } catch (e) {
    log('Error syncing live stats:', e.message);
  }
}

async function syncCatalog() {
  log('Syncing catalog...');
  try {
    const [compData, topData] = await Promise.allSettled([
      api.getCompetition(COMPETITION_ID),
      api.getTopCompetitors(300),
    ]);

    if (compData.status === 'fulfilled') {
      const comps = compData.value?.competitions || [];
      const comp = comps[0];
      if (comp) {
        const rows = [{
          id: comp.id,
          data: JSON.stringify(compData.value),
          updated_at: new Date().toISOString(),
        }];
        await upsertMany('competitions', 'id', rows);
      }

      const competitors = compData.value?.competitors || [];
      const compRows = competitors.map(c => ({
        id: c.id,
        competition_id: COMPETITION_ID,
        name: c.name ?? null,
        data: JSON.stringify(c),
        updated_at: new Date().toISOString(),
      }));
      if (compRows.length) {
        await pool.query('DELETE FROM competitors WHERE competition_id = $1', [COMPETITION_ID]);
        await upsertMany('competitors', 'id', compRows);
      }
    }

    if (topData.status === 'fulfilled') {
      const competitors = topData.value?.competitors ?? [];
      for (const c of competitors) {
        const rows = [{
          id: c.id,
          competition_id: c.competitionId ?? null,
          name: c.name ?? null,
          data: JSON.stringify(c),
          updated_at: new Date().toISOString(),
        }];
        await upsertMany('competitors', 'id', rows);
      }
    }

    log('Synced catalog');
  } catch (e) {
    log('Error syncing catalog:', e.message);
  }
}

async function syncCountries() {
  log('Syncing countries...');
  try {
    const data = await api.getTopCompetitors(300);
    const list = data?.countries ?? [];
    const countries = new Map();
    for (const c of list) {
      if (c.id && !countries.has(c.id)) {
        countries.set(c.id, c);
      }
    }
    if (countries.size === 0) {
      const sports = data?.sports ?? [];
      for (const sport of sports) {
        for (const c of (sport.competitors ?? [])) {
          if (c.countryId && !countries.has(c.countryId)) {
            countries.set(c.countryId, { id: c.countryId, name: c.countryName ?? null });
          }
        }
      }
    }
    const rows = Array.from(countries.values()).map(c => ({
      id: c.id,
      name: c.name ?? null,
      data: JSON.stringify(c),
      updated_at: new Date().toISOString(),
    }));
    if (rows.length) {
      await upsertMany('countries', 'id', rows);
    }
    log(`Synced ${rows.length} countries`);
  } catch (e) {
    log('Error syncing countries:', e.message);
  }
}

async function syncAthletes() {
  log('Syncing athletes...');
  try {
    const { rows } = await pool.query(
      'SELECT data FROM game_overviews WHERE game_id IN (SELECT id FROM games WHERE competition_id = $1)',
      [COMPETITION_ID]
    );
    const seen = new Set();
    const athletes = [];
    for (const r of rows) {
      const members = r.data?.game?.members || r.data?.members || [];
      for (const m of members) {
        if (!m.id || seen.has(m.id)) continue;
        seen.add(m.id);
        athletes.push({
          id: m.id,
          name: m.name ?? null,
          data: JSON.stringify(m),
          updated_at: new Date().toISOString(),
        });
      }
    }
    for (const row of athletes) {
      await upsertMany('athletes', 'id', [row]);
    }
    log(`Synced ${athletes.length} athletes`);
  } catch (e) {
    log('Error syncing athletes:', e.message);
  }
}

async function syncVenues() {
  log('Syncing venues...');
  try {
    const { rows } = await pool.query(
      'SELECT data FROM game_overviews WHERE game_id IN (SELECT id FROM games WHERE competition_id = $1)',
      [COMPETITION_ID]
    );
    const seen = new Set();
    const venues = [];
    for (const r of rows) {
      const venue = r.data?.game?.venue;
      if (!venue?.id || seen.has(venue.id)) continue;
      seen.add(venue.id);
      venues.push({
        id: venue.id,
        name: venue.name ?? null,
        city: venue.city ?? null,
        country_id: venue.countryId ?? null,
        capacity: venue.capacity ?? null,
        data: JSON.stringify(venue),
        updated_at: new Date().toISOString(),
      });
    }
    for (const row of venues) {
      await upsertMany('venues', 'id', [row]);
    }
    log(`Synced ${venues.length} venues`);
  } catch (e) {
    log('Error syncing venues:', e.message);
  }
}

async function syncAll() {
  log('Running full sync...');
  await syncCatalog();
  await syncCountries();
  await syncGames();
  await syncLiveGames();
  await syncGamesResults();
  await syncFixtures();
  await syncStandings();
  await syncBrackets();
  await syncTournamentStats();
  await syncTeamOfWeek();
  await syncCompetitionHistory();
  await syncNews();
  await syncTrends();
  await syncPredictions();
  await syncOutrights();
  await syncOdds();
  await syncGameDetails();
  await syncLiveStats();
  await syncAthletes();
  await syncVenues();
  log('Full sync complete');
}

module.exports = {
  syncGames,
  syncLiveGames,
  syncGamesResults,
  syncFixtures,
  syncStandings,
  syncBrackets,
  syncTournamentStats,
  syncTeamOfWeek,
  syncCompetitionHistory,
  syncNews,
  syncTrends,
  syncPredictions,
  syncOdds,
  syncOutrights,
  syncGameDetails,
  syncLiveStats,
  syncCatalog,
  syncCountries,
  syncAthletes,
  syncVenues,
  syncAll,
};
