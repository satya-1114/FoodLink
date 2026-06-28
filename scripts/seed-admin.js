/**
 * One-off script to seed the initial admin user.
 *
 * Usage:
 *   node scripts/seed-admin.js admin@foodlink.local StrongPass123 "FoodLink Admin"
 *
 * Uses the same repository layer as the rest of the app — no direct Firestore calls.
 */
require('dotenv').config();

const bcrypt = require('bcrypt');
const firebase = require('../config/firebase');
const userRepository = require('../repositories/user.repository');
const { buildUser, ROLES } = require('../models/user.model');

async function main() {
  const [, , email, password, name = 'FoodLink Admin'] = process.argv;
  if (!email || !password) {
    console.error('Usage: node scripts/seed-admin.js <email> <password> [name]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  firebase.init();

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    console.error(`User ${email} already exists (role: ${existing.role}). Aborting.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = buildUser({ name, email, passwordHash, role: ROLES.ADMIN });
  const created = await userRepository.create(admin);

  console.log(`Admin created: ${created.email} (id: ${created.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
