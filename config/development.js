/**
 * Development configuration.
 * Loaded by config/index.js when NODE_ENV !== 'production'.
 */
module.exports = {
  env: 'development',
  isProduction: false,
  http: {
    port: parseInt(process.env.PORT, 10) || 3000,
    trustProxy: false,
  },
  session: {
    cookieSecure: false,
    cookieMaxAgeMs: 1000 * 60 * 60 * 24,   // 1 day
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    pretty: true,
    file: false,
  },
  storage: {
    driver: 'local',                       // local | s3
    localDir: 'public/uploads',
  },
  database: {
    driver: process.env.DB_DRIVER || 'firestore',  // firestore | dynamodb
  },
  notifications: {
    driver: 'console',                     // console | sns
  },
};
