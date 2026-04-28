const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('crypto');

const createStorage = (destination) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', 'uploads', destination);
      // Ensure the destination directory exists. Otherwise multer's
      // underlying fs.createWriteStream errors with ENOENT and the request
      // ends up as a 500. Idempotent — no-op if the directory exists.
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        return cb(err);
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, uniqueName);
    },
  });
};

const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'), false);
  }
};

const uploadCover = multer({
  storage: createStorage('covers'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadCategoryImage = multer({
  storage: createStorage('categories'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadBanner = multer({
  storage: createStorage('banners'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadAdGrid = multer({
  storage: createStorage('ad-grids'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { uploadCover, uploadCategoryImage, uploadBanner, uploadAdGrid };
