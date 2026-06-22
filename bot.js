require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const messageHandler = require('./handlers/messageHandler');
const notificationService = require('./services/notificationService');
const { testConnection } = require('./database/connection');

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: process.env.WA_SESSION_DIR || '.wwebjs_auth'
  }),
  puppeteer: {
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// QR Code event
client.on('qr', (qr) => {
  console.log('\n📱 Escanea el QR con tu WhatsApp:\n');
  qrcode.generate(qr, { small: true });
  console.log('\n');
});

// Authenticated
client.on('authenticated', () => {
  console.log('✅ WhatsApp autenticado correctamente');
});

// Auth failure
client.on('auth_failure', (msg) => {
  console.error('❌ Error de autenticación:', msg);
});

// Ready
client.on('ready', async () => {
  console.log('🤖 BotMundialista está listo!');

  // Configurar notification service con el cliente de WhatsApp
  notificationService.setClient(client);

  // Test database connection
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('⚠️ Advertencia: La base de datos no está disponible');
  }
});

// Disconnected
client.on('disconnected', (reason) => {
  console.log('⚠️ WhatsApp desconectado:', reason);
});

// Message handler
client.on('message', async (message) => {
  try {
    await messageHandler(client, message);
  } catch (error) {
    console.error('Error procesando mensaje:', error);
    await message.reply('⚠️ Ocurrió un error. Intenta de nuevo.');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Apagando bot...');
  await client.destroy();
  process.exit(0);
});

// Start
console.log('🚀 Iniciando BotMundialista...');
client.initialize();