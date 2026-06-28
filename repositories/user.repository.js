/**
 * Repository proxy — picks the implementation by `config.database.driver`.
 * Services keep importing `repositories/user.repository`; this file decides
 * whether the call lands in Firestore or DynamoDB.
 */
const config = require('../config');
const driver = (config.database && config.database.driver) || 'firestore';
module.exports = driver === 'dynamodb'
  ? require('./dynamodb/user.repository')
  : require('./firestore/user.repository');
