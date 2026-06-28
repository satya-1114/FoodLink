/**
 * Application-wide constants.
 *
 * Controllers and services MUST import from here instead of hardcoding
 * magic numbers / strings. This is the single place to tune limits.
 */

const DONATION_STATUS = Object.freeze({
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  COLLECTED: 'Collected',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
});

const USER_ROLES = Object.freeze({
  DONOR: 'donor',
  NGO: 'ngo',
  ADMIN: 'admin',
});

module.exports = Object.freeze({
  APP_NAME: 'FoodLink',
  APP_VERSION: '1.0.0',

  // Security
  PASSWORD_HASH_ROUNDS: 12,
  MIN_PASSWORD_LENGTH: 8,

  // Uploads
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5 MB
  SUPPORTED_IMAGE_TYPES: Object.freeze(['image/jpeg', 'image/png', 'image/webp']),
  UPLOAD_DIR_REL: 'public/uploads',

  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
  RECENT_LIST_SIZE: 5,

  // Domain
  DONATION_STATUS,
  USER_ROLES,
});
