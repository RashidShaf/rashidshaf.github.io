const express = require('express');
const router = express.Router();
const adminHomeController = require('../../controllers/adminHomeController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');

router.get('/config', [auth, admin], adminHomeController.getConfig);
router.put('/config', [auth, admin], adminHomeController.saveConfig);
router.get('/books-search', [auth, admin], adminHomeController.searchBooks);

module.exports = router;
