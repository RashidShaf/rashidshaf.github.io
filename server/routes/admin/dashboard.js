const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/dashboardController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');

router.get('/stats', [auth, admin], dashboardController.stats);
router.get('/sales-chart', [auth, admin], dashboardController.salesChart);
router.get('/top-books', [auth, admin], dashboardController.topBooks);
router.get('/recent-orders', [auth, admin], dashboardController.recentOrders);

module.exports = router;
