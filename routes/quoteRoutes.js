const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const controller = require('../controllers/quoteController');

// CRUD routes
router.get('/', verifyToken, controller.getAllQuotes);
router.post('/', verifyToken, controller.addQuote);
router.put('/:id', verifyToken, controller.editQuote);
router.delete('/:id', verifyToken, controller.deleteQuote);
router.post('/bulk-delete', verifyToken, controller.bulkDeleteQuotes);


module.exports = router;
