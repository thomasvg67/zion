const express = require('express');
const router = express.Router();
const controller = require('../controllers/emailController');
const { verifyToken } = require('../middleware/verifyToken');
const upload = require('../middleware/emailUpload'); // Use the new upload config

// Email CRUD operations
router.get('/', verifyToken, controller.getEmails);
router.post('/send', verifyToken, upload.array('attachments'), controller.sendEmail); // Updated with upload middleware
router.post('/drafts', verifyToken, upload.array('attachments'), controller.saveDraft);
router.post('/drafts/:id', verifyToken, upload.array('attachments'), controller.saveDraft);
router.put('/:id', verifyToken, controller.updateEmail);
router.patch('/:id/read', verifyToken, controller.markAsRead);
router.delete('/:id', verifyToken, controller.deleteEmail);
router.post('/:id/send', verifyToken, upload.array('attachments'),controller.sendDraftEmail);
router.get('/suggestions', verifyToken, controller.getEmailSuggestions);

// Bulk actions
router.post('/bulk', verifyToken, controller.bulkAction);

module.exports = router;