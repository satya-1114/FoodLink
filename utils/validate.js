/**
 * Helper to run an express-validator chain and re-render a form on failure.
 */
const { validationResult, matchedData } = require('express-validator');

/**
 * @param {import('express').Request} req
 * @returns {{ valid: boolean, errors: object[], data: object }}
 */
function collectValidation(req) {
  const result = validationResult(req);
  return {
    valid: result.isEmpty(),
    errors: result.array({ onlyFirstError: true }),
    data: matchedData(req, { locations: ['body'] }),
  };
}

module.exports = { collectValidation };
