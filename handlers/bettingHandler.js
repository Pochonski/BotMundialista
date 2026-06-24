// Handler de análisis para apuestas - Mundial 2026
const footballApi = require('../services/footballApi');
const { formatAnalisis } = require('../utils/formatters');

/**
 * Analiza un enfrentamiento entre dos equipos
 */
async function analizarEnfrentamiento(home, away) {
  try {
    let homeTeam, awayTeam;

    if (home.buscarDinamico || !home.id) {
      homeTeam = await footballApi.buscarEquipoDinamico(home.nombre || home);
    } else {
      homeTeam = { id: home.id, name: home.nombre };
    }

    if (away.buscarDinamico || !away.id) {
      awayTeam = await footballApi.buscarEquipoDinamico(away.nombre || away);
    } else {
      awayTeam = { id: away.id, name: away.nombre };
    }

    if (!homeTeam) {
      return `⚠️ No encontré al equipo "${home.nombre || home}"`;
    }
    if (!awayTeam) {
      return `⚠️ No encontré al equipo "${away.nombre || away}"`;
    }

    const homeMatches = await footballApi.getTeamMatches(homeTeam.id, 10);
    const awayMatches = await footballApi.getTeamMatches(awayTeam.id, 10);

    const homeStats = calculateTeamStats(homeMatches, homeTeam.name);
    const awayStats = calculateTeamStats(awayMatches, awayTeam.name);

    // Buscar H2H
    const h2h = homeMatches.find(m =>
      m.homeTeam?.toLowerCase().includes(awayTeam.name.toLowerCase()) ||
      m.awayTeam?.toLowerCase().includes(awayTeam.name.toLowerCase())
    );

    const analisis = {
      home: {
        name: homeTeam.name,
        form: homeStats.form,
        goalsPerMatch: homeStats.goalsPerMatch,
        cornersPerMatch: homeStats.cornersPerMatch,
        homeRecord: homeStats.record
      },
      away: {
        name: awayTeam.name,
        form: awayStats.form,
        goalsPerMatch: awayStats.goalsPerMatch,
        cornersPerMatch: awayStats.cornersPerMatch,
        awayRecord: awayStats.record
      },
      stats: {
        btts: h2h ? (h2h.homeScore > 0 && h2h.awayScore > 0 ? '70' : '40') : 'N/D',
        over25: h2h ? (h2h.homeScore + h2h.awayScore > 2 ? '65' : '45') : 'N/D',
        cornersOver: '55-65'
      }
    };

    return formatAnalisis(analisis.home, analisis.away, analisis.stats);
  } catch (error) {
    console.error('Error analizarEnfrentamiento:', error);
    return `⚠️ No pude analizar ${home.nombre || home} vs ${away.nombre || away}.`;
  }
}

/**
 * Analiza un solo equipo
 */
async function analizarEquipo(equipo) {
  try {
    // Handle string equipo (from parser/telegram)
    let teamId = typeof equipo === 'object' ? equipo.id : null;
    let teamName = typeof equipo === 'object' ? equipo.nombre : equipo;
    const buscarDinamico = typeof equipo === 'object' ? equipo.buscarDinamico : true;

    if (!teamId || buscarDinamico) {
      const team = await footballApi.buscarEquipoDinamico(teamName);
      if (!team) {
        return `⚠️ No encontré al equipo "${teamName}".`;
      }
      teamId = team.id;
      teamName = team.name;
    }

    const matches = await footballApi.getTeamMatches(teamId, 10);
    const stats = calculateTeamStats(matches, teamName);

    const goals = isNaN(stats.goalsPerMatch) ? '-' : stats.goalsPerMatch;
    const corners = stats.cornersPerMatch === 'N/A' ? 'N/A' : (isNaN(stats.cornersPerMatch) ? '-' : stats.cornersPerMatch);

    let msg = `📈 *ANÁLISIS: ${teamName}*\n\n`;
    msg += `📊 *Rendimiento general*\n`;
    msg += `• Últimos ${matches.length}: ${stats.form}\n`;
    msg += `• Goles/partido: ${goals}\n`;
    msg += `• Promedio corners: ${corners}\n\n`;
    msg += `🏠 *Local:* ${stats.homeRecord}\n`;
    msg += `✈️ *Visitante:* ${stats.awayRecord}\n`;

    return msg;
  } catch (error) {
    console.error('Error analizarEquipo:', error);
    return `⚠️ No pude analizar ${typeof equipo === 'object' ? equipo.nombre : equipo}.`;
  }
}

/**
 * Calcula estadísticas agregadas de un equipo
 */
function calculateTeamStats(matches, teamName) {
  if (!matches || matches.length === 0) {
    return { form: '-', goalsPerMatch: '0', cornersPerMatch: 'N/A', record: '-', homeRecord: '-', awayRecord: '-' };
  }

  let wins = 0, draws = 0, losses = 0;
  let homeWins = 0, homeDraws = 0, homeLosses = 0;
  let awayWins = 0, awayDraws = 0, awayLosses = 0;
  let goals = 0;

  matches.forEach(m => {
    if (m.homeScore === null || m.homeScore === undefined) return;
    if (m.awayScore === null || m.awayScore === undefined) return;

    const isHome = m.homeTeam?.toLowerCase().includes(teamName.toLowerCase());
    const teamGoals = isHome ? m.homeScore : m.awayScore;
    const opponentGoals = isHome ? m.awayScore : m.homeScore;

    if (typeof teamGoals !== 'number' || typeof opponentGoals !== 'number') return;

    goals += teamGoals;

    if (teamGoals > opponentGoals) {
      wins++;
      if (isHome) homeWins++; else awayWins++;
    } else if (teamGoals === opponentGoals) {
      draws++;
      if (isHome) homeDraws++; else awayDraws++;
    } else {
      losses++;
      if (isHome) homeLosses++; else awayLosses++;
    }
  });

  const total = wins + draws + losses;

  if (total === 0) {
    return {
      form: '-',
      goalsPerMatch: Number.NaN,
      cornersPerMatch: 'N/A',
      record: '-',
      homeRecord: '-',
      awayRecord: '-'
    };
  }

  return {
    form: `${wins}V ${draws}E ${losses}D`,
    goalsPerMatch: parseFloat((goals / total).toFixed(1)),
    cornersPerMatch: 'N/A', // API básica no tiene corners
    record: `${wins}V ${draws}E ${losses}D`,
    homeRecord: `${homeWins}V ${homeDraws}E ${homeLosses}D`,
    awayRecord: `${awayWins}V ${awayDraws}E ${awayLosses}D`
  };
}

module.exports = {
  analizarEnfrentamiento,
  analizarEquipo
};