const express = require('express');
const router = express.Router();
const controller = require('../controllers/medicalStatController');
const { verifyToken } = require('../middleware/verifyToken');

router.get('/', verifyToken, controller.getAllStats);
router.post('/', verifyToken, controller.addStat);
router.put('/:id', verifyToken, controller.editStat);
router.delete('/:id', verifyToken, controller.deleteStat);
router.get('/hospital-lookup', verifyToken, controller.lookupHospital);
router.get('/chart-data', verifyToken, controller.getChartData);


module.exports = router;
