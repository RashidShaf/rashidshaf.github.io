const express = require('express');
const router = express.Router();
const readingListController = require('../controllers/readingListController');
const auth = require('../middleware/auth');

router.get('/', auth, readingListController.list);
router.post('/', auth, readingListController.create);
router.get('/:id', auth, readingListController.getById);
router.put('/:id', auth, readingListController.update);
router.delete('/:id', auth, readingListController.remove);
router.post('/:id/books', auth, readingListController.addBook);
router.delete('/:id/books/:bookId', auth, readingListController.removeBook);

module.exports = router;
