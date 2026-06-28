/**
 * Authentication service.
 * Holds business logic for register / login / logout.
 * Controllers call this — never the repository directly.
 */
const bcrypt = require('bcrypt');
const userRepository = require('../repositories/user.repository');
const { buildUser, toPublic, ROLES } = require('../models/user.model');
const { PASSWORD_HASH_ROUNDS, MIN_PASSWORD_LENGTH } = require('../config/app');
const { eventBus, EVENTS } = require('../events/eventBus');


class AuthError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.name = 'AuthError';
  }
}

function assertRole(role) {
  if (!Object.values(ROLES).includes(role)) {
    throw new AuthError('Invalid user role.', 400);
  }
}

/**
 * Register a new user (donor or NGO; admin is seeded separately).
 * @returns {Promise<object>} public user (no passwordHash)
 */
async function register({ role, password, ...rest }) {
  assertRole(role);
  if (role === ROLES.ADMIN) {
    throw new AuthError('Admin accounts cannot self-register.', 403);
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new AuthError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 400);
  }

  const existing = await userRepository.findByEmail(rest.email);
  if (existing) {
    throw new AuthError('An account with this email already exists.', 409);
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  const user = buildUser({ ...rest, role, passwordHash });
  const created = await userRepository.create(user);
  const publicUser = toPublic(created);
  eventBus.emit(EVENTS.USER_REGISTERED, { user: publicUser });
  return publicUser;
}

/**
 * Verify credentials and (optionally) enforce a role.
 * @returns {Promise<object>} public user
 */
async function login({ email, password, role }) {
  if (!email || !password) {
    throw new AuthError('Email and password are required.', 400);
  }

  const user = role
    ? await userRepository.findByEmailAndRole(email, role)
    : await userRepository.findByEmail(email);

  if (!user) throw new AuthError('Invalid email or password.', 401);
  if (user.isActive === false) throw new AuthError('Account disabled.', 403);

  const ok = await bcrypt.compare(password, user.passwordHash || '');
  if (!ok) throw new AuthError('Invalid email or password.', 401);

  return toPublic(user);
}

/**
 * Destroy the session. Wrapped here so controllers stay slim.
 */
function logout(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) return resolve();
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}

/**
 * Persist the user in the session.
 */
function startSession(req, user) {
  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

module.exports = {
  register,
  login,
  logout,
  startSession,
  AuthError,
};
