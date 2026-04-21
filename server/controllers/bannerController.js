const prisma = require('../config/database');
const { generateVariantsSafe } = require('../utils/images');
const fs = require('fs');
const path = require('path');

// Banners are hero-sized — use wider variants.
const BANNER_WIDTHS = [800, 1600, 2400];

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
      return res.status(400).json({ message: 'Desktop image is required.' });
    }

    const banner = await prisma.banner.create({
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
    if (!existing) return res.status(404).json({ message: 'Banner not found.' });

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
      if (existing.desktopImage) fs.unlink(path.join(__dirname, '..', existing.desktopImage), () => {});
      data.desktopImage = `uploads/banners/${req.files.desktopImage[0].filename}`;
    }
    if (req.files?.mobileImage?.[0]) {
      if (existing.mobileImage) fs.unlink(path.join(__dirname, '..', existing.mobileImage), () => {});
      data.mobileImage = `uploads/banners/${req.files.mobileImage[0].filename}`;
    }

    const banner = await prisma.banner.update({ where: { id: req.params.id }, data });

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
    // Clean up image files
    [banner.desktopImage, banner.mobileImage].forEach((img) => {
      if (img) {
        const filePath = path.join(__dirname, '..', img);
        fs.unlink(filePath, () => {});
      }
    });
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
