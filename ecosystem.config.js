module.exports = {
  apps: [
    {
      name: 'jobs-api',
      script: 'apps/api/start-server.js',
      cwd: '/var/www/projects/jobs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/jobs-api-error.log',
      out_file: '/var/log/pm2/jobs-api-out.log',
      log_file: '/var/log/pm2/jobs-api-combined.log',
      time: true
    }
  ]
}; 