const { db, COLLECTIONS } = require('../config/db');

const RULE_TYPES = new Set(['blocked_phrase', 'allowed_phrase', 'trusted_contact', 'risk_category']);
const RISK_LEVELS = new Set(['low', 'medium', 'high', 'urgent']);

const cleanText = (value) => String(value ?? '').trim().toLowerCase();

const serializeRule = (doc) => ({ id: doc.id, ...doc.data() });

const list = async (req, res) => {
  try {
    const snapshot = await db
      .collection(COLLECTIONS.SAFETY_RULES)
      .where('parentUid', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    return res.json({
      count: snapshot.size,
      rules: snapshot.docs.map(serializeRule),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch safety rules.', detail: err.message });
  }
};

const add = async (req, res) => {
  const type = req.body.type;
  const text = cleanText(req.body.text);
  const riskLevel = req.body.riskLevel ?? 'medium';
  const category = cleanText(req.body.category || type);

  if (!RULE_TYPES.has(type)) {
    return res.status(400).json({ error: 'Invalid safety rule type.' });
  }
  if (!RISK_LEVELS.has(riskLevel)) {
    return res.status(400).json({ error: 'Invalid risk level.' });
  }
  if (text.length < 2 || text.length > 200) {
    return res.status(400).json({ error: 'Rule text must be between 2 and 200 characters.' });
  }

  try {
    const existing = await db
      .collection(COLLECTIONS.SAFETY_RULES)
      .where('parentUid', '==', req.user.uid)
      .where('type', '==', type)
      .where('text', '==', text)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(409).json({ error: 'This safety rule already exists.' });
    }

    const docRef = await db.collection(COLLECTIONS.SAFETY_RULES).add({
      parentUid: req.user.uid,
      type,
      text,
      category,
      riskLevel,
      enabled: req.body.enabled !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const doc = await docRef.get();
    return res.status(201).json({ message: 'Safety rule added.', rule: serializeRule(doc) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add safety rule.', detail: err.message });
  }
};

const update = async (req, res) => {
  try {
    const ref = db.collection(COLLECTIONS.SAFETY_RULES).doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) return res.status(404).json({ error: 'Safety rule not found.' });
    if (doc.data().parentUid !== req.user.uid) {
      return res.status(403).json({ error: 'You can only update your own safety rules.' });
    }

    const patch = { updatedAt: new Date().toISOString() };
    if (req.body.type !== undefined) {
      if (!RULE_TYPES.has(req.body.type)) return res.status(400).json({ error: 'Invalid safety rule type.' });
      patch.type = req.body.type;
    }
    if (req.body.text !== undefined) {
      const text = cleanText(req.body.text);
      if (text.length < 2 || text.length > 200) {
        return res.status(400).json({ error: 'Rule text must be between 2 and 200 characters.' });
      }
      patch.text = text;
    }
    if (req.body.category !== undefined) patch.category = cleanText(req.body.category);
    if (req.body.riskLevel !== undefined) {
      if (!RISK_LEVELS.has(req.body.riskLevel)) return res.status(400).json({ error: 'Invalid risk level.' });
      patch.riskLevel = req.body.riskLevel;
    }
    if (req.body.enabled !== undefined) patch.enabled = req.body.enabled === true;

    await ref.update(patch);
    const updated = await ref.get();
    return res.json({ message: 'Safety rule updated.', rule: serializeRule(updated) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update safety rule.', detail: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const ref = db.collection(COLLECTIONS.SAFETY_RULES).doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) return res.status(404).json({ error: 'Safety rule not found.' });
    if (doc.data().parentUid !== req.user.uid) {
      return res.status(403).json({ error: 'You can only delete your own safety rules.' });
    }

    await ref.delete();
    return res.json({ message: 'Safety rule deleted.', id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete safety rule.', detail: err.message });
  }
};

module.exports = { list, add, update, remove };
