const express = require('express');
const router = express.Router();
const Joi = require('joi');
const adminBookController = require('../../controllers/adminBookController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const validate = require('../../middleware/validate');
const { uploadCover } = require('../../config/multer');

const createBookSchema = Joi.object({
  title: Joi.string().required().max(500),
  titleAr: Joi.string().allow('', null).max(500),
  author: Joi.string().allow('', null).max(200),
  authorAr: Joi.string().allow('', null).max(200),
  isbn: Joi.string().allow('', null).max(20),
  description: Joi.string().allow('', null).max(10000),
  descriptionAr: Joi.string().allow('', null).max(10000),
  price: Joi.number().min(0).required(),
  compareAtPrice: Joi.number().min(0).allow('', null),
  publisher: Joi.string().allow('', null).max(200),
  publisherAr: Joi.string().allow('', null).max(200),
  language: Joi.string().valid('en', 'ar').default('en'),
  pages: Joi.number().integer().min(0).allow('', null),
  stock: Joi.number().integer().min(0).default(0),
  categoryId: Joi.string().uuid().allow('', null),
  tags: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).allow('', null),
  brand: Joi.string().allow('', null).max(200),
  material: Joi.string().allow('', null).max(200),
  color: Joi.string().allow('', null).max(100),
  dimensions: Joi.string().allow('', null).max(100),
  ageRange: Joi.string().allow('', null).max(50),
  isFeatured: Joi.any(),
  isBestseller: Joi.any(),
  isNewArrival: Joi.any(),
  isTrending: Joi.any(),
  isComingSoon: Joi.any(),
  isOutOfStock: Joi.any(),
  additionalCategoryIds: Joi.array().items(Joi.string()).allow(null),
});

const updateBookSchema = Joi.object({
  title: Joi.string().max(500),
  titleAr: Joi.string().allow('', null).max(500),
  author: Joi.string().allow('', null).max(200),
  authorAr: Joi.string().allow('', null).max(200),
  isbn: Joi.string().allow('', null).max(20),
  description: Joi.string().allow('', null).max(10000),
  descriptionAr: Joi.string().allow('', null).max(10000),
  price: Joi.number().min(0),
  compareAtPrice: Joi.number().min(0).allow('', null),
  publisher: Joi.string().allow('', null).max(200),
  publisherAr: Joi.string().allow('', null).max(200),
  language: Joi.string().valid('en', 'ar'),
  pages: Joi.number().integer().min(0).allow('', null),
  stock: Joi.number().integer().min(0),
  categoryId: Joi.string().uuid().allow('', null),
  tags: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).allow('', null),
  brand: Joi.string().allow('', null).max(200),
  material: Joi.string().allow('', null).max(200),
  color: Joi.string().allow('', null).max(100),
  dimensions: Joi.string().allow('', null).max(100),
  ageRange: Joi.string().allow('', null).max(50),
  isFeatured: Joi.any(),
  isBestseller: Joi.any(),
  isNewArrival: Joi.any(),
  isTrending: Joi.any(),
  isComingSoon: Joi.any(),
  isOutOfStock: Joi.any(),
  isActive: Joi.any(),
  additionalCategoryIds: Joi.array().items(Joi.string()).allow(null),
}).min(1);

router.get('/', [auth, admin], adminBookController.list);
router.get('/:id', [auth, admin], adminBookController.getById);
router.post('/', [auth, admin], validate(createBookSchema), adminBookController.create);
router.put('/:id', [auth, admin], validate(updateBookSchema), adminBookController.update);
router.delete('/:id', [auth, admin], adminBookController.remove);
router.post('/:id/cover', [auth, admin], uploadCover.single('cover'), adminBookController.uploadCover);
router.post('/:id/images', [auth, admin], uploadCover.array('images', 3), adminBookController.uploadImages);
router.delete('/:id/images', [auth, admin], adminBookController.deleteImage);

module.exports = router;
