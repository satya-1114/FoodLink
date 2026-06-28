#!/usr/bin/env node
/**
 * Healthcheck script for container probes (Docker / ECS / k8s).
 *   exit 0 → healthy, exit 1 → unhealthy.
 */
const http = require('http');

const port = parseInt(process.env.PORT, 10) || 3000;
const host = process.env.HEALTHCHECK_HOST || '127.0.0.1';

const req = http.get({ host, port, path: '/health', timeout: 4000 }, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on('error', () => process.exit(1));
req.on('timeout', () => { req.destroy(); process.exit(1); });
