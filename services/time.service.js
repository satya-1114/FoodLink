/**
 * Time provider.
 * The entire app reads "now" through this module so tests can freeze time
 * and so future scheduled jobs (AWS EventBridge) share a single clock source.
 *
 * Never call `Date.now()` or `new Date()` directly in services/controllers —
 * use `time.now()` / `time.nowIso()` instead.
 */
let frozenAt = null;

function now() {
  return frozenAt ? new Date(frozenAt.getTime()) : new Date();
}

function nowIso() {
  return now().toISOString();
}

/** Test helpers — no-ops in production code paths. */
function freeze(date) {
  frozenAt = date ? new Date(date) : new Date();
}
function unfreeze() {
  frozenAt = null;
}

module.exports = { now, nowIso, freeze, unfreeze };
