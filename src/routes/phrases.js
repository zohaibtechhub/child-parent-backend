const router = require('express').Router();
const verifyToken  = require('../middleware/verifyToken');
const requireRole  = require('../middleware/requireRole');
const { list, add, remove } = require('../controllers/phrasesController');

// All phrase routes are parent-only
router.get('/',     verifyToken, requireRole('parent'), list);
router.post('/',    verifyToken, requireRole('parent'), add);
router.delete('/:id', verifyToken, requireRole('parent'), remove);

module.exports = router;
