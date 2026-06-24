// Handler de información de equipos - Mundial 2026
const footballApi = require('../services/footballApi');
const { formatEquipoSeguido, formatMisEquipos } = require('../utils/formatters');
const { pool, testConnection } = require('../database/connection');

// Flag de disponibilidad de DB (compartido con messageHandler)
let dbAvailable = false;
let dbCheckPromise = null;

async function initDb() {
  if (dbCheckPromise) return dbAvailable;
  dbCheckPromise = testConnection().then(ok => {
    dbAvailable = ok;
    return dbAvailable;
  });
  return dbCheckPromise;
}

/**
 * Info de un equipo
 */
async function getInfoEquipo(equipo) {
  try {
    // Handle string equipo (from parser)
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

    const matches = await footballApi.getTeamMatches(teamId, 5);
    const players = await footballApi.getTeamPlayers(teamId);

    let msg = `👥 *${teamName}*\n\n`;

    // Últimos partidos
    if (matches && matches.length > 0) {
      msg += `📊 *Últimos ${matches.length} partidos:*\n`;
      matches.forEach(m => {
        const homeScore = m.homeScore != null ? m.homeScore : '-';
        const awayScore = m.awayScore != null ? m.awayScore : '-';
        const homeName = m.homeTeam || 'Unknown';
        const awayName = m.awayTeam || 'Unknown';
        const score = (homeScore !== '-' || awayScore !== '-') ? `${homeScore} - ${awayScore}` : 'vs';
        msg += `• ${homeName} ${score} ${awayName}\n`;
      });
    } else {
      msg += `📊 *Sin partidos recientes.*\n`;
    }

    // Jugadores destacados
    if (players && players.length > 0) {
      msg += `\n👤 *Jugadores destacados:*\n`;
      players.slice(0, 5).forEach(p => {
        msg += `• ${p.name}\n`;
      });
    }

    return msg;
  } catch (error) {
    console.error('Error getInfoEquipo:', error);
    return `⚠️ No pude obtener información de ${typeof equipo === 'object' ? equipo.nombre : equipo}.`;
  }
}

/**
 * Seguir a un equipo (persiste en DB)
 */
async function seguirEquipo(userId, equipo) {
  await initDb();
  if (!dbAvailable) {
    return `⚠️ Base de datos no disponible. No puedo seguir equipos.`;
  }

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

    // Insertar en DB (ignora si ya existe)
    await pool.query(
      `INSERT INTO equipos_seguidos (id_usuario, id_equipo, nombre_equipo)
       VALUES ($1, $2, $3)
       ON CONFLICT (id_usuario, id_equipo) DO NOTHING`,
      [userId, teamId, teamName]
    );

    return formatEquipoSeguido(teamName);
  } catch (error) {
    console.error('Error seguirEquipo:', error);
    return `⚠️ No pude seguir a ${typeof equipo === 'object' ? equipo.nombre : equipo}.`;
  }
}

/**
 * Dejar de seguir a un equipo (borra de DB)
 */
async function dejarSeguirEquipo(userId, equipo) {
  await initDb();
  if (!dbAvailable) {
    return `⚠️ Base de datos no disponible. No puedo dejar de seguir equipos.`;
  }

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

    await pool.query(
      `DELETE FROM equipos_seguidos WHERE id_usuario = $1 AND (id_equipo = $2 OR nombre_equipo ILIKE $3)`,
      [userId, teamId, teamName]
    );

    return `✅ Has dejado de seguir a ${teamName}.`;
  } catch (error) {
    console.error('Error dejarSeguirEquipo:', error);
    return `⚠️ No pude dejar de seguir a ${typeof equipo === 'object' ? equipo.nombre : equipo}.`;
  }
}

/**
 * Lista de equipos seguidos por usuario (desde DB)
 */
async function getEquiposSeguidos(userId) {
  await initDb();
  if (!dbAvailable) {
    return formatMisEquipos([]);
  }

  try {
    const res = await pool.query(
      `SELECT id_equipo, nombre_equipo FROM equipos_seguidos WHERE id_usuario = $1 ORDER BY fecha_seguimiento DESC`,
      [userId]
    );

    if (res.rows.length === 0) {
      return formatMisEquipos([]);
    }

    return formatMisEquipos(res.rows);
  } catch (error) {
    console.error('Error getEquiposSeguidos:', error);
    return formatMisEquipos([]);
  }
}

module.exports = {
  getInfoEquipo,
  seguirEquipo,
  dejarSeguirEquipo,
  getEquiposSeguidos
};