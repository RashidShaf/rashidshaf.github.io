const express = require('express');
const router = express.Router();
const adminCategoryController = require('../../controllers/adminCategoryController');
const adminCategoryFilterController = require('../../controllers/adminCategoryFilterController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const { uploadCategoryImage } = require('../../config/multer');

router.get('/', [auth, admin], adminCategoryController.list);
router.post('/bulk-action', [auth, admin], adminCategoryController.bulkAction);
router.post('/', [auth, admin], uploadCategoryImage.single('image'), adminCategoryController.create);
router.put('/reorder', [auth, admin], adminCategoryController.reorder);

// Category filter routes
router.get('/:categoryId/filters', [auth, admin], adminCategoryFilterController.list);
router.post('/:categoryId/filters', [auth, admin], adminCategoryFilterController.create);
router.put('/:categoryId/filters/reorder', [auth, admin], adminCategoryFilterController.reorder);
router.put('/filters/:id', [auth, admin], adminCategoryFilterController.update);
router.delete('/filters/:id', [auth, admin], adminCategoryFilterController.remove);

router.put('/:id/placeholder', [auth, admin], uploadCategoryImage.single('image'), adminCategoryController.uploadPlaceholder);
router.delete('/:id/placeholder', [auth, admin], adminCategoryController.removePlaceholder);
router.delete('/:id/image', [auth, admin], adminCategoryController.removeImage);
router.put('/:id', [auth, admin], uploadCategoryImage.single('image'), adminCategoryController.update);
router.delete('/:id', [auth, admin], adminCategoryController.remove);

module.exports = router;
