const express = require('express');
const router = express.Router();
const Joi = require('joi');
const reviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().allow('', null).max(200),
  comment: Joi.string().allow('', null).max(2000),
  guestName: Joi.string().allow('', null).max(100),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5),
  title: Joi.string().allow('', null).max(200),
  comment: Joi.string().allow('', null).max(2000),
}).min(1);

router.get('/books/:bookId', reviewController.listByBook);
router.post('/books/:bookId', optionalAuth, validate(createReviewSchema), reviewController.create);
router.put('/:id', auth, validate(updateReviewSchema), reviewController.update);
router.delete('/:id', auth, reviewController.remove);

module.exports = router;
