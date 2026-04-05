const express = require('express');
const router = express.Router();
const bannerController = require('../../controllers/bannerController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const { uploadBanner } = require('../../config/multer');

const bannerUpload = uploadBanner.fields([
  { name: 'desktopImage', maxCount: 1 },
  { name: 'mobileImage', maxCount: 1 },
]);

router.get('/', [auth, admin], bannerController.list);
router.post('/', [auth, admin], bannerUpload, bannerController.create);
router.put('/reorder', [auth, admin], bannerController.reorder);
router.put('/:id', [auth, admin], bannerUpload, bannerController.update);
router.put('/:id/toggle', [auth, admin], bannerController.toggleActive);
router.delete('/:id', [auth, admin], bannerController.remove);

module.exports = router;
