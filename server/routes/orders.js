const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const Joi = require('joi');

const createOrderSchema = Joi.object({
  shippingName: Joi.string().required(),
  shippingPhone: Joi.string().required(),
  shippingAddress: Joi.string().required(),
  shippingCity: Joi.string().required(),
  shippingNotes: Joi.string().allow('', null),
});

router.post('/', auth, validate(createOrderSchema), orderController.create);
router.get('/', auth, orderController.list);
router.get('/:id', auth, orderController.getById);
router.put('/:id/cancel', auth, orderController.cancel);

module.exports = router;
