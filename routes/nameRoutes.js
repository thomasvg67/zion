const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const controller = require('../controllers/nameController');

// CRUD routes
router.get('/', verifyToken, controller.getAllNames);
router.post('/', verifyToken, controller.addName);
router.put('/:id', verifyToken, controller.editName);
router.delete('/:id', verifyToken, controller.deleteName);
router.post('/bulk-delete', verifyToken, controller.bulkDeleteNames);

module.exports = router;
