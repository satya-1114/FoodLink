/**
 * Firebase Admin initialization.
 * This is the ONLY file in the project that imports `firebase-admin`.
 * The rest of the app talks to Firestore exclusively through repositories.
 *
 * To migrate to AWS DynamoDB later:
 *   1. Add a sibling config/dynamodb.js exporting a DocumentClient.
 *   2. Add repository implementations under repositories/dynamodb/.
 *   3. Switch DB_DRIVER in .env — no controller/service changes needed.
 */
const path = require('path');
const admin = require('firebase-admin');
const logger = require('../utils/logger');

let db = null;

function init() {
  if (admin.apps.length) {
    db = admin.firestore();
    return db;
  }

  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!keyPath) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set.');
  }

  // eslint-disable-next-line import/no-dynamic-require, global-require
  const serviceAccount = require(path.resolve(keyPath));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
  });

  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });

  logger.info('Firebase Admin initialized.');
  return db;
}

function getDb() {
  if (!db) return init();
  return db;
}

module.exports = { init, getDb, admin };
