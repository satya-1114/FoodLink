/**
 * Config entry point.
 *
 * Resolution order:
 *   1. Validate required env vars (fail-fast).
 *   2. Pick a profile:
 *        - DEPLOY_TARGET=aws  → aws.js
 *        - NODE_ENV=production → production.js
 *        - otherwise           → development.js
 *   3. Re-export shared app constants from ./app.
 *
 * Services & controllers MUST import from here, not from process.env.
 */
const { validateEnv } = require('./validate-env');
const appConstants = require('./app');

validateEnv(process.env);

function pickProfile() {
  if ((process.env.DEPLOY_TARGET || '').toLowerCase() === 'aws') {
    return require('./aws');
  }
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    return require('./production');
  }
  return require('./development');
}

const profile = pickProfile();

module.exports = Object.freeze({
  ...appConstants,
  ...profile,
  constants: appConstants,
});
