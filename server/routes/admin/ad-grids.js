const express = require('express');
const router = express.Router();
const adminAdGridController = require('../../controllers/adminAdGridController');
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');
const { uploadAdGrid } = require('../../config/multer');

router.get('/:cornerId', [auth, admin], adminAdGridController.getByCorner);
router.put('/:cornerId', [auth, admin], adminAdGridController.upsertGrid);
router.post(
  '/:cornerId/tile/:position/image',
  [auth, admin],
  uploadAdGrid.single('image'),
  adminAdGridController.uploadTileImage,
);
router.delete('/:cornerId/tile/:position', [auth, admin], adminAdGridController.deleteTile);

module.exports = router;
