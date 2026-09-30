const router = require('express').Router();
const verifyToken  = require('../middleware/verifyToken');
const requireRole  = require('../middleware/requireRole');
const { generate, join, status } = require('../controllers/pairController');

// POST /pair/generate — parent generates the 6-digit code
router.post('/generate', verifyToken, requireRole('parent'), generate);

// POST /pair/join — child submits the code to link accounts
router.post('/join', verifyToken, requireRole('child'), join);

// GET /pair/status — any authenticated user checks if they're paired
router.get('/status', verifyToken, status);

module.exports = router;
