const express = require('express');
const router = express.Router();
const controller = require('../../controllers/adminReviewController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');

router.get('/', [auth, admin], controller.list);
router.post('/bulk-action', [auth, admin], controller.bulkAction);
router.put('/:id/visibility', [auth, admin], controller.toggleVisibility);
router.delete('/:id', [auth, admin], controller.remove);

module.exports = router;
