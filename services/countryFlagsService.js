// Servicio de banderas de países para equipos
// Usa códigos ISO 3166-1 para generar emojis de banderas

/**
 * Mapa de países/equipos a emojis de bandera
 * Cada código de país produce el emoji de bandera correspondiente
 */
const COUNTRY_FLAGS = {
  // Equipos (claves sin acentos para coincidir con normalización)
  'argentina': '🇦🇷',
  'brasil': '🇧🇷',
  'alemania': '🇩🇪',
  'francia': '🇫🇷',
  'espana': '🇪🇸',
  'italia': '🇮🇹',
  'inglaterra': '🇬🇧',
  'uk': '🇬🇧',
  'portugal': '🇵🇹',
  'holanda': '🇳🇱',
  'paises bajos': '🇳🇱',
  'belgica': '🇧🇪',
  'croacia': '🇭🇷',
  'dinamarca': '🇩🇰',
  'suecia': '🇸🇪',
  'polonia': '🇵🇱',
  'suiza': '🇨🇭',
  'austria': '🇦🇹',
  'rusia': '🇷🇺',
  'ucrania': '🇺🇦',
  'turquia': '🇹🇷',
  'grecia': '🇬🇷',
  'mexico': '🇲🇽',
  'eeuu': '🇺🇸',
  'estados unidos': '🇺🇸',
  'usa': '🇺🇸',
  'canada': '🇨🇦',
  'japon': '🇯🇵',
  'japón': '🇯🇵',
  'corea': '🇰🇷',
  'corea del sur': '🇰🇷',
  'south korea': '🇰🇷',
  'china': '🇨🇳',
  'australia': '🇦🇺',
  'qatar': '🇶🇦',
  'marrocos': '🇲🇦',
  'marruecos': '🇲🇦',
  'egipto': '🇪🇬',
  'nigeria': '🇳🇬',
  'camerun': '🇨🇲',
  'senegal': '🇸🇳',
  'ghana': '🇬🇭',
  'sudafrica': '🇿🇦',
  'tunez': '🇹🇳',
  'argelia': '🇩🇿',
  'iran': '🇮🇷',
  'iraq': '🇮🇷',
  'arabia': '🇸🇦',
  'arabia saudita': '🇸🇦',
  'emiratos': '🇦🇪',
  'emiratos arabes': '🇦🇪',
  'republica checa': '🇨🇿',
  'rep checa': '🇨🇿',
};

/**
 * Obtiene el emoji de bandera para un país/equipo
 * @param {string} nombre - Nombre del país o equipo
 * @returns {string} Emoji de bandera o el nombre original si no se encuentra
 */
function getFlag(nombre) {
  if (!nombre) return '';

  const lower = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Buscar coincidencia exacta primero
  if (COUNTRY_FLAGS[lower]) {
    return COUNTRY_FLAGS[lower];
  }

  // Buscar coincidencia parcial
  for (const [pais, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (lower.includes(pais) || pais.includes(lower)) {
      return flag;
    }
  }

  return nombre;
}

/**
 * Añade banderas a un texto que contiene nombres de países
 * @param {string} texto - Texto a procesar
 * @returns {string} Texto con banderas añadidas
 */
function addFlagsToText(texto) {
  if (!texto) return '';

  let result = texto;

  // Reemplazar nombres conocidos con bandera + nombre
  for (const [pais, flag] of Object.entries(COUNTRY_FLAGS)) {
    // Patrones comunes: "vs Brasil", "Brasil vs", "de Brasil", "Brasil,"
    const patterns = [
      new RegExp(`\\b(${pais})\\b`, 'gi'),
    ];

    for (const pattern of patterns) {
      result = result.replace(pattern, `${flag} $1`);
    }
  }

  return result;
}

/**
 * Formatea el nombre de un equipo con su bandera
 * @param {string} nombre - Nombre del equipo
 * @returns {string} Nombre con bandera
 */
function formatTeamWithFlag(nombre) {
  if (!nombre) return '';
  return `${getFlag(nombre)} ${nombre}`;
}

/**
 * Obtiene la bandera para un código de país ISO
 * @param {string} code - Código ISO 3166-1 alpha-2 (ej: 'AR', 'BR')
 * @returns {string} Emoji de bandera
 */
function flagFromCode(code) {
  if (!code || code.length !== 2) return '';

  // Convertir código a emojis de bandera regional
  // A (Latin America) = 127462 - 65 = 127397
  // El código debe ser mayúsculas
  const codeUpper = code.toUpperCase();
  const firstChar = codeUpper.charCodeAt(0) - 65 + 127462;
  const secondChar = codeUpper.charCodeAt(1) - 65 + 127462;

  try {
    return String.fromCodePoint(firstChar) + String.fromCodePoint(secondChar);
  } catch {
    return code;
  }
}

module.exports = {
  getFlag,
  addFlagsToText,
  formatTeamWithFlag,
  flagFromCode,
  COUNTRY_FLAGS
};
