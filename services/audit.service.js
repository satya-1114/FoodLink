/**
 * Audit service.
 *
 * Today: writes structured lines to the console (via logger).
 * Tomorrow: replace `record()` with AWS CloudWatch Logs / DynamoDB writes —
 *           callers do not change.
 *
 * Controllers MUST NOT call this directly. Either:
 *   - emit a domain event (preferred), which audit.service subscribes to, OR
 *   - call from a service when an event isn't a natural fit (e.g. admin actions).
 */
const logger = require('../utils/logger');
const time = require('./time.service');
const { eventBus, EVENTS } = require('../events/eventBus');

function record(action, payload = {}) {
  const entry = {
    type: 'AUDIT',
    action,
    timestamp: time.nowIso(),
    ...payload,
  };
  try {
    logger.info(`[AUDIT] ${action} ${JSON.stringify(payload)}`);
  } catch (_) {
    logger.info(`[AUDIT] ${action}`);
  }
  return entry;
}

/* ------------------------ Event subscriptions ------------------------ */

function registerEventHandlers() {
  if (registerEventHandlers._wired) return;
  registerEventHandlers._wired = true;

  eventBus.on(EVENTS.USER_REGISTERED, ({ user } = {}) => {
    record('USER_REGISTERED', { userId: user?.id, role: user?.role, email: user?.email });
  });

  eventBus.on(EVENTS.USER_DEACTIVATED, ({ user, actorId } = {}) => {
    record('USER_DEACTIVATED', { userId: user?.id, actorId });
  });

  eventBus.on(EVENTS.USER_DELETED, ({ userId, actorId } = {}) => {
    record('USER_DELETED', { userId, actorId });
  });

  eventBus.on(EVENTS.DONATION_CREATED, ({ donation } = {}) => {
    record('DONATION_CREATED', { donationId: donation?.id, donorId: donation?.donorId });
  });

  eventBus.on(EVENTS.DONATION_ACCEPTED, ({ donation } = {}) => {
    record('DONATION_ACCEPTED', { donationId: donation?.id, ngoId: donation?.acceptedByNgoId });
  });

  eventBus.on(EVENTS.DONATION_COLLECTED, ({ donation } = {}) => {
    record('DONATION_COLLECTED', { donationId: donation?.id, ngoId: donation?.acceptedByNgoId });
  });

  eventBus.on(EVENTS.DONATION_CANCELLED, ({ donation } = {}) => {
    record('DONATION_CANCELLED', { donationId: donation?.id });
  });

  eventBus.on(EVENTS.DONATION_EXPIRED, ({ donation } = {}) => {
    record('DONATION_EXPIRED', { donationId: donation?.id });
  });

  eventBus.on(EVENTS.DONATION_DELETED, ({ donationId, actorId } = {}) => {
    record('DONATION_DELETED', { donationId, actorId });
  });
}

module.exports = { record, registerEventHandlers };
