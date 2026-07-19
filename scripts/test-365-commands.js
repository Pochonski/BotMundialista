require('dotenv').config();
const matchSearch = require('../services/matchSearch');
const mundialista365 = require('../handlers/mundialista365Handler');
const mundialistaStats = require('../handlers/mundialistaStatsHandler');

const requiredMatchSearch = ['findGameByTeams', 'findLiveGames', 'findUpcomingGames', 'findGamesByCompetitorName', 'competitorMatches'];
const requiredHandler = [
  'getTipPartido', 'formatTipForGame', 'getTendencias', 'getTendenciasByTeams', 'getLiveGames',
  'getStatsVivo', 'getAlineacion', 'getPrevia', 'getH2H', 'getPredicciones',
];
const requiredStatsHandler = [
  'getNoticias', 'getEquipoIdeal', 'getBracket', 'getHistorial', 'getGoleadores',
];

let ok = 0, fail = 0;
function check(name, cond) {
  if (cond) { console.log(`  \u2713 ${name}`); ok++; }
  else { console.log(`  \u2717 ${name}`); fail++; }
}

console.log('-- matchSearch --');
for (const fn of requiredMatchSearch) check(`exports.${fn}`, typeof matchSearch[fn] === 'function');
check('COMPETITION_ID === 5930', matchSearch.COMPETITION_ID === 5930);

console.log('\n-- mundialista365Handler --');
for (const fn of requiredHandler) check(`exports.${fn}`, typeof mundialista365[fn] === 'function');
check('COMPETITION_ID === 5930', mundialista365.COMPETITION_ID === 5930);

console.log('\n-- mundialistaStatsHandler --');
for (const fn of requiredStatsHandler) check(`exports.${fn}`, typeof mundialistaStats[fn] === 'function');
check('COMPETITION_ID === 5930', mundialistaStats.COMPETITION_ID === 5930);

// Validar regex de /tip parsing (sin tocar API ni Cosmos)
const { execSync } = require('child_process');
const sample = '/tip brasil vs argentina';
const m = sample.replace(/^\/tip(?:@\w+)?\s+/i, '').trim().match(/^(.+?)\s+(?:vs\.?|y|contra|c\/)\s+(.+)$/i);
check('regex /tip "vs" parsea', !!m && m[1] === 'brasil' && m[2] === 'argentina');

const sample2 = '/tip México vs Francia';
const m2 = sample2.replace(/^\/tip(?:@\w+)?\s+/i, '').trim().match(/^(.+?)\s+(?:vs\.?|y|contra|c\/)\s+(.+)$/i);
check('regex /tip con acentos', !!m2 && /méxico/i.test(m2[1]) && /francia/i.test(m2[2]));

const sample3 = '/tip brasil  vs.  argentina';
const m3 = sample3.replace(/^\/tip(?:@\w+)?\s+/i, '').trim().match(/^(.+?)\s+(?:vs\.?|y|contra|c\/)\s+(.+)$/i);
check('regex /tip con vs.', !!m3);

console.log(`\nPasados: ${ok} · Fallados: ${fail}`);
process.exit(fail === 0 ? 0 : 1);