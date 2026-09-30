const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const { register, me, updateFcmToken } = require('../controllers/authController');

// POST /auth/register — public, no token needed
router.post('/register', register);

// GET /auth/me — returns the caller's Firestore profile
router.get('/me', verifyToken, me);

// PATCH /auth/fcm-token — mobile app calls this on launch to keep push token fresh
router.patch('/fcm-token', verifyToken, updateFcmToken);

module.exports = router;
