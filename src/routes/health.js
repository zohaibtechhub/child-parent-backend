const router = require('express').Router();
const { db, COLLECTIONS } = require('../config/db');

// GET /health
// Liveness check — pings Firestore to confirm the full Firebase connection.
router.get('/', async (req, res) => {
  try {
    // Attempt a lightweight Firestore read. If credentials are wrong this throws.
    await db.collection(COLLECTIONS.USERS).limit(1).get();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      firebase: 'connected',
      firestore: 'reachable',
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
      hint: 'Check your .env Firebase credentials or that Firestore is enabled in your project.',
    });
  }
});

module.exports = router;
