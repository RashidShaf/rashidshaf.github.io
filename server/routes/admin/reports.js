const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/reportController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');

router.get('/sales', [auth, admin], reportController.sales);
router.get('/sales/export', [auth, admin], reportController.salesExport);
router.get('/inventory', [auth, admin], reportController.inventory);

module.exports = router;
