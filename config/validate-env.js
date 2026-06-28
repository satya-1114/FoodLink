/**
 * Environment validator — fail-fast at startup if required vars are missing.
 *
 * Used by config/index.js. Centralizes the "what must be set" list so that
 * docker / EC2 / ECS deployments fail loudly rather than serving requests
 * with a broken configuration.
 */

const REQUIRED_BASE = ['NODE_ENV', 'PORT', 'SESSION_SECRET'];

const REQUIRED_BY_ENV = {
  development: ['FIREBASE_SERVICE_ACCOUNT'],
  production: ['FIREBASE_SERVICE_ACCOUNT', 'SESSION_SECRET'],
  test: [],
  aws: ['AWS_REGION'],
};

function validateEnv(env = process.env) {
  const errors = [];
  const mode = (env.NODE_ENV || 'development').toLowerCase();

  for (const key of REQUIRED_BASE) {
    if (!env[key] || String(env[key]).trim() === '') {
      errors.push(`Missing required env var: ${key}`);
    }
  }
  for (const key of REQUIRED_BY_ENV[mode] || []) {
    if (!env[key] || String(env[key]).trim() === '') {
      errors.push(`Missing required env var for ${mode}: ${key}`);
    }
  }

  if (mode === 'production' && env.SESSION_SECRET && env.SESSION_SECRET.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters in production.');
  }

  if (errors.length) {
    const msg = ['Configuration validation failed:', ...errors.map((e) => `  - ${e}`)].join('\n');
    throw new Error(msg);
  }
  return true;
}

module.exports = { validateEnv, REQUIRED_BASE, REQUIRED_BY_ENV };
