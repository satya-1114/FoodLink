/**
 * FoodLink - Application Entry Point
 */
require('dotenv').config();

const app = require('./config/express');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;

console.log("Starting on port:", PORT);

app.listen(PORT, () => {
  logger.info(`FoodLink server running on http://localhost:${PORT} [${process.env.NODE_ENV}]`);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});
