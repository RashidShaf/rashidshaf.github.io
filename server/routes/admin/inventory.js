const express = require('express');
const router = express.Router();
const Joi = require('joi');
const inventoryController = require('../../controllers/inventoryController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const validate = require('../../middleware/validate');

const restockSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
  note: Joi.string().allow('', null).max(500),
});

const adjustSchema = Joi.object({
  quantity: Joi.number().integer().required(),
  note: Joi.string().allow('', null).max(500),
});

router.get('/', [auth, admin], inventoryController.overview);
router.get('/low-stock', [auth, admin], inventoryController.lowStock);
router.post('/:bookId/restock', [auth, admin], validate(restockSchema), inventoryController.restock);
router.post('/:bookId/adjust', [auth, admin], validate(adjustSchema), inventoryController.adjust);
router.get('/:bookId/log', [auth, admin], inventoryController.log);

module.exports = router;
