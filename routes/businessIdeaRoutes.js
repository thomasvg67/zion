const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const controller = require('../controllers/businessIdeaController');

router.get('/', verifyToken, controller.getAllBusinesses);
router.post('/', verifyToken, controller.addBusiness);
router.put('/:id', verifyToken, controller.editBusiness);
router.delete('/:id', verifyToken, controller.deleteBusiness);

// Ideas (nested)
router.post('/:id/ideas', verifyToken, controller.addIdea);
router.put('/:id/ideas/:ideaId', verifyToken, controller.editIdea);
router.delete('/:id/ideas/:ideaId', verifyToken, controller.deleteIdea);

// Clear all ideas
router.put('/:id/clear-ideas', verifyToken, controller.clearIdeas);

module.exports = router;
