const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const controller = require('../controllers/dictionaryController');

// CRUD Routes
router.get('/', verifyToken, controller.getAllWords);
router.post('/', verifyToken, controller.addWord);
router.put('/:id', verifyToken, controller.editWord);
router.delete('/:id', verifyToken, controller.deleteWord);
router.post('/bulk-delete', verifyToken, controller.bulkDeleteWords);

module.exports = router;
