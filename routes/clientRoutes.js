const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { verifyToken } = require('../middleware/verifyToken');
const multer = require('multer');

const storage = multer.memoryStorage(); // keep audio in RAM
const upload = multer({ storage });

router.post('/add', verifyToken,upload.single('audioFile'), clientController.addClient);
router.get('/',verifyToken, clientController.getAllClients);
router.put('/edit/:id', verifyToken,upload.single('audioFile'), clientController.editClient);
router.delete('/delete/:id', verifyToken, clientController.deleteClient);
router.get('/suggest', clientController.getSuggestions);
router.post('/bulk-delete', verifyToken, clientController.bulkDeleteClients);

module.exports = router;
