// Formateadores de respuesta para WhatsApp

/**
 * Formatea una lista de partidos del día
 */
function formatPartidosHoy(partidos) {
  if (!partidos || partidos.length === 0) {
    return '⚽ No hay partidos programados para hoy.';
  }

  let mensaje = '⚽ *PARTIDOS DE HOY*\n\n';

  // Agrupar por liga
  const porLiga = {};
  partidos.forEach(p => {
    const liga = p.league?.name || 'Desconocido';
    if (!porLiga[liga]) porLiga[liga] = [];
    porLiga[liga].push(p);
  });

  for (const [liga, matches] of Object.entries(porLiga)) {
    mensaje += `🏆 *${liga}*\n`;
    matches.forEach(m => {
      const hora = m.time || '--:--';
      const estado = formatEstado(m.status);
      const score = m.score || '';
      mensaje += `${m.homeTeam} vs ${m.awayTeam} | ${hora}\n`;
      if (score) mensaje += `[${estado} ${score}]\n`;
      mensaje += '\n';
    });
  }

  return mensaje.trim();
}

/**
 * Formatea el estado de un partido
 */
function formatEstado(status) {
  const estados = {
    'LIVE': '🔴 Live',
    'HT': '⏸️ HT',
    'FT': '✅ FT',
    'NS': '⏳ Soon',
    'PST': '⏸️ PST',
    'CANC': '❌ CAN',
    'POSTP': '⏸️ PP'
  };
  return estados[status] || status || '';
}

/**
 * Formatea un resultado de partido
 */
function formatResultado(partido) {
  const estado = formatEstado(partido.status);
  return `⚽ *RESULTADO*\n\n` +
    `🏆 ${partido.league}\n` +
    `${partido.homeTeam} ${partido.score || 'vs'} ${partido.awayTeam}\n` +
    `📅 ${partido.date}\n` +
    `[${estado}]`;
}

/**
 * Formatea estadísticas de un partido
 */
function formatEstadisticas(stats) {
  if (!stats) return '📊 No hay estadísticas disponibles.';

  let msg = '📊 *ESTADÍSTICAS*\n\n';
  msg += `⚽ Goles: ${stats.homeScore || 0} - ${stats.awayScore || 0}\n`;
  msg += `🥅 Tiros al arco: ${stats.homeShotsOnTarget || 0} - ${stats.awayShotsOnTarget || 0}\n`;
  msg += `🎯 Tiros totales: ${stats.homeShots || 0} - ${stats.awayShots || 0}\n`;
  msg += `📐 Córners: ${stats.homeCorners || 0} - ${stats.awayCorners || 0}\n`;
  msg += `🟨 Tarjetas amarillas: ${stats.homeYellowCards || 0} - ${stats.awayYellowCards || 0}\n`;
  msg += `🟥 Tarjetas rojas: ${stats.homeRedCards || 0} - ${stats.awayRedCards || 0}\n`;
  msg += `⏱️ Posesión: ${stats.homePossession || 0}% - ${stats.awayPossession || 0}%\n`;

  return msg;
}

/**
 * Formatea información de un equipo
 */
function formatEquipo(info) {
  let msg = `👥 *${info.name}*\n\n`;
  msg += `🏆 ${info.league || 'Sin liga activa'}\n`;
  msg += `📍 Posición: ${info.position || '-'}\n`;
  msg += `📊 Puntos: ${info.points || 0}\n`;
  msg += `🎯 PJ: ${info.played || 0} | PG: ${info.win || 0} | PE: ${info.draw || 0} | PP: ${info.lose || 0}\n`;
  msg += `⚽ GF: ${info.goalsFor || 0} | GC: ${info.goalsAgainst || 0}\n`;

  return msg;
}

/**
 * Formatea una tabla de posiciones
 */
