// NexaERP Production Process Manager Configuration (PM2)
// Requirements: 19.3, 20.6

module.exports = {
  apps: [
    {
      name: 'nexaerp-backend',
      script: 'uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000 --workers 4',
      cwd: './backend',
      interpreter: 'python',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        ENVIRONMENT: 'production',
        PORT: 8000
      }
    }
  ]
};
