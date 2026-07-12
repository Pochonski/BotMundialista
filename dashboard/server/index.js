require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const footballRoutes = require('./routes/football');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3002;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check
app.get('/api/football/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Football API routes
app.use('/api/football', footballRoutes);

// Serve React SPA in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`🏆 Mundialista Dashboard API corriendo en http://localhost:${PORT}`);
});
