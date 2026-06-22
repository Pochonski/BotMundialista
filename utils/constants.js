// Constantes del proyecto - Mundial 2026

const LIGAS = {
  MUNDIAL: { id: 1, nombre: 'Copa Mundial 2026', pais: 'Mundial' },
  PREMIER_LEAGUE: { id: 47, nombre: 'Premier League', pais: 'Inglaterra' },
  LA_LIGA: { id: 215, nombre: 'La Liga', pais: 'España' }
};

const EQUIPOS_MUNDIAL = {
  // Grupo A
  'méxico': { id: 8398, nombre: 'México' },
  'mexico': { id: 8398, nombre: 'México' },
  'brasil': { id: 7617, nombre: 'Brasil' },
  'argentina': { id: 7626, nombre: 'Argentina' },
  'uruguay': { id: 8417, nombre: 'Uruguay' },
  'estados unidos': { id: 8399, nombre: 'Estados Unidos' },
  'usa': { id: 8399, nombre: 'Estados Unidos' },

  // Grupo B
  'españa': { id: 7603, nombre: 'España' },
  'alemania': { id: 7593, nombre: 'Alemania' },
  'francia': { id: 7598, nombre: 'Francia' },
  'portugal': { id: 7614, nombre: 'Portugal' },
  'inglaterra': { id: 7596, nombre: 'Inglaterra' },

  // Grupo C
  'holanda': { id: 7605, nombre: 'Países Bajos' },
  'italia': { id: 7602, nombre: 'Italia' },
  'belgica': { id: 7608, nombre: 'Bélgica' },
  'croacia': { id: 7604, nombre: 'Croacia' },

  // Grupo D
  'colombia': { id: 7621, nombre: 'Colombia' },
  'chile': { id: 7620, nombre: 'Chile' },
  'perú': { id: 7622, nombre: 'Perú' },
  'peru': { id: 7622, nombre: 'Perú' },

  // Otros equipos conocidos
  'japón': { id: 7594, nombre: 'Japón' },
  'japan': { id: 7594, nombre: 'Japón' },
  'corea': { id: 7591, nombre: 'Corea del Sur' },
  'corea del sur': { id: 7591, nombre: 'Corea del Sur' },
  'australia': { id: 7610, nombre: 'Australia' },
  'senegal': { id: 7618, nombre: 'Senegal' },
  'marruecos': { id: 7612, nombre: 'Marruecos' },
  'egipto': { id: 7625, nombre: 'Egipto' },
  'polonia': { id: 7601, nombre: 'Polonia' },
  'suiza': { id: 7606, nombre: 'Suiza' },
  'dinamarca': { id: 7592, nombre: 'Dinamarca' },
  'suecia': { id: 7607, nombre: 'Suecia' },
  'noruega': { id: 7609, nombre: 'Noruega' },
  'austria': { id: 7590, nombre: 'Austria' },
  'túnez': { id: 7611, nombre: 'Túnez' },
  'tunez': { id: 7611, nombre: 'Túnez' },
  'canadá': { id: 8397, nombre: 'Canadá' },
  'canada': { id: 8397, nombre: 'Canadá' },
  'qatar': { id: 8401, nombre: 'Qatar' }
};

// Alias para equipos (mismo ID pero diferentes formas de escribir)
EQUIPOS_MUNDIAL['brasil'] = { id: 7617, nombre: 'Brasil' };
EQUIPOS_MUNDIAL['argentina'] = { id: 7626, nombre: 'Argentina' };

const INTENTOS = {
  PARTIDOS_HOY: 'partidos_hoy',
  PARTIDOS_FECHA: 'partidos_fecha',
  RESULTADO: 'resultado',
  RESULTADO_VS: 'resultado_vs',
  ESTADISTICA: 'estadistica',
  INFO_EQUIPO: 'info_equipo',
  TABLA: 'tabla',
  ANALISIS: 'analisis',
  SEGUIR_EQUIPO: 'seguir_equipo',
  DEJAR_SEGUIR: 'dejar_seguir',
  MIS_EQUIPOS: 'mis_equipos',
  HELP: 'help',
  SALUDO: 'saludo',
  DESCONOCIDO: 'desconocido'
};

const ESTADOS_USUARIO = {
  REGISTRADO: 'registrado',
  ESPERANDO_ALIAS: 'esperando_alias'
};

// Exportar para compatibilidad
const EQUIPOS_POPULARES = EQUIPOS_MUNDIAL;

module.exports = {
  LIGAS,
  EQUIPOS_POPULARES,
  EQUIPOS_MUNDIAL,
  INTENTOS,
  ESTADOS_USUARIO
};