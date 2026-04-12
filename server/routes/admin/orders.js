const express = require('express');
const router = express.Router();
const adminOrderController = require('../../controllers/adminOrderController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');

router.get('/', [auth, admin], adminOrderController.list);
router.post('/bulk-action', [auth, admin], adminOrderController.bulkAction);
router.get('/:id', [auth, admin], adminOrderController.getById);
router.put('/:id/status', [auth, admin], adminOrderController.updateStatus);

module.exports = router;
