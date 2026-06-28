/**
 * Health & readiness controllers.
 *   /health  → liveness (cheap)
 *   /ready   → readiness (checks active DB + storage adapters)
 */
const os = require('os');
const config = require('../config');
const time = require('../services/time.service');
const { APP_VERSION, APP_NAME } = require('../config/app');
const storage = require('../services/storage.service');

function memoryMb() {
  const m = process.memoryUsage();
  const mb = (n) => Math.round((n / 1024 / 1024) * 100) / 100;
  return { rss: mb(m.rss), heapUsed: mb(m.heapUsed), heapTotal: mb(m.heapTotal) };
}

exports.health = (req, res) => {
  res.json({
    status: 'UP',
    app: APP_NAME,
    version: APP_VERSION,
    env: config.env,
    nodeVersion: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: memoryMb(),
    hostname: os.hostname(),
    timestamp: time.nowIso(),
  });
};

exports.ready = async (req, res) => {
  const checks = {};
  let httpStatus = 200;

  // Database
  try {
    const dbDriver = (config.database && config.database.driver) || 'firestore';
    if (dbDriver === 'dynamodb') {
      await require('../aws/database.adapter').ping();
    } else {
      require('../config/firebase').getDb();
    }
    checks.database = { status: 'UP', driver: dbDriver };
  } catch (err) {
    checks.database = { status: 'DOWN', error: err.message };
    httpStatus = 503;
  }

  // Storage
  try {
    await storage.ping();
    checks.storage = { status: 'UP', driver: storage.driver };
  } catch (err) {
    checks.storage = { status: 'DOWN', driver: storage.driver, error: err.message };
    httpStatus = 503;
  }

  res.status(httpStatus).json({
    status: httpStatus === 200 ? 'READY' : 'NOT_READY',
    timestamp: time.nowIso(),
    checks,
  });
};
