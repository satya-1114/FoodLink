/**
 * User domain model.
 * Plain shape + helpers; no DB calls live here.
 *
 * Roles: 'donor' | 'ngo' | 'admin'
 */
const ROLES = Object.freeze({
  DONOR: 'donor',
  NGO: 'ngo',
  ADMIN: 'admin',
});

/**
 * Build a normalized User object ready for persistence.
 * @param {object} data
 * @returns {object}
 */
function buildUser(data) {
  return {
    name: String(data.name || '').trim(),
    email: String(data.email || '').trim().toLowerCase(),
    passwordHash: data.passwordHash,
    role: data.role,
    phone: data.phone ? String(data.phone).trim() : '',
    address: data.address ? String(data.address).trim() : '',
    // NGO-specific
    organizationName: data.organizationName ? String(data.organizationName).trim() : '',
    registrationNumber: data.registrationNumber ? String(data.registrationNumber).trim() : '',
    // Status / meta
    isActive: data.isActive !== false,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Strip sensitive fields before sending a user to the view layer or session.
 */
function toPublic(user) {
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = { ROLES, buildUser, toPublic };
