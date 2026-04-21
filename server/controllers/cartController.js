const prisma = require('../config/database');

exports.get = async (req, res, next) => {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: {
        book: {
          select: {
            id: true, title: true, titleAr: true, slug: true, author: true,
            authorAr: true, price: true, compareAtPrice: true, coverImage: true,
            stock: true, isActive: true, isOutOfStock: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

exports.add = async (req, res, next) => {
  try {
    const { bookId, quantity = 1 } = req.body;

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book || !book.isActive) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    if (book.isOutOfStock) {
      return res.status(400).json({ message: `"${book.title}" is currently out of stock.` });
    }

    const item = await prisma.cartItem.upsert({
      where: {
        userId_bookId: { userId: req.user.id, bookId },
      },
      update: { quantity: { increment: quantity } },
      create: { userId: req.user.id, bookId, quantity },
      include: { book: true },
    });

    res.json(item);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const item = await prisma.cartItem.findUnique({
      where: { id: req.params.itemId },
      include: { book: true },
    });

    if (!item || item.userId !== req.user.id) {
      return res.status(404).json({ message: 'Cart item not found.' });
    }

    if (item.book.isOutOfStock) {
      return res.status(400).json({ message: `"${item.book.title}" is currently out of stock.` });
    }

    const updated = await prisma.cartItem.update({
      where: { id: req.params.itemId },
      data: { quantity },
      include: { book: true },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await prisma.cartItem.findUnique({ where: { id: req.params.itemId } });
    if (!item || item.userId !== req.user.id) {
      return res.status(404).json({ message: 'Cart item not found.' });
    }

    await prisma.cartItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Item removed.' });
  } catch (error) {
    next(error);
  }
};

exports.clear = async (req, res, next) => {
  try {
    await prisma.cartItem.deleteMany({ where: { userId: req.user.id } });
    res.json({ message: 'Cart cleared.' });
  } catch (error) {
    next(error);
  }
};
