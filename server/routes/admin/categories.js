const express = require('express');
const router = express.Router();
const adminCategoryController = require('../../controllers/adminCategoryController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const { uploadCategoryImage } = require('../../config/multer');

router.post('/', [auth, admin], uploadCategoryImage.single('image'), adminCategoryController.create);
router.put('/:id', [auth, admin], uploadCategoryImage.single('image'), adminCategoryController.update);
router.delete('/:id', [auth, admin], adminCategoryController.remove);

module.exports = router;
