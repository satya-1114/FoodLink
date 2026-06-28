/**
 * User repository — DynamoDB implementation.
 * Same surface as repositories/firestore/user.repository.js.
 */
const { randomUUID } = require('crypto');
const ddb = require('../../aws/database.adapter');
const TABLE = ddb.usersTable;

function normEmail(email) {
  return String(email || '').toLowerCase();
}

async function create(user) {
  const id = randomUUID();
  const item = { ...user, id, email: normEmail(user.email) };
  await ddb.put(TABLE(), item);
  return item;
}

async function findById(id) {
  return ddb.get(TABLE(), id);
}

async function findByEmail(email) {
  if (!email) return null;
  const items = await ddb.queryByIndex(TABLE(), 'EmailIndex', 'email', normEmail(email));
  return items[0] || null;
}

async function findByEmailAndRole(email, role) {
  const u = await findByEmail(email);
  return u && u.role === role ? u : null;
}

async function update(id, patch) {
  return ddb.patch(TABLE(), id, { ...patch, updatedAt: new Date().toISOString() });
}

async function remove(id) {
  return ddb.remove(TABLE(), id);
}

async function listAll({ role } = {}) {
  if (role) {
    return ddb.scanAll(TABLE(), {
      FilterExpression: '#r = :r',
      ExpressionAttributeNames: { '#r': 'role' },
      ExpressionAttributeValues: { ':r': role },
    });
  }
  return ddb.scanAll(TABLE());
}

async function count({ role } = {}) {
  const items = await listAll({ role });
  return items.length;
}

module.exports = {
  create, findById, findByEmail, findByEmailAndRole,
  update, remove, listAll, count,
};
