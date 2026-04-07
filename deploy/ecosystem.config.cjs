// PM2 ecosystem config for Stox server
// Usage: pm2 start deploy/ecosystem.config.cjs --env production
module.exports = {
  apps: [
    {
      name: 'stox-server',
      script: './dist/server/index.js',
      cwd: process.env.HOME + '/stox',

      // Disable PM2's cluster mode — Puppeteer doesn't play well with it
      instances: 1,
      exec_mode: 'fork',

      // Env
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Disable the interactive terminal dashboard (metrics.ts alternate screen)
        // so PM2 can capture logs cleanly
        STOX_NO_DASHBOARD: 'true',
      },

      // Restart policy
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,

      // Logs
      out_file: './logs/server-out.log',
      error_file: './logs/server-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_size: '50M',
      retain: 7,

      // Kill Puppeteer's Chrome cleanly on restart
      kill_timeout: 8000,
    },
  ],
};
