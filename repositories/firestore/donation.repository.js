/**
 * Donation repository — Firestore implementation.
 * Only this file knows the donation collection lives in Firestore.
 *
 * Filter + pagination logic also lives here (per the architecture rule).
 * For DynamoDB, replicate `search()` with a GSI / FilterExpression.
 */
const { getDb } = require('../../config/firebase');

const COLLECTION = 'donations';

function collection() {
  return getDb().collection(COLLECTION);
}

function fromDoc(doc) {
  if (!doc || !doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function create(donation) {
  const ref = await collection().add(donation);
  const snap = await ref.get();
  return fromDoc(snap);
}

async function findById(id) {
  if (!id) return null;
  const snap = await collection().doc(id).get();
  return fromDoc(snap);
}

async function update(id, patch) {
  await collection().doc(id).set(patch, { merge: true });
  return findById(id);
}

async function remove(id) {
  await collection().doc(id).delete();
  return true;
}

function sortByCreatedDesc(items) {
  return items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function listAll() {
  const snap = await collection().get();
  return sortByCreatedDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

async function listByDonor(donorId) {
  if (!donorId) return [];
  const snap = await collection().where('donorId', '==', donorId).get();
  return sortByCreatedDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

async function listByNgo(ngoId, { status } = {}) {
  if (!ngoId) return [];
  let query = collection().where('acceptedByNgoId', '==', ngoId);
  if (status) query = query.where('status', '==', status);
  const snap = await query.get();
  return sortByCreatedDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

async function countByNgo(ngoId, status) {
  const items = await listByNgo(ngoId, { status });
  return items.length;
}

async function count() {
  const snap = await collection().get();
  return snap.size;
}

/**
 * Search donations with filters and pagination.
 *
 * Firestore can't combine arbitrary `where` + substring search without a
 * dedicated full-text index, so we apply equality filters server-side and
 * the text search + pagination in memory. This is the single place to
 * optimize when traffic grows or when migrating to DynamoDB/OpenSearch.
 *
 * @param {object} filters
 *   - status?: string
 *   - foodCategory?: string
 *   - vegType?: 'Veg' | 'Non-Veg'
 *   - city?: string (case-insensitive)
 *   - q?: string (substring on foodName)
 * @param {object} pagination { page=1, limit=10 }
 * @returns {Promise<{ items, total, page, limit, totalPages }>}
 */
async function search(filters = {}, pagination = {}) {
  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(pagination.limit, 10) || 10));

  let query = collection();
  if (filters.status) query = query.where('status', '==', filters.status);
  if (filters.foodCategory) query = query.where('foodCategory', '==', filters.foodCategory);
  if (filters.vegType) query = query.where('vegType', '==', filters.vegType);
  if (filters.city) query = query.where('city', '==', String(filters.city).trim().toLowerCase());

  const snap = await query.get();
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (filters.q) {
    const needle = String(filters.q).toLowerCase().trim();
    if (needle) items = items.filter((d) => String(d.foodName || '').toLowerCase().includes(needle));
  }

  items = sortByCreatedDesc(items);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const pageItems = items.slice(start, start + limit);

  return { items: pageItems, total, page, limit, totalPages };
}

module.exports = {
  create,
  findById,
  update,
  remove,
  listAll,
  listByDonor,
  listByNgo,
  countByNgo,
  search,
  count,
};
