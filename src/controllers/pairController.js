const { db, COLLECTIONS } = require('../config/db');
const { admin } = require('../config/firebase');
const { getParentChildIds, getParentChildren, MAX_CHILDREN_PER_PARENT } = require('../utils/children');

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generates a cryptographically random 6-digit numeric code.
 * Using Math.random() is intentionally avoided — crypto gives unpredictability.
 */
const generateCode = () => {
  const { randomInt } = require('crypto');
  // randomInt(min, max) → [min, max), so 100000–999999 = always 6 digits
  return String(randomInt(100000, 1000000));
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /pair/generate
 * Role: parent only (enforced by requireRole middleware before this handler)
 *
 * Creates a 6-digit pairing code stored in Firestore under `pairings/{code}`.
 * The code expires in 10 minutes and can only be used once.
 *
 * Returns: { code, expiresAt }
 */
const generate = async (req, res) => {
  const parentUid = req.user.uid;

  try {
    const childIds = await getParentChildIds(parentUid);
    if (childIds.length >= MAX_CHILDREN_PER_PARENT) {
      return res.status(409).json({
        error: `This parent account already has the maximum of ${MAX_CHILDREN_PER_PARENT} children.`,
        maxChildren: MAX_CHILDREN_PER_PARENT,
      });
    }

    // Generate a unique code (retry if collision — extremely rare)
    let code;
    let attempts = 0;
    do {
      code = generateCode();
      const existing = await db.collection(COLLECTIONS.PAIRINGS).doc(code).get();
      if (!existing.exists || existing.data().used) break; // slot is free
      attempts++;
    } while (attempts < 5);

    const now = Date.now();
    const expiresAt = new Date(now + CODE_EXPIRY_MS).toISOString();

    await db.collection(COLLECTIONS.PAIRINGS).doc(code).set({
      parentUid,
      createdAt: new Date(now).toISOString(),
      expiresAt,
      used: false,
    });

    return res.status(201).json({
      message: 'Pairing code generated. Share this with your child.',
      code,
      expiresAt,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate pairing code.', detail: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /pair/join
 * Role: child only (enforced by requireRole middleware before this handler)
 * Body: { code }
 *
 * Flow:
 *  1. Look up the code document in `pairings`.
 *  2. Validate: exists, not used, not expired.
 *  3. Write `pairedWith` on BOTH the child's and parent's user documents.
 *  4. Mark the code as used so it can't be reused.
 *
 * Returns: { message, parentUid, childUid }
 */
const join = async (req, res) => {
  const { code } = req.body;
  const childUid = req.user.uid;

  if (!code) {
    return res.status(400).json({ error: 'code is required.' });
  }

  try {
    // Check child isn't already paired
    const childDoc = await db.collection(COLLECTIONS.USERS).doc(childUid).get();
    if (childDoc.data().parentUid || childDoc.data().pairedWith) {
      return res.status(409).json({
        error: 'This child account is already paired with a parent.',
        pairedWith: childDoc.data().parentUid ?? childDoc.data().pairedWith,
      });
    }

    // Fetch the pairing code document
    const pairingDoc = await db.collection(COLLECTIONS.PAIRINGS).doc(code).get();

    if (!pairingDoc.exists) {
      return res.status(404).json({ error: 'Pairing code not found. Check the code and try again.' });
    }

    const pairing = pairingDoc.data();

    if (pairing.used) {
      return res.status(410).json({ error: 'This pairing code has already been used.' });
    }

    if (new Date() > new Date(pairing.expiresAt)) {
      return res.status(410).json({ error: 'This pairing code has expired. Ask the parent to generate a new one.' });
    }

    if (pairing.parentUid === childUid) {
      return res.status(400).json({ error: 'A parent account cannot pair with itself.' });
    }

    const parentUid = pairing.parentUid;
    const childIds = await getParentChildIds(parentUid);

    if (childIds.length >= MAX_CHILDREN_PER_PARENT) {
      return res.status(409).json({
        error: `This parent account already has the maximum of ${MAX_CHILDREN_PER_PARENT} children.`,
        maxChildren: MAX_CHILDREN_PER_PARENT,
      });
    }

    // Atomic batch: update both users + mark code used in one operation
    const batch = db.batch();
    const now = new Date().toISOString();

    batch.update(db.collection(COLLECTIONS.USERS).doc(childUid), {
      parentUid,
      pairedWith: parentUid,
      pairedAt: now,
      protectionLevel: childDoc.data().protectionLevel ?? 'strict',
    });

    batch.update(db.collection(COLLECTIONS.USERS).doc(parentUid), {
      childUids: admin.firestore.FieldValue.arrayUnion(childUid),
      pairedWith: childUid,
      updatedAt: now,
    });

    batch.update(db.collection(COLLECTIONS.PAIRINGS).doc(code), {
      used: true,
      usedAt: now,
      childUid,
    });

    await batch.commit();

    return res.json({
      message: 'Successfully paired! Child and parent accounts are now linked.',
      parentUid,
      childUid,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Pairing failed.', detail: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /pair/status
 * Role: any authenticated user
 *
 * Returns the current pairing status for the caller.
 * Useful for the app to know whether to show the pairing screen or dashboard.
 */
const status = async (req, res) => {
  try {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(req.user.uid).get();
    const profile = userDoc.data();
    const { role } = profile;

    if (role === 'parent') {
      const children = await getParentChildren(req.user.uid);

      return res.json({
        paired: children.length > 0,
        role,
        pairedWith: children[0]?.uid ?? null,
        children,
        childCount: children.length,
        maxChildren: MAX_CHILDREN_PER_PARENT,
      });
    }

    const pairedWith = profile.parentUid ?? profile.pairedWith;

    if (!pairedWith) {
      return res.json({ paired: false, role });
    }

    // Fetch the paired user's display name for the UI
    const partnerDoc = await db.collection(COLLECTIONS.USERS).doc(pairedWith).get();
    const partnerName = partnerDoc.exists ? partnerDoc.data().displayName : 'Unknown';

    return res.json({
      paired: true,
      role,
      pairedWith,
      partnerName,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch pairing status.', detail: err.message });
  }
};

module.exports = { generate, join, status };
