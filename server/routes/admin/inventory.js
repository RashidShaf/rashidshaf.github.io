const express = require('express');
const router = express.Router();
const inventoryController = require('../../controllers/inventoryController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');

router.get('/', [auth, admin], inventoryController.overview);
router.get('/low-stock', [auth, admin], inventoryController.lowStock);
router.post('/:bookId/restock', [auth, admin], inventoryController.restock);
router.post('/:bookId/adjust', [auth, admin], inventoryController.adjust);
router.get('/:bookId/log', [auth, admin], inventoryController.log);

module.exports = router;
