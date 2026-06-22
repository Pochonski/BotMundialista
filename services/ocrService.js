// Servicio de OCR usando Tesseract.js
const Tesseract = require('tesseract.js');

/**
 * Extrae texto de una imagen usando Tesseract.js
 * @param {Buffer|string} imageData - Imagen en buffer o base64
 * @param {object} options - Opciones de OCR
 * @returns {Promise<object>} { text, confidence, words, lines }
 */
async function extractTextFromImage(imageData, options = {}) {
  const {
    logger = false,
    language = 'spa+eng'
  } = options;

  try {
    const worker = await Tesseract.createWorker(language, 1, {
      logger: logger ? m => console.log(`[OCR] ${m.status}: ${Math.round(m.progress * 100)}%`) : null
    });

    const result = await worker.recognize(imageData);

    await worker.terminate();

    return {
      text: result.data.text,
      confidence: result.data.confidence / 100, // Normalizar a 0-1
      words: result.data.words,
      lines: result.data.lines,
      paragraphs: result.data.paragraphs
    };
  } catch (error) {
    console.error('Error en OCR:', error);
    throw error;
  }
}

/**
 * Versión simplificada para imágenes pequeñas
 * @param {Buffer|string} imageData
 * @returns {Promise<object>}
 */
async function extractTextSimple(imageData) {
  const result = await Tesseract.recognize(imageData, 'spa+eng', {
    logger: false
  });

  return {
    text: result.data.text,
    confidence: result.data.confidence / 100,
    words: result.data.words
  };
}

/**
 * Procesa una imagen y devuelve texto estructurado
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @returns {Promise<object>}
 */
async function procesarImagen(imageBuffer) {
  console.log('[OCR] Procesando imagen...');

  const ocrResult = await extractTextFromImage(imageBuffer, { logger: true });

  console.log(`[OCR] Texto extraído (confianza: ${(ocrResult.confidence * 100).toFixed(1)}%)`);
  console.log('[OCR] Preview:', ocrResult.text.substring(0, 200).replace(/\n/g, ' '));

  return ocrResult;
}

module.exports = {
  extractTextFromImage,
  extractTextSimple,
  procesarImagen
};
