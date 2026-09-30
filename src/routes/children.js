const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');
const { list, invite } = require('../controllers/childrenController');

router.get('/', verifyToken, requireRole('parent'), list);
router.post('/invite', verifyToken, requireRole('parent'), invite);

module.exports = router;
