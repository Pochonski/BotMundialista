// Handler de tablas de posiciones
const footballApi = require('../services/footballApi');
const { formatTabla } = require('../utils/formatters');

/**
 * Obtiene tabla de posiciones de una liga
 */
async function getTabla(liga) {
  try {
    const data = await footballApi.getStandings(liga.id);

    if (!data || data.length === 0) {
      return `⚠️ No hay tabla disponible para ${liga.nombre}.`;
    }

    return formatTabla(data, liga.nombre);
  } catch (error) {
    console.error('Error getTabla:', error);
    return `⚠️ No pude obtener la tabla de ${liga.nombre}.`;
  }
}

module.exports = { getTabla };