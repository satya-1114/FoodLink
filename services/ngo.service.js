/**
 * NGO service — business logic for NGO accounts.
 * Donation browsing/accepting lands here in Module 6.
 */
const userRepository = require('../repositories/user.repository');
const { toPublic, ROLES } = require('../models/user.model');

async function getProfile(ngoId) {
  const user = await userRepository.findById(ngoId);
  if (!user || user.role !== ROLES.NGO) return null;
  return toPublic(user);
}

async function updateProfile(ngoId, patch) {
  const allowed = ['name', 'phone', 'address', 'organizationName', 'registrationNumber'];
  const safePatch = {};
  for (const key of allowed) {
    if (patch[key] !== undefined) safePatch[key] = String(patch[key]).trim();
  }
  const updated = await userRepository.update(ngoId, safePatch);
  return toPublic(updated);
}

module.exports = { getProfile, updateProfile };
