const prisma = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        book: {
          select: {
            id: true, title: true, titleAr: true, slug: true, author: true, authorAr: true,
            price: true, compareAtPrice: true, coverImage: true, format: true, averageRating: true,
            reviewCount: true, stock: true, isActive: true,
            category: { select: { id: true, name: true, nameAr: true, slug: true } },
          },
        },
      },
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

exports.add = async (req, res, next) => {
  try {
    const { bookId } = req.body;
    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_bookId: { userId: req.user.id, bookId } },
    });
    if (existing) return res.json(existing);

    const item = await prisma.wishlistItem.create({
      data: { userId: req.user.id, bookId },
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.wishlistItem.deleteMany({
      where: { userId: req.user.id, bookId: req.params.bookId },
    });
    res.json({ message: 'Removed from wishlist.' });
  } catch (error) {
    next(error);
  }
};
