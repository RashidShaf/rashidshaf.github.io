const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');

router.get('/books/:bookId', reviewController.listByBook);
router.post('/books/:bookId', auth, reviewController.create);
router.put('/:id', auth, reviewController.update);
router.delete('/:id', auth, reviewController.remove);

module.exports = router;
