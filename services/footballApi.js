require('dotenv').config();
const fetch = require('node-fetch');
const cache = require('./cacheService');

const BASE_URL = 'https://sportapi7.p.rapidapi.com/api/v1';
const headers = {
  'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
  'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
};

/**
 * Hace request a la API con cache
 */
async function apiRequest(endpoint, params = {}) {
  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    // Solo log en debug mode
    if (process.env.DEBUG === 'true') console.log(`📦 Cache hit: ${endpoint}`);
    return cached;
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.append(k, v);
  });

  if (process.env.DEBUG === 'true') console.log(`🌐 API Request: ${endpoint}`);

  try {
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();

    if (data) {
      cache.set(cacheKey, data);
    }

    return data;
  } catch (error) {
    console.error(`❌ API Error (${endpoint}):`, error.message);
    throw error;
  }
}

/**
 * Busca equipos por nombre
 */
async function searchTeams(name) {
  const data = await apiRequest(`/search/teams/${encodeURIComponent(name)}`);
  if (data?.teams && data.teams.length > 0) {
    return data.teams.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      country: t.country?.name,
      logo: t.teamColors?.primary
    }));
  }
  return [];
}

/**
 * Info de equipo por ID
 */
async function getTeamInfo(teamId) {
  const data = await apiRequest(`/team/${teamId}`);
  if (data?.team) {
    return {
      id: data.team.id,
      name: data.team.name,
      shortName: data.team.shortName,
      country: data.team.category?.name,
      logo: data.team.teamColors?.primary
    };
  }
  return null;
}

/**
 * Jugadores de un equipo
 */
async function getTeamPlayers(teamId) {
  const data = await apiRequest(`/team/${teamId}/players`);
  if (data?.players) {
    return data.players.map(p => ({
      id: p.player?.id,
      name: p.player?.name,
      position: p.player?.position
    }));
  }
  return [];
}

/**
 * Partidos de un equipo
 */
async function getTeamMatches(teamId, last = 5) {
  const data = await apiRequest(`/team/${teamId}/performance`);
  if (data?.events) {
    return data.events.slice(0, last).map(e => ({
      id: e.id,
      homeTeam: e.homeTeam?.name,
      awayTeam: e.awayTeam?.name,
      homeScore: e.homeScore?.current,
      awayScore: e.awayScore?.current,
      status: e.status?.code, // 100 = finished
      date: e.startTimestamp ? new Date(e.startTimestamp * 1000).toISOString() : null,
      tournament: e.tournament?.name
    }));
  }
  return [];
}

/**
 * Estadísticas de un evento/partido
 */
async function getMatchStats(eventId) {
  const data = await apiRequest(`/event/${eventId}/statistics`);
  if (data?.statistics) {
    const stats = {};
    data.statistics.forEach(group => {
      group.statisticsItems?.forEach(item => {
        stats[item.name] = { home: item.homeValue, away: item.awayValue };
      });
    });
    return stats;
  }
  return null;
}

/**
 * Tabla de posiciones de una liga
 */
async function getStandings(leagueId, season) {
  const data = await apiRequest(`/uniquetournament/${leagueId}/standings`);
  if (data?.standings) {
    return data.standings;
  }
  return [];
}

/**
 * Traduce nombres comunes de ligas
 */
function getLeagueId(nombre) {
  const leagues = {
    'premier': 47,
    'inglaterra': 47,
    'laliga': 215,
    'la liga': 215,
    'españa': 215,
    'serie a': 132,
    'italia': 132,
    'bundesliga': 54,
    'alemania': 54,
    'ligue 1': 71,
    'francia': 71,
    'champions': 7,
    'mundial': 1,
    'copa america': 13,
    'europa league': 9
  };
  return leagues[nombre.toLowerCase()] || null;
}

/**
 * Busca equipo dinámicamente por nombre (compartido entre handlers)
 */
async function buscarEquipoDinamico(nombre) {
  try {
    const teams = await searchTeams(nombre);
    if (teams && teams.length > 0) {
      return teams[0];
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Partidos de hoy (todos los deportes)
 */
async function getTodayMatches() {
  const data = await apiRequest('/events/today');
  if (data?.events) {
    return data.events.map(e => ({
      id: e.id,
      homeTeam: e.homeTeam?.name,
      awayTeam: e.awayTeam?.name,
      homeScore: e.homeScore?.current,
      awayScore: e.awayScore?.current,
      status: e.status?.code,
      date: e.startTimestamp ? new Date(e.startTimestamp * 1000).toISOString() : null,
      tournament: e.tournament?.name
    }));
  }
  return [];
}

module.exports = {
  searchTeams,
  getTeamInfo,
  getTeamPlayers,
  getTeamMatches,
  getMatchStats,
  getStandings,
  getLeagueId,
  buscarEquipoDinamico,
  getTodayMatches
};