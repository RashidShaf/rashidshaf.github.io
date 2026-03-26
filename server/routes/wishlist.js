const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const auth = require('../middleware/auth');

router.get('/', auth, wishlistController.list);
router.post('/', auth, wishlistController.add);
router.delete('/:bookId', auth, wishlistController.remove);

module.exports = router;
