const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

router.get('/', bookController.list);
router.get('/featured', bookController.featured);
router.get('/new-arrivals', bookController.newArrivals);
router.get('/bestsellers', bookController.bestsellers);
router.get('/:slug', bookController.getBySlug);
router.get('/:id/recommendations', bookController.recommendations);

module.exports = router;
