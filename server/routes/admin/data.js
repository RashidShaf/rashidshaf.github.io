const express = require('express');
const router = express.Router();
const multer = require('multer');
const dataController = require('../../controllers/dataController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Export
router.get('/export/products', [auth, admin], dataController.exportProducts);
router.get('/export/customers', [auth, admin], dataController.exportCustomers);
router.get('/export/orders', [auth, admin], dataController.exportOrders);
router.get('/export/inventory', [auth, admin], dataController.exportInventory);
router.get('/export/categories', [auth, admin], dataController.exportCategories);

// Import
router.post('/import/products', [auth, admin], upload.single('file'), dataController.importProducts);
router.post('/import/preview', [auth, admin], upload.single('file'), dataController.importPreview);
router.post('/import/confirm', [auth, admin], dataController.importConfirm);
router.get('/import/template', [auth, admin], dataController.importTemplate);


module.exports = router;
