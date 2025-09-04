const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const controller = require('../controllers/financialOutlookController');

// Main financial outlook routes
router.get('/', verifyToken, controller.getAllFinancialOutlooks);
router.post('/', verifyToken, controller.addFinancialOutlook);
router.put('/:id', verifyToken, controller.editFinancialOutlook);
router.delete('/:id', verifyToken, controller.deleteFinancialOutlook);

// Nested outcomes routes
router.post('/:id/outcomes', verifyToken, controller.addOutcome);
router.put('/:id/outcomes/:outcomeId', verifyToken, controller.editOutcome);
router.delete('/:id/outcomes/:outcomeId', verifyToken, controller.deleteOutcome);

// Clear all outcomes
router.put('/:id/clear-outcomes', verifyToken, controller.clearOutcomes);

module.exports = router;