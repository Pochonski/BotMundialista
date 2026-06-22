// Servicio de almacenamiento de imágenes
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'admin', 'public', 'images');
const IMAGES_URL_PATH = '/images';

/**
 * Asegura que existe la carpeta de imágenes
 */
function crearCarpeta() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

/**
 * Guarda una imagen en el filesystem
 * @param {Buffer} buffer - Buffer de la imagen
 * @param {string} filename - Nombre del archivo
 * @returns {string} URL relativa del archivo guardado
 */
function guardarImagen(buffer, filename) {
  crearCarpeta();
  const filepath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  // Retorna la URL relativa para acceder desde el servidor
  return `${IMAGES_URL_PATH}/${filename}`;
}

/**
 * Genera un nombre de archivo único para una apuesta
 * @param {number} apuestaId
 * @param {string} mimetype
 * @returns {string}
 */
function generarNombreArchivo(apuestaId, mimetype) {
  const extension = mimetype.split('/')[1] || 'jpg';
  const timestamp = Date.now();
  return `apuesta_${apuestaId}_${timestamp}.${extension}`;
}

module.exports = {
  crearCarpeta,
  guardarImagen,
  generarNombreArchivo,
  IMAGES_DIR,
  IMAGES_URL_PATH
};
