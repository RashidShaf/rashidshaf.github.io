const express = require('express');
const router = express.Router();
const controller = require('../controllers/settingsController');

router.get('/public', controller.getPublic);

module.exports = router;
