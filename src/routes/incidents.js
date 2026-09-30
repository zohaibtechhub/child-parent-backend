const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');
const { list, update } = require('../controllers/incidentsController');

router.get('/', verifyToken, requireRole('parent'), list);
router.patch('/:id', verifyToken, requireRole('parent'), update);

module.exports = router;
