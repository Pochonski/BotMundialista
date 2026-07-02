// Utilidades para enriquecer la respuesta de info de equipo
// Usa datos del Mundo 2026 + map de confederaciones hardcoded

const { EQUIPOS_MUNDIAL } = require('./constants');

// Mapa de confederaciones: nombre del equipo (API) -> confederación
const CONFEDERATIONS = {
  // CONMEBOL (Sudamérica)
  Argentina: 'CONMEBOL', Brazil: 'CONMEBOL', Uruguay: 'CONMEBOL', Colombia: 'CONMEBOL',
  Chile: 'CONMEBOL', Peru: 'CONMEBOL', Ecuador: 'CONMEBOL', Venezuela: 'CONMEBOL',
  Paraguay: 'CONMEBOL', Bolivia: 'CONMEBOL',
  // UEFA (Europa)
  Germany: 'UEFA', France: 'UEFA', England: 'UEFA', Spain: 'UEFA', Italy: 'UEFA',
  Portugal: 'UEFA', Netherlands: 'UEFA', Belgium: 'UEFA', Croatia: 'UEFA',
  Switzerland: 'UEFA', Poland: 'UEFA', Denmark: 'UEFA', Sweden: 'UEFA', Norway: 'UEFA',
  Austria: 'UEFA', Wales: 'UEFA', Scotland: 'UEFA', Ireland: 'UEFA', 'Czech Republic': 'UEFA',
  Hungary: 'UEFA', Romania: 'UEFA', Serbia: 'UEFA', Slovakia: 'UEFA', Finland: 'UEFA',
  Greece: 'UEFA', Ukraine: 'UEFA', Turkey: 'UEFA',
  // CONCACAF (Norte/Centroamérica y Caribe)
  Mexico: 'CONCACAF', USA: 'CONCACAF', Canada: 'CONCACAF', Jamaica: 'CONCACAF',
  Honduras: 'CONCACAF', 'Costa Rica': 'CONCACAF', Panama: 'CONCACAF', Guatemala: 'CONCACAF',
  // AFC (Asia)
  Japan: 'AFC', 'South Korea': 'AFC', 'Saudi Arabia': 'AFC', Iran: 'AFC',
  Australia: 'AFC', Qatar: 'AFC', 'United Arab Emirates': 'AFC',
  // CAF (África)
  Morocco: 'CAF', Senegal: 'CAF', Ghana: 'CAF', Cameroon: 'CAF', Nigeria: 'CAF',
  Egypt: 'CAF', Algeria: 'CAF', Tunisia: 'CAF', 'South Africa': 'CAF', Zambia: 'CAF',
  // OFC (Oceanía)
  'New Zealand': 'OFC', Fiji: 'OFC',
};

// Mapa de banderas (emoji) — rápido y bonito en Telegram
const FLAGS = {
  Argentina: '🇦🇷', Brazil: '🇧🇷', Uruguay: '🇺🇾', Colombia: '🇨🇴', Chile: '🇨🇱',
  Peru: '🇵🇪', Ecuador: '🇪🇨', Venezuela: '🇻🇪', Paraguay: '🇵🇾', Bolivia: '🇧🇴',
  Mexico: '🇲🇽', USA: '🇺🇸', Canada: '🇨🇦', Jamaica: '🇯🇲', Honduras: '🇭🇳',
  'Costa Rica': '🇨🇷', Panama: '🇵🇦', Guatemala: '🇬🇹',
  Germany: '🇩🇪', France: '🇫🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸', Italy: '🇮🇹',
  Portugal: '🇵🇹', Netherlands: '🇳🇱', Belgium: '🇧🇪', Croatia: '🇭🇷',
  Switzerland: '🇨🇭', Poland: '🇵🇱', Denmark: '🇩🇰', Sweden: '🇸🇪', Norway: '🇳🇴',
  Austria: '🇦🇹', Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Ireland: '🇮🇪',
  'Czech Republic': '🇨🇿', Hungary: '🇭🇺', Romania: '🇷🇴', Serbia: '🇷🇸',
  Slovakia: '🇸🇰', Finland: '🇫🇮', Greece: '🇬🇷', Ukraine: '🇺🇦', Turkey: '🇹🇷',
  Japan: '🇯🇵', 'South Korea': '🇰🇷', 'Saudi Arabia': '🇸🇦', Iran: '🇮🇷',
  Australia: '🇦🇺', Qatar: '🇶🇦', 'United Arab Emirates': '🇦🇪',
  Morocco: '🇲🇦', Senegal: '🇸🇳', Ghana: '🇬🇭', Cameroon: '🇨🇲', Nigeria: '🇳🇬',
  Egypt: '🇪🇬', Algeria: '🇩🇿', Tunisia: '🇹🇳', 'South Africa': '🇿🇦', Zambia: '🇿🇲',
  'New Zealand': '🇳🇿', Fiji: '🇫🇯',
};

/**
 * Devuelve un emoji de bandera para el equipo
 */
function getFlag(teamName) {
  if (!teamName) return '⚽';
  return FLAGS[teamName] || '⚽';
}

/**
 * Devuelve la confederación del equipo (o null si no es del Mundial 2026)
 */
function getConfederation(teamName) {
  if (!teamName) return null;
  return CONFEDERATIONS[teamName] || null;
}

/**
 * Calcula la forma reciente W/D/L a partir de partidos jugados
 * @param {Array} matches - partidos ya filtrados a jugados y ordenados DESC
 * @param {string} teamId
 * @param {number} limit
 * @returns {Object} { line: "✅✅❌🟰✅", wins: 3, draws: 1, losses: 1, played: 5 }
 */
function getRecentForm(matches, teamId, limit = 5) {
  const played = matches
    .filter(m => m.homeScore != null && m.awayScore != null)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);

  if (played.length === 0) {
    return { line: 'Sin partidos', wins: 0, draws: 0, losses: 0, played: 0 };
  }

  let wins = 0, draws = 0, losses = 0;
  const line = played.map(m => {
    const isHome = m.homeTeamId == teamId;
    const t = isHome ? m.homeScore : m.awayScore;
    const o = isHome ? m.awayScore : m.homeScore;
    if (t > o) { wins++; return '✅'; }
    if (t < o) { losses++; return '❌'; }
    draws++; return '🟰';
  }).join('');

  return { line, wins, draws, losses, played: played.length };
}

module.exports = {
  getFlag,
  getConfederation,
  getRecentForm,
  CONFEDERATIONS,
  FLAGS,
  EQUIPOS_MUNDIAL,
};
