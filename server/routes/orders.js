const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const Joi = require('joi');

const createOrderSchema = Joi.object({
  shippingName: Joi.string().allow('', null).default(''),
  shippingPhone: Joi.string().required(),
  shippingAddress: Joi.string().allow('', null).default(''),
  shippingCity: Joi.string().allow('', null).default(''),
  shippingNotes: Joi.string().allow('', null),
  paymentMethod: Joi.string().valid('COD', 'ONLINE').default('COD'),
  cartItems: Joi.array().items(Joi.object({
    bookId: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
  })).min(1).required(),
});

router.post('/', optionalAuth, validate(createOrderSchema), orderController.create);
router.get('/track', orderController.track);
router.get('/', auth, orderController.list);
router.get('/:id', auth, orderController.getById);
router.put('/:id/cancel', auth, orderController.cancel);

module.exports = router;
