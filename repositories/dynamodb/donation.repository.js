/**
 * Donation repository — DynamoDB implementation.
 * Same surface as repositories/firestore/donation.repository.js.
 */
const { randomUUID } = require('crypto');
const ddb = require('../../aws/database.adapter');
const TABLE = ddb.donationsTable;

function sortByCreatedDesc(items) {
  return [...items].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function create(donation) {
  const id = randomUUID();
  const item = { ...donation, id };
  await ddb.put(TABLE(), item);
  return item;
}

async function findById(id) {
  return ddb.get(TABLE(), id);
}

async function update(id, patch) {
  return ddb.patch(TABLE(), id, patch);
}

async function remove(id) {
  return ddb.remove(TABLE(), id);
}

async function listAll() {
  return sortByCreatedDesc(await ddb.scanAll(TABLE()));
}

async function listByDonor(donorId) {
  if (!donorId) return [];
  const items = await ddb.scanAll(TABLE(), {
    FilterExpression: 'donorId = :d',
    ExpressionAttributeValues: { ':d': donorId },
  });
  return sortByCreatedDesc(items);
}

async function listByNgo(ngoId, { status } = {}) {
  if (!ngoId) return [];
  const exprValues = { ':n': ngoId };
  let expr = 'acceptedByNgoId = :n';
  let names;
  if (status) {
    expr += ' AND #s = :s';
    exprValues[':s'] = status;
    names = { '#s': 'status' };
  }
  const items = await ddb.scanAll(TABLE(), {
    FilterExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: exprValues,
  });
  return sortByCreatedDesc(items);
}

async function countByNgo(ngoId, status) {
  const items = await listByNgo(ngoId, { status });
  return items.length;
}

async function count() {
  const items = await ddb.scanAll(TABLE());
  return items.length;
}

/**
 * Search donations with filters + pagination — same contract as the
 * Firestore implementation.
 */
async function search(filters = {}, pagination = {}) {
  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(pagination.limit, 10) || 10));

  const names = {};
  const values = {};
  const exprs = [];

  if (filters.status)       { names['#s'] = 'status';       values[':s'] = filters.status;       exprs.push('#s = :s'); }
  if (filters.foodCategory) {                                values[':fc'] = filters.foodCategory; exprs.push('foodCategory = :fc'); }
  if (filters.vegType)      {                                values[':vt'] = filters.vegType;      exprs.push('vegType = :vt'); }
  if (filters.city)         {                                values[':c'] = String(filters.city).trim().toLowerCase(); exprs.push('city = :c'); }

  let items = await ddb.scanAll(TABLE(), {
    FilterExpression: exprs.length ? exprs.join(' AND ') : undefined,
    ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
    ExpressionAttributeValues: Object.keys(values).length ? values : undefined,
  });

  if (filters.q) {
    const needle = String(filters.q).toLowerCase().trim();
    if (needle) items = items.filter((d) => String(d.foodName || '').toLowerCase().includes(needle));
  }

  items = sortByCreatedDesc(items);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), total, page, limit, totalPages };
}

module.exports = {
  create, findById, update, remove,
  listAll, listByDonor, listByNgo, countByNgo, search, count,
};
