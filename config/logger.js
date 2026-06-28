/**
 * Winston logger configuration.
 *
 * Outputs:
 *   - Console (pretty in dev, JSON in prod)
 *   - Rotating daily file under /var/log or ./logs (when logging.file === true)
 *   - JSON formatter is CloudWatch Logs-friendly: each line is a single
 *     JSON object with timestamp, level, message, metadata.
 *
 * Drop-in compatible with the previous utils/logger.js API
 *   (.info / .warn / .error / .debug).
 */
const path = require('path');
const fs = require('fs');
const winston = require('winston');
require('winston-daily-rotate-file');

function build(profile) {
  const level = profile?.logging?.level || process.env.LOG_LEVEL || 'info';
  const pretty = !!profile?.logging?.pretty;
  const toFile = !!profile?.logging?.file;

  const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  const prettyFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level: lvl, message, ...rest }) => {
      const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
      return `[${timestamp}] ${lvl}: ${message}${meta}`;
    })
  );

  const transports = [
    new winston.transports.Console({ format: pretty ? prettyFormat : jsonFormat }),
  ];

  if (toFile) {
    const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
    try { fs.mkdirSync(logDir, { recursive: true }); } catch (_) { /* noop */ }
    transports.push(
      new winston.transports.DailyRotateFile({
        dirname: logDir,
        filename: 'foodlink-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '14d',
        maxSize: '20m',
        zippedArchive: true,
        format: jsonFormat,
      })
    );
  }

  const logger = winston.createLogger({
    level,
    defaultMeta: {
      service: 'foodlink',
      env: profile?.env || process.env.NODE_ENV || 'development',
    },
    transports,
    exitOnError: false,
  });

  return logger;
}

module.exports = { build };
