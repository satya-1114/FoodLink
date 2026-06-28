/**
 * Donor service — business logic for donor accounts.
 * Donation-specific operations land here in Module 6.
 */
const userRepository = require('../repositories/user.repository');
const { toPublic, ROLES } = require('../models/user.model');

async function getProfile(donorId) {
  const user = await userRepository.findById(donorId);
  if (!user || user.role !== ROLES.DONOR) return null;
  return toPublic(user);
}

async function updateProfile(donorId, patch) {
  const allowed = ['name', 'phone', 'address'];
  const safePatch = {};
  for (const key of allowed) {
    if (patch[key] !== undefined) safePatch[key] = String(patch[key]).trim();
  }
  const updated = await userRepository.update(donorId, safePatch);
  return toPublic(updated);
}

module.exports = { getProfile, updateProfile };
