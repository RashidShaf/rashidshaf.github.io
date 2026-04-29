const prisma = require('../config/database');
const { generateVariantsSafe, unlinkWithVariants } = require('../utils/images');
const fs = require('fs');
const path = require('path');

// Banners are hero-sized — use wider variants.
const BANNER_WIDTHS = [800, 1600, 2400];

// Resolve a DB-stored banner image path to absolute and unlink the base file
// plus its BANNER_WIDTHS sized siblings. Errors surface in PM2 logs.
const unlinkBannerImage = (rel) => {
  if (!rel) return;
  const abs = path.join(__dirname, '..', rel);
  unlinkWithVariants(abs, BANNER_WIDTHS);
};

// Best-effort cleanup of the multer-written files for this request — used on
// validation/DB failures so we don't leak orphans.
const dropMulterFiles = (req) => {
  if (req.file?.path) fs.unlink(req.file.path, () => {});
  if (req.files) {
    const all = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files).flat();
    all.forEach((f) => { if (f?.path) fs.unlink(f.path, () => {}); });
  }
};

// Public: Get active banners
exports.listPublic = async (req, res, next) => {
  try {
    const where = { isActive: true };

    if (req.query.category) {
      const category = await prisma.category.findUnique({
        where: { slug: req.query.category },
        select: { id: true },
      });
      if (!category) return res.json([]);
      where.categoryId = category.id;
    } else {
      where.categoryId = null;
    }

    const banners = await prisma.banner.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    res.json(banners);
  } catch (error) {
    next(error);
  }
};

// Admin: List all banners
exports.list = async (req, res, next) => {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { category: { select: { id: true, name: true, nameAr: true } } },
    });
    res.json(banners);
  } catch (error) {
    next(error);
  }
};

// Admin: Create banner
exports.create = async (req, res, next) => {
  try {
    const { title, titleAr, link, sortOrder, isActive, showLogo, showMobileLogo, logoPosition, categoryId } = req.body;
    const desktopImage = req.files?.desktopImage?.[0]
      ? `uploads/banners/${req.files.desktopImage[0].filename}`
      : null;
    const mobileImage = req.files?.mobileImage?.[0]
      ? `uploads/banners/${req.files.mobileImage[0].filename}`
      : null;

    if (!desktopImage) {
      dropMulterFiles(req);
      return res.status(400).json({ message: 'Desktop image is required.' });
    }

    let banner;
    try {
      banner = await prisma.banner.create({
        data: {
          title: title || null,
          titleAr: titleAr || null,
          desktopImage,
          mobileImage,
          link: link || null,
          showLogo: showLogo === 'false' ? false : true,
          showMobileLogo: showMobileLogo === 'false' ? false : true,
          logoPosition: logoPosition || 'center-left',
          categoryId: categoryId || null,
          sortOrder: parseInt(sortOrder) || 0,
          isActive: isActive === 'true' || isActive === true,
        },
      });
    } catch (err) {
      dropMulterFiles(req);
      throw err;
    }

    const bannerFiles = [req.files?.desktopImage?.[0], req.files?.mobileImage?.[0]].filter(Boolean);
    await Promise.all(bannerFiles.map((f) => generateVariantsSafe(f.path, BANNER_WIDTHS)));

    res.status(201).json(banner);
  } catch (error) {
    next(error);
  }
};

// Admin: Update banner
exports.update = async (req, res, next) => {
  try {
    const existing = await prisma.banner.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      dropMulterFiles(req);
      return res.status(404).json({ message: 'Banner not found.' });
    }

    const data = {};
    const { title, titleAr, link, sortOrder, isActive, showLogo, showMobileLogo, logoPosition, categoryId } = req.body;
    if (title !== undefined) data.title = title || null;
    if (titleAr !== undefined) data.titleAr = titleAr || null;
    if (link !== undefined) data.link = link || null;
    if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder) || 0;
    if (isActive !== undefined) data.isActive = isActive === 'true' || isActive === true;
    if (showLogo !== undefined) data.showLogo = showLogo === 'false' ? false : true;
    if (showMobileLogo !== undefined) data.showMobileLogo = showMobileLogo === 'false' ? false : true;
    if (logoPosition !== undefined) data.logoPosition = logoPosition || 'center-left';
    if (categoryId !== undefined) data.categoryId = categoryId || null;

    if (req.files?.desktopImage?.[0]) {
      data.desktopImage = `uploads/banners/${req.files.desktopImage[0].filename}`;
    }
    if (req.files?.mobileImage?.[0]) {
      data.mobileImage = `uploads/banners/${req.files.mobileImage[0].filename}`;
    }

    let banner;
    try {
      banner = await prisma.banner.update({ where: { id: req.params.id }, data });
    } catch (err) {
      dropMulterFiles(req);
      throw err;
    }

    // DB committed — now safe to remove the previous image files (base + variants).
    if (req.files?.desktopImage?.[0] && existing.desktopImage && existing.desktopImage !== data.desktopImage) {
      unlinkBannerImage(existing.desktopImage);
    }
    if (req.files?.mobileImage?.[0] && existing.mobileImage && existing.mobileImage !== data.mobileImage) {
      unlinkBannerImage(existing.mobileImage);
    }

    const newBannerFiles = [req.files?.desktopImage?.[0], req.files?.mobileImage?.[0]].filter(Boolean);
    await Promise.all(newBannerFiles.map((f) => generateVariantsSafe(f.path, BANNER_WIDTHS)));

    res.json(banner);
  } catch (error) {
    next(error);
  }
};

// Admin: Delete banner
exports.remove = async (req, res, next) => {
  try {
    const banner = await prisma.banner.findUnique({ where: { id: req.params.id } });
    if (!banner) return res.status(404).json({ message: 'Banner not found.' });
    await prisma.banner.delete({ where: { id: req.params.id } });
    // DB row gone — clean up files (base + sized variants for each image).
    unlinkBannerImage(banner.desktopImage);
    unlinkBannerImage(banner.mobileImage);
    res.json({ message: 'Banner deleted.' });
  } catch (error) {
    next(error);
  }
};

// Admin: Toggle active
exports.toggleActive = async (req, res, next) => {
  try {
    const banner = await prisma.banner.findUnique({ where: { id: req.params.id } });
    if (!banner) return res.status(404).json({ message: 'Banner not found.' });
    const updated = await prisma.banner.update({
      where: { id: req.params.id },
      data: { isActive: !banner.isActive },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Admin: Reorder banners
exports.reorder = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    const updates = orderedIds.map((id, index) =>
      prisma.banner.update({ where: { id }, data: { sortOrder: index } })
    );
    await prisma.$transaction(updates);
    res.json({ message: 'Banners reordered.' });
  } catch (error) {
    next(error);
  }
};
