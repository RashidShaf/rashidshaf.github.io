const express = require('express');
const router = express.Router();
const adminBookController = require('../../controllers/adminBookController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const { uploadCover } = require('../../config/multer');

router.get('/', [auth, admin], adminBookController.list);
router.get('/:id', [auth, admin], adminBookController.getById);
router.post('/', [auth, admin], adminBookController.create);
router.put('/:id', [auth, admin], adminBookController.update);
router.delete('/:id', [auth, admin], adminBookController.remove);
router.post('/:id/cover', [auth, admin], uploadCover.single('cover'), adminBookController.uploadCover);

module.exports = router;
