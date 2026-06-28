/**
 * Lightweight retry helper for transient AWS errors.
 *
 * Translates AWS exceptions to a domain `AwsError` so callers never receive
 * raw SDK error shapes. Use this around every SDK send().
 */
const logger = require('../utils/logger');

class AwsError extends Error {
  constructor(message, { status = 502, cause } = {}) {
    super(message);
    this.name = 'AwsError';
    this.status = status;
    this.cause = cause;
  }
}

const RETRYABLE_CODES = new Set([
  'ThrottlingException',
  'Throttling',
  'TooManyRequestsException',
  'ProvisionedThroughputExceededException',
  'RequestTimeout',
  'RequestTimeoutException',
  'ServiceUnavailable',
  'InternalServerError',
  'NetworkingError',
  'TimeoutError',
  'ECONNRESET',
  'EAI_AGAIN',
  'ETIMEDOUT',
]);

function isRetryable(err) {
  if (!err) return false;
  if (err.$retryable && err.$retryable.throttling) return true;
  if (RETRYABLE_CODES.has(err.name) || RETRYABLE_CODES.has(err.code)) return true;
  const status = err.$metadata && err.$metadata.httpStatusCode;
  if (status && status >= 500) return true;
  return false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Run `fn` with exponential backoff for transient errors.
 * @param {Function} fn async function returning a value
 * @param {object} opts { attempts=3, baseMs=150, label='aws' }
 */
async function withRetry(fn, { attempts = 3, baseMs = 150, label = 'aws' } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !isRetryable(err)) break;
      const delay = baseMs * 2 ** i + Math.floor(Math.random() * 50);
      logger.warn(`[${label}] transient error (${err.name || err.code}); retry ${i + 1}/${attempts - 1} in ${delay}ms`);
      await sleep(delay);
    }
  }
  // Wrap & re-throw — never leak the raw SDK exception.
  throw new AwsError(`${label} call failed: ${lastErr.message || lastErr.name}`, {
    status: (lastErr.$metadata && lastErr.$metadata.httpStatusCode) || 502,
    cause: lastErr,
  });
}

module.exports = { withRetry, AwsError, isRetryable };
