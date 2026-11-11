/**
 * PM2 Process Manager Configuration for Aether Cinema Server
 *
 * Target Port: 3204
 *
 * Commands:
 *   - Start:   pm2 start ecosystem.config.cjs
 *   - Stop:    pm2 stop ecosystem.config.cjs
 *   - Restart: pm2 restart ecosystem.config.cjs
 *   - Logs:    pm2 logs lenseat-server
 *   - Status:  pm2 status
 */

module.exports = {
  apps: [
    {
      name: 'lenseat-server',
      // Uses the local tsx runner to execute TypeScript server.ts reliably across platforms
      script: './node_modules/tsx/dist/cli.mjs',
      args: 'server.ts --api-only',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '5s',
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: 3204,
        API_ONLY: 'true',
      },
      env_fullstack: {
        NODE_ENV: 'production',
        PORT: 3204,
        API_ONLY: 'false',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/server-err.log',
      out_file: './logs/server-out.log',
      merge_logs: true,
    },
  ],
};

