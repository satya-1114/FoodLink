/**
 * Notification service — single seam for outbound notifications.
 *
 * Today: structured log lines.
 * Tomorrow: replace each handler body with AWS SNS / SES calls — publishers
 *           never change because they emit domain events on the event bus.
 *
 * Handlers are best-effort: a notification failure must NEVER break a
 * business operation, so we swallow errors and log them.
 */
const logger = require('../utils/logger');
const userRepo = require('../repositories/user.repository');
const { eventBus, EVENTS } = require('../events/eventBus');

function safe(name, fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      logger.warn(`notification.${name} failed: ${err.message}`);
    }
  };
}

const onDonationAccepted = safe('onDonationAccepted', async ({ donation }) => {
  if (!donation) return;
  const [donor, ngo] = await Promise.all([
    userRepo.findById(donation.donorId),
    userRepo.findById(donation.acceptedByNgoId),
  ]);
  logger.info(
    `[NOTIFY] NGO ${ngo?.email || ngo?.id} accepted donation ${donation.id} (${donation.foodName}).`
  );
  logger.info(
    `[NOTIFY] Donor ${donor?.email || donor?.id}: your donation ${donation.id} ` +
      `(${donation.foodName}) was accepted by ${ngo?.organizationName || ngo?.email}.`
  );
});

const onDonationCollected = safe('onDonationCollected', async ({ donation }) => {
  if (!donation) return;
  const [donor, ngo] = await Promise.all([
    userRepo.findById(donation.donorId),
    userRepo.findById(donation.acceptedByNgoId),
  ]);
  logger.info(
    `[NOTIFY] Donation ${donation.id} (${donation.foodName}) marked Collected by ` +
      `${ngo?.organizationName || ngo?.email}; donor ${donor?.email || donor?.id} notified.`
  );
});

const onDonationCreated = safe('onDonationCreated', async ({ donation }) => {
  logger.info(`[NOTIFY] New donation listed: ${donation?.id} (${donation?.foodName}).`);
});

const onDonationCancelled = safe('onDonationCancelled', async ({ donation }) => {
  logger.info(`[NOTIFY] Donation ${donation?.id} cancelled.`);
});

const onDonationExpired = safe('onDonationExpired', async ({ donation }) => {
  logger.info(`[NOTIFY] Donation ${donation?.id} expired.`);
});

const onUserRegistered = safe('onUserRegistered', async ({ user }) => {
  logger.info(`[NOTIFY] Welcome email queued for ${user?.email} (${user?.role}).`);
});

function registerEventHandlers() {
  if (registerEventHandlers._wired) return;
  registerEventHandlers._wired = true;

  eventBus.on(EVENTS.DONATION_CREATED, onDonationCreated);
  eventBus.on(EVENTS.DONATION_ACCEPTED, onDonationAccepted);
  eventBus.on(EVENTS.DONATION_COLLECTED, onDonationCollected);
  eventBus.on(EVENTS.DONATION_CANCELLED, onDonationCancelled);
  eventBus.on(EVENTS.DONATION_EXPIRED, onDonationExpired);
  eventBus.on(EVENTS.USER_REGISTERED, onUserRegistered);
}

module.exports = { registerEventHandlers };
