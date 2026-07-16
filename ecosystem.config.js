module.exports = {
  apps: [
    {
      name: 'botmundialista-telegram',
      script: 'telegramBot.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'mundialista-dashboard',
      script: 'dashboard/server/index.js',
      instances: Number(process.env.WEB_CONCURRENCY) || 1,
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
    },
  ],
};
