/**
 * In-process Event Bus.
 *
 * Today: Node.js EventEmitter.
 * Tomorrow: swap implementation for AWS SNS / EventBridge without touching
 *           the publishers (services). Subscribers stay co-located here.
 *
 * Usage:
 *   const { eventBus, EVENTS } = require('./eventBus');
 *   eventBus.emit(EVENTS.DONATION_CREATED, payload);
 *   eventBus.on(EVENTS.DONATION_CREATED, handler);
 */
const { EventEmitter } = require('events');

class AppEventBus extends EventEmitter {}

const eventBus = new AppEventBus();
// Avoid Node's default MaxListeners warning as more subscribers join.
eventBus.setMaxListeners(50);

const EVENTS = Object.freeze({
  USER_REGISTERED: 'user.registered',
  USER_DEACTIVATED: 'user.deactivated',
  USER_DELETED: 'user.deleted',

  DONATION_CREATED: 'donation.created',
  DONATION_ACCEPTED: 'donation.accepted',
  DONATION_COLLECTED: 'donation.collected',
  DONATION_CANCELLED: 'donation.cancelled',
  DONATION_EXPIRED: 'donation.expired',
  DONATION_DELETED: 'donation.deleted',
});

module.exports = { eventBus, EVENTS };
