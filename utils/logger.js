/**
 * Process-wide logger.
 *
 * Delegates to a winston instance built from the active config profile.
 * Keeps the same surface (.info / .warn / .error / .debug) so existing
 * call sites do not change.
 */
let logger;

try {
  const config = require('../config');
  const { build } = require('../config/logger');
  logger = build(config);
} catch (err) {
  // Fallback to console if winston is unavailable (e.g. CI bootstrap).
  const ts = () => new Date().toISOString();
  const fmt = (level, args) => [`[${ts()}]`, `[${level}]`, ...args];
  logger = {
    info: (...a) => console.log(...fmt('INFO', a)),
    warn: (...a) => console.warn(...fmt('WARN', a)),
    error: (...a) => console.error(...fmt('ERROR', a)),
    debug: (...a) => console.debug(...fmt('DEBUG', a)),
  };
  // eslint-disable-next-line no-console
  console.warn('[logger] Falling back to console:', err.message);
}

module.exports = logger;
