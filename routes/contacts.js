const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyToken } = require('../middleware/verifyToken');
const multer = require('multer');

const storage = multer.memoryStorage(); // keep audio in RAM
const upload = multer({ storage });

router.post('/add', verifyToken,upload.single('audioFile'), contactController.addContact);
router.get('/',verifyToken, contactController.getAllContacts);
router.put('/edit/:id', verifyToken,upload.single('audioFile'), contactController.editContact);
router.delete('/delete/:id', verifyToken, contactController.deleteContact);
router.get('/suggest', contactController.getSuggestions);
router.post('/bulk-delete', verifyToken, contactController.bulkDeleteContacts);

module.exports = router;
