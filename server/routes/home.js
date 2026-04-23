const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/layout', homeController.getLayout);
router.get('/corner-titles', homeController.getCornerTitles);
router.get('/corner-sections/:slug', homeController.getCornerSections);

module.exports = router;
