const { db, COLLECTIONS } = require('../config/db');

const MAX_CHILDREN_PER_PARENT = 6;

const getParentChildIds = async (parentUid) => {
  const parentDoc = await db.collection(COLLECTIONS.USERS).doc(parentUid).get();
  const parent = parentDoc.exists ? parentDoc.data() : {};
  const storedIds = Array.isArray(parent.childUids) ? parent.childUids : [];

  const childSnap = await db
    .collection(COLLECTIONS.USERS)
    .where('parentUid', '==', parentUid)
    .get();

  const linkedIds = childSnap.docs.map((doc) => doc.id);
  const legacyId = parent.pairedWith && !storedIds.includes(parent.pairedWith)
    ? [parent.pairedWith]
    : [];

  return [...new Set([...storedIds, ...linkedIds, ...legacyId])];
};

const getParentChildren = async (parentUid) => {
  const childIds = await getParentChildIds(parentUid);
  if (childIds.length === 0) return [];

  const docs = await Promise.all(
    childIds.map((uid) => db.collection(COLLECTIONS.USERS).doc(uid).get())
  );

  return docs
    .filter((doc) => doc.exists && doc.data().role === 'child')
    .map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: data.displayName ?? 'Child',
        email: data.email ?? '',
        protectionLevel: data.protectionLevel ?? 'strict',
        pairedAt: data.pairedAt ?? null,
        lastSeenAt: data.lastSeenAt ?? null,
      };
    });
};

module.exports = {
  MAX_CHILDREN_PER_PARENT,
  getParentChildIds,
  getParentChildren,
};
