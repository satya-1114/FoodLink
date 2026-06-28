/**
 * Repository proxy — picks the implementation by `config.database.driver`.
 */
const config = require('../config');
const driver = (config.database && config.database.driver) || 'firestore';
module.exports = driver === 'dynamodb'
  ? require('./dynamodb/donation.repository')
  : require('./firestore/donation.repository');
