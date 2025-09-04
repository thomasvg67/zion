const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const controller = require('../controllers/medicineController');

// CRUD Routes
router.get('/', verifyToken, controller.getAllMedicines);
router.post('/', verifyToken, controller.addMedicine);
router.put('/:id', verifyToken, controller.editMedicine);
router.delete('/:id', verifyToken, controller.deleteMedicine);
router.post('/bulk-delete', verifyToken, controller.bulkDeleteMedicines);

module.exports = router;
