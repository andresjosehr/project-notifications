module.exports = {
  apps: [{
    name: 'project-notifications',
    script: 'start-server.js',
    cwd: '/var/www/project-notifications',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/project-notifications/logs/pm2-error.log',
    out_file: '/var/www/project-notifications/logs/pm2-out.log',
    log_file: '/var/www/project-notifications/logs/pm2-combined.log',
    time: true
  }]
};