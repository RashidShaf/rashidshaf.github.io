const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middleware/auth');

router.get('/', auth, cartController.get);
router.post('/', auth, cartController.add);
router.put('/:itemId', auth, cartController.update);
router.delete('/:itemId', auth, cartController.remove);
router.delete('/', auth, cartController.clear);

module.exports = router;
