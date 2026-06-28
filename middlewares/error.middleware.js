/**
 * Centralized error handler.
 * Always last in the middleware chain.
 */
const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  logger.error(`${req.method} ${req.originalUrl} -> ${status}`, err.message);
  if (process.env.NODE_ENV !== 'production') {
    logger.error(err.stack);
  }

  res.status(status).render('pages/error', {
    title: 'Something went wrong',
    status,
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again later.'
        : err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
