/**
 * User repository — the ONLY place that knows we use Firestore for users.
 * Swap this file (or pick another implementation via DB_DRIVER) when moving
 * to DynamoDB. The public API below must remain stable.
 */
const { getDb } = require('../../config/firebase');

const COLLECTION = 'users';

function collection() {
  return getDb().collection(COLLECTION);
}

/** Map a Firestore snapshot doc to a plain object with `id`. */
function fromDoc(doc) {
  if (!doc || !doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function create(user) {
  const ref = await collection().add(user);
  const snap = await ref.get();
  return fromDoc(snap);
}

async function findById(id) {
  if (!id) return null;
  const snap = await collection().doc(id).get();
  return fromDoc(snap);
}

async function findByEmail(email) {
  if (!email) return null;
  const snap = await collection()
    .where('email', '==', String(email).toLowerCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  return fromDoc(snap.docs[0]);
}

async function findByEmailAndRole(email, role) {
  if (!email || !role) return null;
  const snap = await collection()
    .where('email', '==', String(email).toLowerCase())
    .where('role', '==', role)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return fromDoc(snap.docs[0]);
}

async function update(id, patch) {
  await collection().doc(id).set(
    { ...patch, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  return findById(id);
}

async function remove(id) {
  await collection().doc(id).delete();
  return true;
}

async function listAll({ role } = {}) {
  let query = collection();
  if (role) query = query.where('role', '==', role);
  const snap = await query.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function count({ role } = {}) {
  const items = await listAll({ role });
  return items.length;
}

module.exports = {
  create,
  findById,
  findByEmail,
  findByEmailAndRole,
  update,
  remove,
  listAll,
  count,
};
