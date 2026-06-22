// Handler de resúmenes inteligentes
const footballApi = require('../services/footballApi');

/**
 * Genera un resumen automático de un partido
 */
async function generateSummary(home, away) {
  try {
    // Obtener últimos 5 partidos de cada equipo
    const [dataHome, dataAway] = await Promise.all([
      footballApi.getTeamMatches(home.id, 5),
      footballApi.getTeamMatches(away.id, 5)
    ]);

    const homeStats = calculateSummaryStats(dataHome.response, home.id);
    const awayStats = calculateSummaryStats(dataAway.response, away.id);

    // Generar resumen textual
    let summary = `📋 *RESUMEN: ${home.nombre} vs ${away.nombre}*\n\n`;

    // Forma reciente
    summary += `🇧🇷 *${home.nombre}*\n`;
    summary += `• ${homeStats.recentForm}\n`;
    summary += `• Promedio: ${homeStats.avgGoals} goles, ${homeStats.avgCorners} córners\n\n`;

    summary += `🇦🇷 *${away.nombre}*\n`;
    summary += `• ${awayStats.recentForm}\n`;
    summary += `• Promedio: ${awayStats.avgGoals} goles, ${awayStats.avgCorners} córners\n\n`;

    // H2H
    summary += `📊 *Antecedentes:*\n`;
    summary += `• En sus últimos 5 encuentros: ${homeStats.h2hWins}V - ${homeStats.h2hDraws}E - ${awayStats.h2hWins}D\n`;
    summary += `• Promedio de goles: ${((homeStats.avgGoals + awayStats.avgGoals) / 2).toFixed(1)}\n`;

    return summary;
  } catch (error) {
    console.error('Error generateSummary:', error);
    return `⚠️ No pude generar el resumen.`;
  }
}

/**
 * Calcula estadísticas resumidas
 */
function calculateSummaryStats(matches, teamId) {
  if (!matches || matches.length === 0) {
    return { recentForm: 'Sin datos', avgGoals: '0', avgCorners: '0', h2hWins: 0, h2hDraws: 0 };
  }

  let wins = 0, draws = 0, losses = 0;
  let goals = 0;
  let corners = 0;
  let h2hWins = 0, h2hDraws = 0;

  matches.forEach(m => {
    if (!m.score?.fulltime) return;

    const isHome = m.teams?.home?.id === teamId;
    const teamGoals = isHome ? m.score.fulltime.home : m.score.fulltime.away;
    const opponentGoals = isHome ? m.score.fulltime.away : m.score.fulltime.home;

    goals += teamGoals;

    if (teamGoals > opponentGoals) wins++;
    else if (teamGoals === opponentGoals) draws++;
    else losses++;

    // corners no disponibles en resumen básico - marcar como N/A
    corners = null;
  });

  const total = wins + draws + losses || 1;

  return {
    recentForm: `${wins} victorias, ${draws} empates, ${losses} derrotas`,
    avgGoals: (goals / total).toFixed(1),
    avgCorners: corners !== null ? (corners / total).toFixed(1) : 'N/A',
    h2hWins: wins,
    h2hDraws: draws
  };
}

module.exports = { generateSummary };