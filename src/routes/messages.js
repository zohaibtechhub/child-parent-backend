const router     = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');
const { send, history } = require('../controllers/messagesController');

// POST /messages/send — child sends a message through the scanner
// requireRole('child') also populates req.userProfile (used in the controller)
router.post('/send', verifyToken, requireRole('child'), send);

// GET /messages — fetch conversation history (child or parent)
// requireRole with 'child' OR 'parent' — we handle both roles in the controller
// We use verifyToken + a permissive role check: any paired user can read history
router.get('/', verifyToken, requireRole('child', 'parent'), history);

// GET /messages/parent — parent-specific view (sees blocked messages too)
router.get('/parent', verifyToken, requireRole('parent'), history);

module.exports = router;
