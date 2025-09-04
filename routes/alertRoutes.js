const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { verifyToken } = require('../middleware/verifyToken');

router.get('/today', verifyToken, alertController.getTodayAlerts);
router.put('/snooze1d/:id', verifyToken, alertController.snoozeOneDay); 
router.put('/edit/:id', verifyToken, alertController.editAlert);
router.get('/user', verifyToken, alertController.getAllAlertsForUser);

module.exports = router;