function formatTabla(standings, liga) {
  if (!standings || standings.length === 0) {
    return `📊 No hay información de tabla para ${liga}.`;
  }

  let msg = `📊 *TABLA - ${liga}*\n\n`;
  msg += 'Pos | Equipo          | PJ | PG | PE | PP | Pts\n';
  msg += '---------------------------------------------\n';

  standings.slice(0, 10).forEach((team, i) => {
    const nombre = team.team?.name || team.name || '?';
    msg += `${team.rank || i+1}   | ${nombre.padEnd(15)} | ${team.played || 0}  | ${team.win || 0}  | ${team.draw || 0}  | ${team.lose || 0}  | ${team.points || 0}\n`;
  });

  return msg;
}

/**
 * Formatea análisis para apuestas
 */
function formatAnalisis(home, away, stats) {
  const goalsHome = isNaN(home.goalsPerMatch) ? '-' : home.goalsPerMatch;
  const goalsAway = isNaN(away.goalsPerMatch) ? '-' : away.goalsPerMatch;
  const cornersHome = home.cornersPerMatch === 'N/A' ? 'N/A' : (isNaN(home.cornersPerMatch) ? '-' : home.cornersPerMatch);
  const cornersAway = away.cornersPerMatch === 'N/A' ? 'N/A' : (isNaN(away.cornersPerMatch) ? '-' : away.cornersPerMatch);

  let msg = `📊 *ANÁLISIS DE APUESTAS*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `⚽ ${home.name}  vs  ${away.name}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += `🏠 *LOCAL:* ${home.name}\n`;
  msg += `   📈 Forma: ${home.form || '-'}\n`;
  msg += `   ⚽ Goles/match: ${goalsHome}\n`;
  msg += `   📐 Corners/match: ${cornersHome}\n`;
  msg += `   🏟️ Local: ${home.homeRecord || '-'}\n\n`;

  msg += `✈️ *VISITANTE:* ${away.name}\n`;
  msg += `   📈 Forma: ${away.form || '-'}\n`;
  msg += `   ⚽ Goles/match: ${goalsAway}\n`;
  msg += `   📐 Corners/match: ${cornersAway}\n`;
  msg += `   🏟️ Visitante: ${away.awayRecord || '-'}\n\n`;

  if (stats) {
    msg += `📈 *TENDENCIAS*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (stats.btts) msg += `🔵 BTTS Sí: ${stats.btts}%\n`;
    if (stats.over25) msg += `⚽ Over 2.5: ${stats.over25}%\n`;
    if (stats.cornersOver) msg += `📐 Corners +9.5: ${stats.cornersOver}%\n`;
  }

  return msg;
}

/**
 * Formatea resumen de partido
 */
function formatResumen(resumen) {
  let msg = `📋 *RESUMEN*\n\n`;
  msg += `${resumen.homeTeam} vs ${resumen.awayTeam}\n\n`;
  msg += `${resumen.homeTeam}:\n`;
  msg += `• ${resumen.homeSummary}\n\n`;
  msg += `${resumen.awayTeam}:\n`;
  msg += `• ${resumen.awaySummary}\n\n`;
  msg += `📊 *H2H:* ${resumen.h2h || 'Sin antecedentes'}\n`;

  return msg;
}

/**
 * Formatea confirmación de seguimiento
 */
function formatEquipoSeguido(equipo) {
  return `✅ Ahora sigues a *${equipo}*. Usa "mis equipos" para ver tu lista.`;
}

/**
 * Formatea lista de equipos seguidos
 */
function formatMisEquipos(equipos) {
  if (!equipos || equipos.length === 0) {
    return '📋 No sigues ningún equipo. Usa "Seguir [equipo]" para agregar.';
  }

  let msg = '📋 *EQUIPOS QUE SIGUES*\n\n';
  equipos.forEach((e, i) => {
    msg += `${i + 1}. ${e.nombre_equipo}\n`;
  });

  return msg;
}

module.exports = {
  formatPartidosHoy,
  formatEstado,
  formatResultado,
  formatEstadisticas,
  formatEquipo,
  formatTabla,
  formatAnalisis,
  formatResumen,
  formatEquipoSeguido,
  formatMisEquipos
};