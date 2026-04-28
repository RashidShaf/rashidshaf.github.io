const express = require('express');
const router = express.Router();
const Joi = require('joi');
const adminAdGridController = require('../../controllers/adminAdGridController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const validate = require('../../middleware/validate');
const { uploadAdGrid } = require('../../config/multer');

// Tile payload — note `image` must be a path under uploads/ad-grids/ (validated
// in the controller via a path-prefix check). Joi here just enforces shape.
const tileSchema = Joi.object({
  position: Joi.number().integer().min(1).max(6).required(),
  image: Joi.string().max(500).allow('', null),
  bookId: Joi.string().uuid().allow('', null),
  externalLink: Joi.alternatives().try(
    Joi.string().uri({ scheme: ['http', 'https'] }).max(500),
    Joi.string().valid(''),
    Joi.valid(null),
  ),
  title: Joi.string().max(200).allow('', null),
  titleAr: Joi.string().max(200).allow('', null),
  isActive: Joi.boolean(),
});

const upsertGridSchema = Joi.object({
  tiles: Joi.array().items(tileSchema).max(6).required(),
});

const setActiveSchema = Joi.object({
  enabled: Joi.boolean().required(),
});

router.get('/:cornerId', [auth, admin], adminAdGridController.getByCorner);
router.put('/:cornerId', [auth, admin], validate(upsertGridSchema), adminAdGridController.upsertGrid);
router.patch(
  '/:cornerId/active',
  [auth, admin],
  validate(setActiveSchema),
  adminAdGridController.setCornerActive,
);
router.post(
  '/:cornerId/tile/:position/image',
  [auth, admin],
  uploadAdGrid.single('image'),
  adminAdGridController.uploadTileImage,
);
router.delete('/:cornerId/tile/:position', [auth, admin], adminAdGridController.deleteTile);

module.exports = router;
