module.exports = {
  apps: [
    {
      name: 'acel-haikal-sanctuary',
      script: 'backend/src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 4000
      }
    }
  ]
};
