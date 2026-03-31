const express = require('express');
const router = express.Router();
const controller = require('../../controllers/notificationController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');

router.get('/', [auth, admin], controller.list);
router.get('/unread-count', [auth, admin], controller.getUnreadCount);
router.put('/read-all', [auth, admin], controller.markAllRead);
router.put('/:id/read', [auth, admin], controller.markRead);

module.exports = router;
