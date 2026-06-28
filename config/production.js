/**
 * Production configuration.
 * Loaded by config/index.js when NODE_ENV === 'production'.
 */
module.exports = {
  env: 'production',
  isProduction: true,
  http: {
    port: parseInt(process.env.PORT, 10) || 3000,
    trustProxy: true,                      // behind an ALB / nginx
  },
  session: {
    cookieSecure: true,
    cookieMaxAgeMs: 1000 * 60 * 60 * 12,   // 12 hours
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: false,
    file: true,
  },
  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',  // flip to 's3' post-migration
    localDir: 'public/uploads',
  },
  database: {
    driver: process.env.DB_DRIVER || 'firestore',
  },
  notifications: {
    driver: process.env.NOTIFICATIONS_DRIVER || 'console',
  },
};
