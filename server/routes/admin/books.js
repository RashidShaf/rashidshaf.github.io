const express = require('express');
const router = express.Router();
const Joi = require('joi');
const adminBookController = require('../../controllers/adminBookController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const validate = require('../../middleware/validate');
const { uploadCover } = require('../../config/multer');

const variantSchema = Joi.object({
  id: Joi.string().uuid().allow('', null),
  label: Joi.string().required().max(80),
  labelAr: Joi.string().allow('', null).max(80),
  sku: Joi.string().allow('', null).max(80),
  price: Joi.number().min(0).required(),
  purchasePrice: Joi.alternatives().try(Joi.number().min(0), Joi.string().allow(''), Joi.valid(null)),
  compareAtPrice: Joi.alternatives().try(Joi.number().min(0), Joi.string().allow(''), Joi.valid(null)),
  stock: Joi.number().integer().min(0).default(0),
  lowStockThreshold: Joi.number().integer().min(0).default(5),
  color: Joi.string().allow('', null).max(100),
  colorAr: Joi.string().allow('', null).max(100),
  // Per-variant overrides
  dimensions: Joi.string().allow('', null).max(100),
  weight: Joi.alternatives().try(Joi.number().min(0), Joi.string().allow(''), Joi.valid(null)),
  brand: Joi.string().allow('', null).max(200),
  brandAr: Joi.string().allow('', null).max(200),
  material: Joi.string().allow('', null).max(200),
  materialAr: Joi.string().allow('', null).max(200),
  ageRange: Joi.string().allow('', null).max(50),
  author: Joi.string().allow('', null).max(200),
  authorAr: Joi.string().allow('', null).max(200),
  publisher: Joi.string().allow('', null).max(200),
  publisherAr: Joi.string().allow('', null).max(200),
  isbn: Joi.string().allow('', null).max(20),
  pages: Joi.alternatives().try(Joi.number().integer().min(0), Joi.string().allow(''), Joi.valid(null)),
  language: Joi.string().valid('en', 'ar', '').allow(null),
  publishedDate: Joi.alternatives().try(Joi.date(), Joi.string().allow(''), Joi.valid(null)),
  customFields: Joi.string().allow('', null).max(16384),
  image: Joi.string().allow('', null),
  sortOrder: Joi.number().integer().default(0),
  isOutOfStock: Joi.any(),
  isActive: Joi.any(),
});

const createBookSchema = Joi.object({
  title: Joi.string().required().max(500),
  titleAr: Joi.string().allow('', null).max(500),
  author: Joi.string().allow('', null).max(200),
  authorAr: Joi.string().allow('', null).max(200),
  isbn: Joi.string().allow('', null).max(20),
  description: Joi.string().allow('', null).max(10000),
  descriptionAr: Joi.string().allow('', null).max(10000),
  price: Joi.number().min(0).required(),
  purchasePrice: Joi.alternatives().try(Joi.number().min(0), Joi.string().allow(''), Joi.valid(null)),
  compareAtPrice: Joi.number().min(0).allow('', null),
  publisher: Joi.string().allow('', null).max(200),
  publisherAr: Joi.string().allow('', null).max(200),
  language: Joi.string().valid('en', 'ar', '').allow(null).default(''),
  pages: Joi.number().integer().min(0).allow('', null),
  publishedDate: Joi.alternatives().try(Joi.date(), Joi.string().allow(''), Joi.valid(null)),
  stock: Joi.number().integer().min(0).default(0),
  categoryId: Joi.string().uuid().allow('', null),
  tags: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).allow('', null),
  brand: Joi.string().allow('', null).max(200),
  brandAr: Joi.string().allow('', null).max(200),
  material: Joi.string().allow('', null).max(200),
  materialAr: Joi.string().allow('', null).max(200),
  color: Joi.string().allow('', null).max(100),
  colorAr: Joi.string().allow('', null).max(100),
  dimensions: Joi.string().allow('', null).max(100),
  weight: Joi.alternatives().try(Joi.number().min(0), Joi.string().allow(''), Joi.valid(null)),
  ageRange: Joi.string().allow('', null).max(50),
  isFeatured: Joi.any(),
  isBestseller: Joi.any(),
  isNewArrival: Joi.any(),
  isTrending: Joi.any(),
  isComingSoon: Joi.any(),
  isOutOfStock: Joi.any(),
  customFields: Joi.string().allow('', null).max(16384),
  hasVariants: Joi.any(),
  variants: Joi.array().items(variantSchema).default([]),
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
  purchasePrice: Joi.alternatives().try(Joi.number().min(0), Joi.string().allow(''), Joi.valid(null)),
  compareAtPrice: Joi.number().min(0).allow('', null),
  publisher: Joi.string().allow('', null).max(200),
  publisherAr: Joi.string().allow('', null).max(200),
  language: Joi.string().valid('en', 'ar', '').allow(null),
  pages: Joi.number().integer().min(0).allow('', null),
  publishedDate: Joi.alternatives().try(Joi.date(), Joi.string().allow(''), Joi.valid(null)),
  stock: Joi.number().integer().min(0),
  categoryId: Joi.string().uuid().allow('', null),
  tags: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).allow('', null),
  brand: Joi.string().allow('', null).max(200),
  brandAr: Joi.string().allow('', null).max(200),
  material: Joi.string().allow('', null).max(200),
  materialAr: Joi.string().allow('', null).max(200),
  color: Joi.string().allow('', null).max(100),
  colorAr: Joi.string().allow('', null).max(100),
  dimensions: Joi.string().allow('', null).max(100),
  weight: Joi.alternatives().try(Joi.number().min(0), Joi.string().allow(''), Joi.valid(null)),
  ageRange: Joi.string().allow('', null).max(50),
  isFeatured: Joi.any(),
  isBestseller: Joi.any(),
  isNewArrival: Joi.any(),
  isTrending: Joi.any(),
  isComingSoon: Joi.any(),
  isOutOfStock: Joi.any(),
  isActive: Joi.any(),
  customFields: Joi.string().allow('', null).max(16384),
  hasVariants: Joi.any(),
  variants: Joi.array().items(variantSchema),
  additionalCategoryIds: Joi.array().items(Joi.string()).allow(null),
}).min(1);

router.get('/', [auth, admin], adminBookController.list);
router.get('/filter-options', [auth, admin], adminBookController.filterOptions);
router.post('/bulk-action', [auth, admin], adminBookController.bulkAction);
router.get('/:id', [auth, admin], adminBookController.getById);
router.post('/', [auth, admin], validate(createBookSchema), adminBookController.create);
router.put('/:id', [auth, admin], validate(updateBookSchema), adminBookController.update);
router.delete('/:id', [auth, admin], adminBookController.remove);
router.post('/:id/cover', [auth, admin], uploadCover.single('cover'), adminBookController.uploadCover);
router.delete('/:id/cover', [auth, admin], adminBookController.removeCover);
router.post('/:id/images', [auth, admin], uploadCover.array('images', 3), adminBookController.uploadImages);
router.delete('/:id/images', [auth, admin], adminBookController.deleteImage);
router.post('/:id/variants/:variantId/image', [auth, admin], uploadCover.single('image'), adminBookController.uploadVariantImage);
router.patch('/:id/variants/:variantId', [auth, admin], adminBookController.patchVariant);

module.exports = router;
