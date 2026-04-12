const express = require('express');
const router = express.Router();
const adminUserController = require('../../controllers/adminUserController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');

router.get('/', [auth, admin], adminUserController.list);
router.post('/bulk-action', [auth, admin], adminUserController.bulkAction);
router.put('/:id/block', [auth, admin], adminUserController.block);
router.put('/:id/role', [auth, admin], adminUserController.updateRole);

module.exports = router;
