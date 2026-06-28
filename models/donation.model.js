/**
 * Donation domain model — pure shape + helpers. No DB calls.
 */
const time = require('../services/time.service');

const STATUS = Object.freeze({
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  COLLECTED: 'Collected',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
});

const VEG_TYPES = Object.freeze({ VEG: 'Veg', NON_VEG: 'Non-Veg' });

const FOOD_CATEGORIES = Object.freeze([
  'Cooked Meal',
  'Raw Ingredients',
  'Bakery',
  'Dairy',
  'Fruits',
  'Vegetables',
  'Packaged Food',
  'Beverages',
  'Other',
]);

/**
 * Allowed status transitions. Anything not listed here is rejected by
 * donation.service.transitionStatus().
 */
const TRANSITIONS = Object.freeze({
  [STATUS.PENDING]: [STATUS.ACCEPTED, STATUS.CANCELLED, STATUS.EXPIRED],
  [STATUS.ACCEPTED]: [STATUS.COLLECTED],
  [STATUS.COLLECTED]: [],
  [STATUS.EXPIRED]: [],
  [STATUS.CANCELLED]: [],
});

function isAllowedTransition(from, to) {
  return Array.isArray(TRANSITIONS[from]) && TRANSITIONS[from].includes(to);
}

/**
 * Build a normalized donation object ready for persistence.
 * Caller passes a plain object; we never mutate it.
 */
function buildDonation(data) {
  const now = time.nowIso();
  return {
    donorId: String(data.donorId),
    foodName: String(data.foodName || '').trim(),
    foodCategory: String(data.foodCategory || '').trim(),
    vegType: data.vegType === VEG_TYPES.NON_VEG ? VEG_TYPES.NON_VEG : VEG_TYPES.VEG,
    quantity: String(data.quantity || '').trim(),
    description: String(data.description || '').trim(),
    pickupAddress: String(data.pickupAddress || '').trim(),
    city: String(data.city || '').trim().toLowerCase(),
    pickupTime: data.pickupTime ? new Date(data.pickupTime).toISOString() : null,
    expiryTime: data.expiryTime ? new Date(data.expiryTime).toISOString() : null,
    contactNumber: String(data.contactNumber || '').trim(),
    imageUrl: data.imageUrl || null,
    status: data.status && Object.values(STATUS).includes(data.status) ? data.status : STATUS.PENDING,

    // Ownership / audit timestamps
    acceptedByNgoId: data.acceptedByNgoId || null,
    acceptedAt: data.acceptedAt || null,
    collectedAt: data.collectedAt || null,
    cancelledAt: data.cancelledAt || null,
    expiredAt: data.expiredAt || null,

    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

const isPending = (d) => d && d.status === STATUS.PENDING;
const isExpired = (d) => d && d.expiryTime && new Date(d.expiryTime).getTime() < time.now().getTime();

module.exports = {
  STATUS,
  VEG_TYPES,
  FOOD_CATEGORIES,
  TRANSITIONS,
  isAllowedTransition,
  buildDonation,
  isPending,
  isExpired,
};
