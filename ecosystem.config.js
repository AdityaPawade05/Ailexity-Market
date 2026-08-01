// PM2 process config for the Hostinger VPS. Usage: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "ailexity-market",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      // Single instance: the in-memory rate limiter (src/proxy.ts) is per-process,
      // so cluster mode would silently multiply the effective rate limits.
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "512M",
    },
  ],
};
