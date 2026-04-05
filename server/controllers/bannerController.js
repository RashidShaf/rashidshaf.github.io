const prisma = require('../config/database');

// Public: Get active banners
exports.listPublic = async (req, res, next) => {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
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
    });
    res.json(banners);
  } catch (error) {
    next(error);
  }
};

// Admin: Create banner
exports.create = async (req, res, next) => {
  try {
    const { title, titleAr, link, sortOrder, isActive, showLogo, logoPosition } = req.body;
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
        logoPosition: logoPosition || 'center-left',
        sortOrder: parseInt(sortOrder) || 0,
        isActive: isActive === 'true' || isActive === true,
      },
    });
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
    const { title, titleAr, link, sortOrder, isActive, showLogo, logoPosition } = req.body;
    if (title !== undefined) data.title = title || null;
    if (titleAr !== undefined) data.titleAr = titleAr || null;
    if (link !== undefined) data.link = link || null;
    if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder) || 0;
    if (isActive !== undefined) data.isActive = isActive === 'true' || isActive === true;
    if (showLogo !== undefined) data.showLogo = showLogo === 'false' ? false : true;
    if (logoPosition !== undefined) data.logoPosition = logoPosition || 'center-left';

    if (req.files?.desktopImage?.[0]) {
      data.desktopImage = `uploads/banners/${req.files.desktopImage[0].filename}`;
    }
    if (req.files?.mobileImage?.[0]) {
      data.mobileImage = `uploads/banners/${req.files.mobileImage[0].filename}`;
    }

    const banner = await prisma.banner.update({ where: { id: req.params.id }, data });
    res.json(banner);
  } catch (error) {
    next(error);
  }
};

// Admin: Delete banner
exports.remove = async (req, res, next) => {
  try {
    await prisma.banner.delete({ where: { id: req.params.id } });
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
