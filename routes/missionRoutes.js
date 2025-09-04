const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const controller = require('../controllers/missionController');

router.get('/', verifyToken, controller.getAllMissions);
router.post('/', verifyToken, controller.addMission);
router.put('/:id', verifyToken, controller.editMission);
router.delete('/:id', verifyToken, controller.deleteMission);

// Nested visions
router.post('/:id/visions', verifyToken, controller.addVision);
router.put('/:id/visions/:visionId', verifyToken, controller.editVision);
router.delete('/:id/visions/:visionId', verifyToken, controller.deleteVision);

// Clear all visions
router.put('/:id/clear-visions', verifyToken, controller.clearVisions);

module.exports = router;
