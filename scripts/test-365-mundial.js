require('dotenv').config();

const api = require('../services/scores365Service');
const cosmos = require('../database/cosmos');

const MUNDIAL_ID = parseInt(process.env.SCORES365_COMPETITION_MUNDIAL || '5930', 10);

const C = { r: '\x1b[0m', g: '\x1b[32m', y: '\x1b[33m', b: '\x1b[34m', cy: '\x1b[36m', bld: '\x1b[1m', dim: '\x1b[2m', red: '\x1b[31m' };
const ok = (m) => console.log(`  ${C.g}✓${C.r} ${m}`);
const info = (m) => console.log(`  ${C.cy}ℹ${C.r} ${m}`);
const fail = (m) => console.log(`  ${C.red}✗${C.r} ${m}`);
const title = (m) => console.log(`\n${C.bld}${C.b}${m}${C.r}`);
const dim = (m) => console.log(`  ${C.dim}${m}${C.r}`);
const pad = (s, n) => { s = String(s ?? ''); return s.length < n ? s + ' '.repeat(n - s.length) : s.slice(0, n); };

let passed = 0, failed = 0;
function check(name, condition, details = '') {
  if (condition) { ok(name); passed++; }
  else { fail(`${name}${details ? ` — ${details}` : ''}`); failed++; }
}

async function header(titleText) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(`${C.bld}${titleText}${C.r}`);
  console.log('='.repeat(72));
}

async function step(name, fn) {
  const start = Date.now();
  try {
    const r = await fn();
    const ms = Date.now() - start;
    info(`${name} (${ms}ms)`);
    return r;
  } catch (e) {
    fail(`${name}: ${e.message}`);
    failed++;
    return null;
  }
}

async function cosmosHealth() {
  await header('1. COSMOS HEALTH CHECK');
  const h = await step('health', () => cosmos.health());
  check('Cosmos db accesible', h?.ok === true, h?.error);
  check('database = scores365', h?.database === 'scores365', `got: ${h?.database}`);
}

