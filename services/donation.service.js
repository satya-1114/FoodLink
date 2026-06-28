/**
 * Donation service — business logic for donations.
 *
 * Responsibilities:
 *   - Build & persist donations via the repository
 *   - Enforce ownership & status-transition rules
 *   - Stamp audit timestamps via the time service
 *   - Dispatch side effects via the notification service
 *
 * NEVER imports Firestore, fs, or multer.
 */
const donationRepo = require('../repositories/donation.repository');
const userRepo = require('../repositories/user.repository');
const storage = require('./storage.service');
const time = require('./time.service');
const { buildDonation, STATUS, isAllowedTransition } = require('../models/donation.model');
const { eventBus, EVENTS } = require('../events/eventBus');

class DonationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'DonationError';
    this.status = status;
  }
}

/* ----------------------------- Helpers ----------------------------- */

/**
 * Apply a status transition with strict validation.
 * Returns a patch object ready for `repo.update`.
 */
function buildTransitionPatch(currentStatus, nextStatus, extra = {}) {
  if (!isAllowedTransition(currentStatus, nextStatus)) {
    throw new DonationError(
      `Invalid status transition: ${currentStatus} → ${nextStatus}.`,
      409
    );
  }
  const now = time.nowIso();
  const patch = { status: nextStatus, updatedAt: now, ...extra };

  // Stamp the matching audit timestamp.
  if (nextStatus === STATUS.ACCEPTED) patch.acceptedAt = now;
  if (nextStatus === STATUS.COLLECTED) patch.collectedAt = now;
  if (nextStatus === STATUS.CANCELLED) patch.cancelledAt = now;
  if (nextStatus === STATUS.EXPIRED) patch.expiredAt = now;

  return patch;
}

/* --------------------------- Donor flows --------------------------- */

async function createForDonor(donorId, data, file) {
  if (!donorId) throw new DonationError('Donor required.', 401);

  let imageUrl = null;
  try {
    imageUrl = await storage.uploadImage(file);
  } catch (err) {
    throw new DonationError(err.message || 'Image upload failed.', 400);
  }

  const donation = buildDonation({ ...data, donorId, imageUrl, status: STATUS.PENDING });
  const created = await donationRepo.create(donation);
  eventBus.emit(EVENTS.DONATION_CREATED, { donation: created });
  return created;
}

async function getById(id) {
  return donationRepo.findById(id);
}

async function listForDonor(donorId) {
  return donationRepo.listByDonor(donorId);
}

async function deleteForDonor(donorId, donationId) {
  const donation = await donationRepo.findById(donationId);
  if (!donation) throw new DonationError('Donation not found.', 404);
  if (donation.donorId !== donorId) {
    throw new DonationError('You can only delete your own donations.', 403);
  }
  if (donation.status !== STATUS.PENDING) {
    throw new DonationError('Only pending donations can be deleted.', 409);
  }
  await donationRepo.remove(donationId);
  await storage.deleteImage(donation.imageUrl);
  eventBus.emit(EVENTS.DONATION_DELETED, { donationId, actorId: donorId });
  return true;
}

async function cancelByDonor(donorId, donationId) {
  const donation = await donationRepo.findById(donationId);
  if (!donation) throw new DonationError('Donation not found.', 404);
  if (donation.donorId !== donorId) throw new DonationError('Not your donation.', 403);
  const patch = buildTransitionPatch(donation.status, STATUS.CANCELLED);
  const updated = await donationRepo.update(donationId, patch);
  eventBus.emit(EVENTS.DONATION_CANCELLED, { donation: updated });
  return updated;
}

async function statsForDonor(donorId) {
  const all = await donationRepo.listByDonor(donorId);
  const by = (s) => all.filter((d) => d.status === s).length;
  return {
    total: all.length,
    pending: by(STATUS.PENDING),
    accepted: by(STATUS.ACCEPTED),
    collected: by(STATUS.COLLECTED),
  };
}

/* ---------------------------- NGO flows ---------------------------- */

/**
 * Browse Pending donations. Filters & pagination are pushed down to the repo.
 */
async function browseAvailable(filters = {}, pagination = {}) {
  return donationRepo.search(
    { ...filters, status: STATUS.PENDING },
    pagination
  );
}

/**
 * Generic search across any status — used by NGO history / admin.
 */
async function search(filters = {}, pagination = {}) {
  return donationRepo.search(filters, pagination);
}

async function listForNgo(ngoId, { status } = {}) {
  return donationRepo.listByNgo(ngoId, { status });
}

async function statsForNgo(ngoId) {
  const all = await donationRepo.listByNgo(ngoId);
  const by = (s) => all.filter((d) => d.status === s).length;
  const recent = all.filter((d) => d.status === STATUS.ACCEPTED).slice(0, 5);
  return {
    totalAccepted: all.length,
    pendingPickup: by(STATUS.ACCEPTED),
    collected: by(STATUS.COLLECTED),
    recent,
  };
}

async function acceptByNgo(ngoId, donationId) {
  const [donation, ngo] = await Promise.all([
    donationRepo.findById(donationId),
    userRepo.findById(ngoId),
  ]);
  if (!donation) throw new DonationError('Donation not found.', 404);
  if (!ngo || ngo.role !== 'ngo') throw new DonationError('NGO account required.', 403);

  const patch = buildTransitionPatch(donation.status, STATUS.ACCEPTED, {
    acceptedByNgoId: ngoId,
  });
  const updated = await donationRepo.update(donationId, patch);
  eventBus.emit(EVENTS.DONATION_ACCEPTED, { donation: updated });
  return updated;
}

async function markCollectedByNgo(ngoId, donationId) {
  const donation = await donationRepo.findById(donationId);
  if (!donation) throw new DonationError('Donation not found.', 404);
  if (donation.acceptedByNgoId !== ngoId) {
    throw new DonationError('Only the accepting NGO can mark this collected.', 403);
  }

  const patch = buildTransitionPatch(donation.status, STATUS.COLLECTED);
  const updated = await donationRepo.update(donationId, patch);
  eventBus.emit(EVENTS.DONATION_COLLECTED, { donation: updated });
  return updated;
}

/* ------------------------- Scheduled jobs ------------------------- */

/**
 * Called by a scheduler (cron / AWS EventBridge) — not exposed via HTTP.
 * Marks a single donation Expired if it is still Pending.
 */
async function expireDonation(donationId) {
  const donation = await donationRepo.findById(donationId);
  if (!donation) throw new DonationError('Donation not found.', 404);
  if (donation.status !== STATUS.PENDING) {
    throw new DonationError(`Cannot expire from status ${donation.status}.`, 409);
  }
  const patch = buildTransitionPatch(donation.status, STATUS.EXPIRED);
  const updated = await donationRepo.update(donationId, patch);
  eventBus.emit(EVENTS.DONATION_EXPIRED, { donation: updated });
  return updated;
}

module.exports = {
  // donor
  createForDonor,
  getById,
  listForDonor,
  deleteForDonor,
  cancelByDonor,
  statsForDonor,
  // ngo
  browseAvailable,
  search,
  listForNgo,
  statsForNgo,
  acceptByNgo,
  markCollectedByNgo,
  // scheduler
  expireDonation,
  // misc
  DonationError,
};
