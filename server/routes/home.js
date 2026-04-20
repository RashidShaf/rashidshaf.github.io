const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/layout', homeController.getLayout);

module.exports = router;
