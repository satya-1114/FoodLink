/**
 * Admin service — orchestrates user & donation management for admins.
 *
 * Strict layering: this is the only place admin business logic lives.
 * Controllers thin-delegate here; repositories handle persistence.
 */
const userRepo = require('../repositories/user.repository');
const donationRepo = require('../repositories/donation.repository');
const storage = require('./storage.service');
const audit = require('./audit.service');
const { eventBus, EVENTS } = require('../events/eventBus');
const {
  USER_ROLES,
  DONATION_STATUS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  RECENT_LIST_SIZE,
} = require('../config/app');

class AdminError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AdminError';
    this.status = status;
  }
}

/* ------------------------------ Helpers ------------------------------ */

function clampPage(pagination = {}) {
  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(pagination.limit, 10) || DEFAULT_PAGE_SIZE)
  );
  return { page, limit };
}

function paginate(items, { page, limit }) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), total, page, limit, totalPages };
}

function sortByCreatedDesc(items) {
  return [...items].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/* --------------------------- Dashboard stats --------------------------- */

async function getDashboardStats() {
  const [users, donations] = await Promise.all([
    userRepo.listAll(),
    donationRepo.listAll(),
  ]);

  const byRole = (r) => users.filter((u) => u.role === r).length;
  const byStatus = (s) => donations.filter((d) => d.status === s).length;

  const recentUsers = sortByCreatedDesc(users.filter((u) => u.role !== USER_ROLES.ADMIN))
    .slice(0, RECENT_LIST_SIZE);
  const recentDonations = sortByCreatedDesc(donations).slice(0, RECENT_LIST_SIZE);

  return {
    totals: {
      users: users.length,
      donors: byRole(USER_ROLES.DONOR),
      ngos: byRole(USER_ROLES.NGO),
      donations: donations.length,
    },
    donations: {
      pending: byStatus(DONATION_STATUS.PENDING),
      accepted: byStatus(DONATION_STATUS.ACCEPTED),
      collected: byStatus(DONATION_STATUS.COLLECTED),
      expired: byStatus(DONATION_STATUS.EXPIRED),
      cancelled: byStatus(DONATION_STATUS.CANCELLED),
    },
    recentUsers,
    recentDonations,
  };
}

/* ------------------------------- Users ------------------------------- */

async function searchUsers(filters = {}, pagination = {}) {
  const { page, limit } = clampPage(pagination);
  const role = filters.role && Object.values(USER_ROLES).includes(filters.role)
    ? filters.role
    : undefined;

  let items = await userRepo.listAll({ role });

  // Hide admins from management UI unless explicitly requested.
  if (!role) items = items.filter((u) => u.role !== USER_ROLES.ADMIN);

  if (filters.status === 'active') items = items.filter((u) => u.isActive !== false);
  if (filters.status === 'inactive') items = items.filter((u) => u.isActive === false);

  if (filters.q) {
    const needle = String(filters.q).toLowerCase().trim();
    if (needle) {
      items = items.filter((u) =>
        [u.name, u.email, u.organizationName, u.phone, u.city]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle))
      );
    }
  }

  items = sortByCreatedDesc(items);
  return paginate(items, { page, limit });
}

async function getUser(id) {
  const user = await userRepo.findById(id);
  if (!user) throw new AdminError('User not found.', 404);
  return user;
}

async function setUserActive(actorId, userId, isActive) {
  const user = await userRepo.findById(userId);
  if (!user) throw new AdminError('User not found.', 404);
  if (user.role === USER_ROLES.ADMIN) {
    throw new AdminError('Admin accounts cannot be modified here.', 403);
  }
  const updated = await userRepo.update(userId, { isActive: Boolean(isActive) });
  eventBus.emit(EVENTS.USER_DEACTIVATED, { user: updated, actorId });
  return updated;
}

async function deleteUser(actorId, userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw new AdminError('User not found.', 404);
  if (user.role === USER_ROLES.ADMIN) {
    throw new AdminError('Admin accounts cannot be deleted here.', 403);
  }
  await userRepo.remove(userId);
  eventBus.emit(EVENTS.USER_DELETED, { userId, actorId });
  return true;
}

/* ----------------------------- Donations ----------------------------- */

async function searchDonations(filters = {}, pagination = {}) {
  const { page, limit } = clampPage(pagination);
  return donationRepo.search(filters, { page, limit });
}

async function getDonation(id) {
  const d = await donationRepo.findById(id);
  if (!d) throw new AdminError('Donation not found.', 404);
  return d;
}

async function deleteDonation(actorId, donationId) {
  const donation = await donationRepo.findById(donationId);
  if (!donation) throw new AdminError('Donation not found.', 404);

  await donationRepo.remove(donationId);
  await storage.deleteImage(donation.imageUrl);

  audit.record('ADMIN_DONATION_DELETED', { donationId, actorId });
  eventBus.emit(EVENTS.DONATION_DELETED, { donationId, actorId });
  return true;
}

module.exports = {
  AdminError,
  getDashboardStats,
  searchUsers,
  getUser,
  setUserActive,
  deleteUser,
  searchDonations,
  getDonation,
  deleteDonation,
};