async function countWithRetry(containerName, attempts = 5, delayMs = 800) {
  for (let i = 0; i < attempts; i++) {
    const n = await cosmos.count(containerName).catch(() => -1);
    if (n > 0) return n;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return await cosmos.count(containerName).catch(() => -1);
}

async function containerCounts() {
  await header('2. CONTAINER COUNTS (con retry por consistencia eventual)');
  const required = [
    'catalog', 'games', 'game_overviews', 'game_pre_stats', 'game_h2h',
    'standings', 'tournament_stats', 'predictions',
    'athletes', 'athlete_careers', 'athlete_trophies', 'athlete_transfers',
    'athlete_chart_events', 'athlete_next_games',
    'brackets', 'competition_history', 'highlights',
    'trends', 'news', 'betting_tips',
  ];
  const lazy = ['game_snapshots', 'odds_lines', 'odds_misc', 'fixtures', 'athlete_games'];

  info(`contando ${required.length} contenedores en paralelo (con retry)...`);
  const t0 = Date.now();
  const requiredCounts = await Promise.all(required.map((c) => countWithRetry(c).then((n) => [c, n])));
  info(`  ${((Date.now() - t0) / 1000).toFixed(2)}s`);

  for (const [c, n] of requiredCounts) {
    check(`${c} > 0`, typeof n === 'number' && n > 0, `count=${n}`);
  }

  console.log(`\n     ${C.dim}— Contenedores lazy (se llenan con poller/lazy-load, no con bootstrap):${C.r}`);
  const lazyCounts = await Promise.all(lazy.map((c) => cosmos.count(c).then((n) => [c, n]).catch(() => [c, 0])));
  for (const [c, n] of lazyCounts) {
    info(`${c} = ${n} (esperado 0 o algunos)`);
  }
}

async function teamStatsOutput(gameId) {
  const latest = await cosmos.queryAll('game_snapshots',
    'SELECT c.statistics FROM c WHERE c.gameId = @g ORDER BY c._ts DESC OFFSET 0 LIMIT 1',
    { parameters: [{ name: '@g', value: Number(gameId) }] });
  const stats = latest[0]?.statistics || [];
  const homeStats = stats.filter((s) => s.competitorId);
  const homeId = homeStats[0]?.competitorId;
  const awayId = homeStats.find((s) => s.competitorId !== homeId)?.competitorId;
  const byCat = { Top: [], Remates: [], Pases: [], Defensivas: [], Duelos: [], Disciplinarias: [] };
  for (const s of stats) {
    const cat = s.categoryName || 'Top';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(s);
  }
  const home = (id) => stats.filter((s) => s.competitorId === id).map((s) => [s.name, s.value]);
  const fmt = (s) => `${pad(s.name, 32)} ${pad(s.value, 8)}`;
  console.log(`     ${pad('Métrica', 32)} ${pad('Local', 10)} ${pad('Visitante', 10)}`);
  for (const cat of Object.keys(byCat)) {
    const list = byCat[cat];
    if (!list.length) continue;
    console.log(`     ${C.bld}[${cat}]${C.r}`);
    const statMap = new Map(list.map((s) => [s.id, s]));
    const seen = new Set();
    for (const s of list) {
      const partner = list.find((x) => x.id === s.id && x.competitorId !== s.competitorId);
      const local = s.competitorId === homeId ? s.value : partner?.value;
      const visit = s.competitorId === awayId ? s.value : partner?.value;
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      console.log(`       ${pad(s.name, 30)} ${pad(local ?? '-', 10)} ${pad(visit ?? '-', 10)}`);
    }
  }
}

async function gameStatsTest() {
  await header('3. GAME STATS DESDE COSMOS (último snapshot de partidos finalizados)');
  const games = await step('listar Mundial games finalizados', () =>
    cosmos.queryAll('games',
      'SELECT c.id, c.homeCompetitor, c.awayCompetitor, c.statusGroup FROM c WHERE c.competitionId = 5930 AND c.statusGroup = 4 ORDER BY c.startTime DESC OFFSET 0 LIMIT 3'));
  check('>= 3 partidos finalizados', games.length >= 3, `got: ${games.length}`);

  for (const g of games) {
    console.log(`\n     ${C.bld}${g.homeCompetitor?.name} vs ${g.awayCompetitor?.name}${C.r} (id=${g.id})`);
    let snapshots = await step(`overviews game ${g.id}`, () =>
      cosmos.queryAll('game_overviews',
        { query: 'SELECT c.lastUpdateId, c.fetchedAt FROM c WHERE c.gameId = @g ORDER BY c._ts DESC OFFSET 0 LIMIT 1', parameters: [{ name: '@g', value: Number(g.id) }] }));
    for (let i = 0; i < 3 && snapshots.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      snapshots = await cosmos.queryAll('game_overviews',
        { query: 'SELECT c.lastUpdateId, c.fetchedAt FROM c WHERE c.gameId = @g ORDER BY c._ts DESC OFFSET 0 LIMIT 1', parameters: [{ name: '@g', value: Number(g.id) }] });
    }
    check(`overview existe para ${g.id}`, snapshots.length > 0);
    if (snapshots[0]) info(`lastUpdateId=${snapshots[0].lastUpdateId}, fetchedAt=${snapshots[0].fetchedAt}`);

    let fullSnap = await step(`overview completo ${g.id}`, () =>
      cosmos.queryAll('game_overviews',
        { query: 'SELECT c.members, c.game FROM c WHERE c.gameId = @g ORDER BY c._ts DESC OFFSET 0 LIMIT 1', parameters: [{ name: '@g', value: Number(g.id) }] }));
    for (let i = 0; i < 3 && (!fullSnap[0]?.game?.members && !fullSnap[0]?.members); i++) {
      await new Promise((r) => setTimeout(r, 1000));
      fullSnap = await cosmos.queryAll('game_overviews',
        { query: 'SELECT c.members, c.game FROM c WHERE c.gameId = @g ORDER BY c._ts DESC OFFSET 0 LIMIT 1', parameters: [{ name: '@g', value: Number(g.id) }] });
    }
    const overview = fullSnap[0];
    const squadMembers = overview?.members || overview?.game?.members || [];
    const lineupHome = overview?.game?.homeCompetitor?.lineups?.members || [];
    const lineupAway = overview?.game?.awayCompetitor?.lineups?.members || [];
    const lineupMembers = [...lineupHome, ...lineupAway];
    const allMembers = [...squadMembers, ...lineupMembers];
    check(`${g.id} squad >= 20`, squadMembers.length >= 20, `got squad=${squadMembers.length}, lineup=${lineupMembers.length}`);
    const hasGK = lineupMembers.some((m) => m.position?.name === 'Portero');
    const hasST = lineupMembers.some((m) => m.position?.name === 'Delantero' || m.position?.name === 'Centro Delantero');
    check(`${g.id} incluye Portero`, hasGK, `lineup=${lineupMembers.length}`);
    check(`${g.id} incluye Delantero`, hasST, `lineup=${lineupMembers.length}`);
  }
}

async function liveDeltaTest() {
  await header('4. LIVE DELTA via lastUpdateId (statusGroup 2=Prog., 1=En vivo)');
  const games = await step('listar juegos del Mundial próximos o en vivo', () =>
    cosmos.queryAll('games',
      'SELECT c.id, c.homeCompetitor, c.awayCompetitor, c.statusGroup, c.statusText FROM c WHERE c.competitionId = 5930 AND (c.statusGroup = 1 OR c.statusGroup = 2) ORDER BY c.startTime ASC OFFSET 0 LIMIT 2'));
  if (!games.length) {
    info('sin juegos en vivo o próximos → saltando test live delta');
    return;
  }
  for (const g of games) {
    info(`${g.homeCompetitor?.name} vs ${g.awayCompetitor?.name} (id=${g.id}, status: ${g.statusText})`);
    const stateId = `state:${g.id}`;
    const state = await step(`leer state ${g.id}`, () => cosmos.getById('games', stateId, MUNDIAL_ID));

    const data = await step(`GET /web/game/stats/?games=${g.id} (sin lastUpdateId)`, () =>
      api.getGameStats(g.id, undefined));
    check(`response.lastUpdateId > 0`, data.lastUpdateId > 0, `got: ${data.lastUpdateId}`);
    const stats = data.statistics || [];
    check(`response.statistics es array o vacío`, Array.isArray(stats));
    check(`response.statistics tiene >= 30 stats (en vivo o finalizado)`,
      stats.length >= 30 || g.statusGroup === 2,
      `got: ${stats.length} stats, status: ${g.statusText}`);
    info(`  → response.lastUpdateId=${data.lastUpdateId}, requestedUpdateId=${data.requestedUpdateId}, ttl=${data.ttl}s`);
    info(`  → ${stats.length} stats (snapshot completo inicial)`);

    if (state?.lastUpdateId) {
      const data2 = await step(`GET /web/game/stats/?games=${g.id}&lastUpdateId=${state.lastUpdateId}`, () =>
        api.getGameStats(g.id, state.lastUpdateId));
      const delta = data2.lastUpdateId - state.lastUpdateId;
      info(`  → delta: ${data2.lastUpdateId} - ${state.lastUpdateId} = ${delta}`);
      check('delta >= 0', delta >= 0);
      check('delta <= 1 (sin saltos)', delta <= 1, `delta=${delta}`);
    } else {
      info(`  (sin state previo; primer poll)`);
    }
  }
}

async function athleteTest() {
  await header('5. ATLETAS (CR7 = 817)');
  const cr7 = await step('getAthlete(817)', () => cosmos.getById('athletes', '817', '817'));
  check('CR7 ingestado', cr7 !== null);
  if (cr7) {
    check('CR7.name = Cristiano Ronaldo', cr7.name === 'Cristiano Ronaldo', `got: ${cr7.name}`);
    check('CR7.age = 41', cr7.age === 41, `got: ${cr7.age}`);
    check('CR7.clubId = 7549 (Al Nassr)', cr7.clubId === 7549);
    check('CR7.nationalTeamId = 5028 (Portugal)', cr7.nationalTeamId === 5028);
    info(`Position: ${cr7.position?.name} ${cr7.formationPosition?.name}, contract: ${cr7.contractUntil}`);
  }

  const trophies = await step('trophies CR7', () => cosmos.getById('athlete_trophies', '817', '817'));
  check('trophies CR7 ingestadas', trophies !== null);
  if (trophies?.categories) {
    const club = trophies.categories.find((c) => c.type === 2);
    check('CR7 tiene categoría Club', !!club);
    if (club) info(`  ${club.trophies.length} trofeos de club`);
    const intl = trophies.categories.find((c) => c.type === 3);
    check('CR7 tiene categoría Internacional', !!intl);
    if (intl) info(`  ${intl.trophies.length} trofeos internacionales`);
  }

  const careers = await step('careers CR7', () =>
    cosmos.queryAll('athlete_careers', 'SELECT c.seasonKey, c.name, c.shortName FROM c WHERE c.athleteId = 817 ORDER BY c.seasonKey DESC'));
  check('CR7 >= 10 temporadas', careers.length >= 10, `got: ${careers.length}`);
  if (careers[0]) info(`  Última temporada: ${careers[0].shortName || careers[0].name || careers[0].seasonKey} (${careers[0].seasonKey})`);

  const transfers = await step('transfers CR7', () =>
    cosmos.queryAll('athlete_transfers', 'SELECT c.date, c.competitorId, c.transferTitle FROM c WHERE c.athleteId = 817'));
  check('CR7 >= 3 transfers', transfers.length >= 3, `got: ${transfers.length}`);
  transfers.slice(0, 3).forEach((t) => info(`  ${t.date}: ${t.transferTitle || '(sin título)'}`));
}

async function bracketsAndHistoryTest() {
  await header('6. BRACKETS Y HISTORIAL');
  const brackets = await step('brackets Mundial', () => cosmos.getById('brackets', String(MUNDIAL_ID), String(MUNDIAL_ID)));
  check('brackets Mundial existe', brackets !== null);
  if (brackets?.brackets?.[0]?.stages) {
    const stages = brackets.brackets[0].stages;
    const groups = stages[0]?.groups || [];
    check('12 grupos fase de grupos', groups.length === 12, `got: ${groups.length}`);
    info(`Stages: ${stages.map((s) => s.name).join(' → ')}`);
  }

  const history = await step('competition_history', () =>
    cosmos.queryAll('competition_history', 'SELECT c.seasonNum FROM c WHERE c.competitionId = 5930 ORDER BY c.seasonNum ASC'));
  check('history >= 20 ediciones', history.length >= 20, `got: ${history.length}`);
  info(`  Ediciones: ${history.map((h) => h.seasonNum).join(', ')}`);

  const hist2022 = await step('history 2022 detalle', () =>
    cosmos.getById('competition_history', `${MUNDIAL_ID}-se16`, String(MUNDIAL_ID)));
  if (hist2022) {
    const participants = hist2022.group?.participants || [];
    check('Final 2022 = Argentina vs Francia',
      participants.some((p) => p.name === 'Argentina') &&
      participants.some((p) => p.name === 'Francia'));
    info(`  Final 2022 venue: ${hist2022.group?.games?.[0]?.venue?.name || 'sin venue'}`);
  }
}

async function newsTrendsTipsTest() {
  await header('7. NEWS, TRENDS, BETTING TIPS');
  const news = await step('news Mundial', () =>
    cosmos.queryAll('news', 'SELECT c.title, c.publishDate FROM c WHERE c.competitionId = 5930 ORDER BY c.publishDate DESC'));
  check('>= 10 news Mundial', news.length >= 10, `got: ${news.length}`);
  news.slice(0, 3).forEach((n) => info(`  [${n.publishDate}] ${n.title}`));

  const trendsTop = await step('top trends Mundial', () =>
    cosmos.queryAll('trends', { query: 'SELECT c.text, c.percentage, c.betCTA, c.lineTypeId FROM c WHERE c.scope = @s ORDER BY c.percentage DESC', parameters: [{ name: '@s', value: 'competition' }] }));
  check('>= 5 top trends', trendsTop.length >= 5, `got: ${trendsTop.length}`);
  trendsTop.slice(0, 3).forEach((t) => info(`  ${(t.percentage * 100).toFixed(1)}% → ${t.betCTA} (${t.text})`));

  const tips = await step('betting tips', () =>
    cosmos.queryAll('betting_tips', 'SELECT c.gameId, c.confidenceScore, ARRAY_LENGTH(c.topTrends) AS tcount FROM c ORDER BY c.confidenceScore DESC OFFSET 0 LIMIT 5'));
  check('>= 5 betting tips', tips.length >= 5, `got: ${tips.length}`);
  tips.forEach((t) => info(`  game=${t.gameId} score=${t.confidenceScore} trends=${t.tcount}`));

  const gameTrends = await step('trends por game', () =>
    cosmos.queryAll('trends', { query: 'SELECT c.gameId, COUNT(1) AS c FROM c WHERE c.scope = @s GROUP BY c.gameId', parameters: [{ name: '@s', value: 'game' }] }));
  check('trends cargados para >= 10 partidos', gameTrends.length >= 10, `got: ${gameTrends.length}`);
}

async function standingsTest() {
  await header('8. STANDINGS + TOURNAMENT STATS');
  const standings = await step('standings fase grupos', () =>
    cosmos.getById('standings', `${MUNDIAL_ID}-s1-se25`, String(MUNDIAL_ID)));
  check('standings existe', standings !== null);
  if (standings?.standings?.[0]?.rows) {
    const allRows = standings.standings.flatMap((s) => s.rows || []);
    const teams = new Set(allRows.map((r) => r.competitor?.name).filter(Boolean));
    check('>= 48 equipos en standings', teams.size >= 48, `got: ${teams.size}`);
    const sample = allRows[0];
    info(`  Top: ${sample?.competitor?.name} (${sample?.points} pts, +${sample?.ratio} GD, ${sample?.gamesWon}W ${sample?.gamesEven}D ${sample?.gamesLost}L)`);
  }

  const tStats = await step('tournament stats', () =>
    cosmos.queryAll('tournament_stats', 'SELECT c.statKey, c.payload FROM c'));
  check('>= 1 stat block', tStats.length >= 1, `got: ${tStats.length}`);
  tStats.forEach((s) => {
    const blocks = s.payload ? Object.keys(s.payload).length : 0;
    info(`  statKey=${s.statKey} payload blocks=${blocks}`);
  });
}

async function main() {
  console.log(`${C.bld}BotMundialista · Cosmos DB + 365scores · Test E2E Mundial 2026${C.r}`);
  console.log(`${C.dim}Cosmos: ${process.env.COSMOS_ENDPOINT}${C.r}`);

  await cosmosHealth();
  await containerCounts();
  await gameStatsTest();
  await liveDeltaTest();
  await athleteTest();
  await bracketsAndHistoryTest();
  await newsTrendsTipsTest();
  await standingsTest();

  await header('RESUMEN');
  console.log(`  ${C.g}Pasados: ${passed}${C.r}`);
  console.log(`  ${failed ? C.red : C.g}Fallados: ${failed}${C.r}`);
  if (failed === 0) {
    console.log(`\n  ${C.g}${C.bld}✔ TODO OK — Cosmos DB funcional con Mundial 2026 ingestado${C.r}\n`);
    process.exit(0);
  } else {
    console.log(`\n  ${C.red}${C.bld}✗ Hay ${failed} checks que fallaron${C.r}\n`);
    process.exit(1);
  }
}

main().catch((e) => { console.error('FATAL:', e); process.exit(2); });