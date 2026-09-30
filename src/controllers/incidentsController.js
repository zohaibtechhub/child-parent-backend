const { db, COLLECTIONS } = require('../config/db');

const REVIEW_STATUSES = new Set(['new', 'reviewed', 'dismissed', 'escalated']);

const serializeIncident = (doc) => ({ id: doc.id, ...doc.data() });

const list = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const query = db
      .collection(COLLECTIONS.INCIDENTS)
      .where('parentUid', '==', req.user.uid)
      .orderBy('timestamp', 'desc')
      .limit(limit);

    const snapshot = await query.get();
    return res.json({
      count: snapshot.size,
      incidents: snapshot.docs.map(serializeIncident),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch incidents.', detail: err.message });
  }
};

const update = async (req, res) => {
  const reviewStatus = req.body.reviewStatus;

  if (!REVIEW_STATUSES.has(reviewStatus)) {
    return res.status(400).json({ error: 'Invalid review status.' });
  }

  try {
    const ref = db.collection(COLLECTIONS.INCIDENTS).doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) return res.status(404).json({ error: 'Incident not found.' });
    if (doc.data().parentUid !== req.user.uid) {
      return res.status(403).json({ error: 'You can only update your own incidents.' });
    }

    const patch = {
      reviewStatus,
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.uid,
    };

    if (typeof req.body.parentNote === 'string') {
      patch.parentNote = req.body.parentNote.trim().slice(0, 1000);
    }

    await ref.update(patch);
    const updated = await ref.get();
    return res.json({ message: 'Incident updated.', incident: serializeIncident(updated) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update incident.', detail: err.message });
  }
};

module.exports = { list, update };
