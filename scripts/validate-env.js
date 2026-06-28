#!/usr/bin/env node
/**
 * Standalone env validator — fail fast before deploys.
 *   node scripts/validate-env.js
 */
require('dotenv').config();
const { validateEnv } = require('../config/validate-env');

try {
  validateEnv(process.env);
  // eslint-disable-next-line no-console
  console.log('OK — environment is valid.');
  process.exit(0);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(err.message);
  process.exit(1);
}
