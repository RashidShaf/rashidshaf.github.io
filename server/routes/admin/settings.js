const express = require('express');
const router = express.Router();
const controller = require('../../controllers/settingsController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');

router.get('/', [auth, admin], controller.getAll);
router.put('/', [auth, admin], controller.update);

module.exports = router;
