const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const controller = require('../controllers/storyController');

router.get('/', verifyToken, controller.getAllStories);
router.post('/', verifyToken, controller.addStory);
router.put('/:id', verifyToken, controller.editStory);
router.delete('/:id', verifyToken, controller.deleteStory);
router.post('/bulk-delete', verifyToken, controller.bulkDeleteStories);

module.exports = router;
