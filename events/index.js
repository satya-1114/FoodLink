/**
 * Wire all event subscribers exactly once at boot.
 *
 * Notification driver is picked from config:
 *   - 'console' → services/notification.service.js (log lines)
 *   - 'sns'     → aws/notification.adapter.js (Amazon SNS)
 *
 * Audit subscribers always run regardless of driver.
 */
const config = require('../config');
const logger = require('../utils/logger');

require('../services/audit.service').registerEventHandlers();

const driver = (config.notifications && config.notifications.driver) || 'console';
if (driver === 'sns') {
  require('../aws/notification.adapter').registerEventHandlers();
} else {
  require('../services/notification.service').registerEventHandlers();
}
logger.info(`notifications: driver=${driver}`);

module.exports = require('./eventBus');
