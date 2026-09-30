const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');
const { list, add, update, remove } = require('../controllers/safetyRulesController');

router.get('/', verifyToken, requireRole('parent'), list);
router.post('/', verifyToken, requireRole('parent'), add);
router.patch('/:id', verifyToken, requireRole('parent'), update);
router.delete('/:id', verifyToken, requireRole('parent'), remove);

module.exports = router;
