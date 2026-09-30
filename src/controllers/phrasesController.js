const { db, COLLECTIONS } = require('../config/db');

/**
 * GET /phrases
 * Role: parent only
 *
 * Returns all flagged phrases owned by this parent, ordered by creation date.
 */
const list = async (req, res) => {
  const parentUid = req.user.uid;

  try {
    const snapshot = await db
      .collection(COLLECTIONS.PHRASES)
      .where('addedBy', '==', parentUid)
      .orderBy('createdAt', 'asc')
      .get();

    const phrases = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.json({ count: phrases.length, phrases });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch phrases.', detail: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /phrases
 * Role: parent only
 * Body: { text }
 *
 * Adds a new phrase to this parent's flagged phrase list.
 * - Text is normalized to lowercase so scanning is case-insensitive.
 * - Duplicate check prevents the same phrase being added twice.
 */
const add = async (req, res) => {
  const parentUid = req.user.uid;
  const rawText = req.body.text;

  if (!rawText || typeof rawText !== 'string') {
    return res.status(400).json({ error: 'text is required and must be a string.' });
  }

  const text = rawText.trim().toLowerCase();

  if (text.length < 2) {
    return res.status(400).json({ error: 'Phrase must be at least 2 characters long.' });
  }
  if (text.length > 200) {
    return res.status(400).json({ error: 'Phrase must be 200 characters or fewer.' });
  }

  try {
    // Duplicate check — same phrase from the same parent
    const existing = await db
      .collection(COLLECTIONS.PHRASES)
      .where('addedBy', '==', parentUid)
      .where('text', '==', text)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(409).json({ error: 'This phrase is already in your list.' });
    }

    const docRef = await db.collection(COLLECTIONS.PHRASES).add({
      text,
      addedBy:   parentUid,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({
      message: 'Phrase added.',
      phrase: { id: docRef.id, text, addedBy: parentUid },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add phrase.', detail: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * DELETE /phrases/:id
 * Role: parent only
 *
 * Deletes a phrase by Firestore document ID.
 * Verifies the phrase belongs to the requesting parent before deleting.
 */
const remove = async (req, res) => {
  const parentUid = req.user.uid;
  const { id } = req.params;

  try {
    const phraseDoc = await db.collection(COLLECTIONS.PHRASES).doc(id).get();

    if (!phraseDoc.exists) {
      return res.status(404).json({ error: 'Phrase not found.' });
    }

    if (phraseDoc.data().addedBy !== parentUid) {
      return res.status(403).json({ error: 'You can only delete your own phrases.' });
    }

    await db.collection(COLLECTIONS.PHRASES).doc(id).delete();

    return res.json({ message: 'Phrase deleted.', id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete phrase.', detail: err.message });
  }
};

module.exports = { list, add, remove };
