const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const controller = require('../controllers/calendarEventController');

router.get('/', verifyToken, controller.getAllEvents);
router.post('/', verifyToken, controller.addEvent);
router.put('/:id', verifyToken, controller.editEvent);
router.delete('/:id', verifyToken, controller.deleteEvent);

module.exports = router;
