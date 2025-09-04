const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const controller = require('../controllers/fundsController');

router.get('/', verifyToken, controller.getAll);
router.post('/', verifyToken, controller.add);
router.put('/:id', verifyToken, controller.edit);
router.delete('/:id', verifyToken, controller.delete);
router.post('/bulk-delete', verifyToken, controller.bulkDelete);

module.exports = router;