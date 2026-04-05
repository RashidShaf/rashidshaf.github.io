const prisma = require('../config/database');

exports.overview = async (req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      where: { isActive: true },
      orderBy: { stock: 'asc' },
      select: { id: true, title: true, titleAr: true, author: true, stock: true, lowStockThreshold: true, sku: true, salesCount: true, price: true, isOutOfStock: true },
    });
    res.json(books);
  } catch (error) {
    next(error);
  }
};

exports.lowStock = async (req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      where: {
        isActive: true,
        stock: { lte: prisma.book.fields?.lowStockThreshold || 5 },
      },
      orderBy: { stock: 'asc' },
      select: { id: true, title: true, titleAr: true, stock: true, lowStockThreshold: true, sku: true },
    });

    // Filter in JS since Prisma can't compare two columns directly
    const filtered = books.filter((b) => b.stock <= b.lowStockThreshold);
    res.json(filtered.length > 0 ? filtered : books.filter((b) => b.stock <= 10));
  } catch (error) {
    next(error);
  }
};

exports.restock = async (req, res, next) => {
  try {
    const { quantity, note } = req.body;
    const book = await prisma.book.findUnique({ where: { id: req.params.bookId } });
    if (!book) return res.status(404).json({ message: 'Book not found.' });

    const qty = parseInt(quantity);
    await prisma.$transaction([
      prisma.book.update({ where: { id: book.id }, data: { stock: { increment: qty } } }),
      prisma.inventoryLog.create({
        data: {
          bookId: book.id, action: 'RESTOCK', quantity: qty,
          previousStock: book.stock, newStock: book.stock + qty,
          note, performedBy: req.user.id,
        },
      }),
    ]);

    res.json({ message: 'Stock updated.', newStock: book.stock + qty });
  } catch (error) {
    next(error);
  }
};

exports.adjust = async (req, res, next) => {
  try {
    const { quantity, note } = req.body;
    const book = await prisma.book.findUnique({ where: { id: req.params.bookId } });
    if (!book) return res.status(404).json({ message: 'Book not found.' });

    const qty = parseInt(quantity);
    const newStock = book.stock + qty;
    if (newStock < 0) return res.status(400).json({ message: 'Stock cannot go below 0.' });

    await prisma.$transaction([
      prisma.book.update({ where: { id: book.id }, data: { stock: newStock } }),
      prisma.inventoryLog.create({
        data: {
          bookId: book.id, action: 'ADJUSTMENT', quantity: qty,
          previousStock: book.stock, newStock,
          note, performedBy: req.user.id,
        },
      }),
    ]);

    // Check for low stock after adjustment
    if (newStock <= book.lowStockThreshold) {
      try {
        const { createNotification } = require('./notificationController');
        await createNotification({
          type: 'LOW_STOCK',
          title: 'Low Stock Alert',
          message: `"${book.title}" is low on stock (${newStock} remaining)`,
          metadata: { bookId: book.id, currentStock: newStock, threshold: book.lowStockThreshold },
        });
      } catch {}
    }

    res.json({ message: 'Stock adjusted.', newStock });
  } catch (error) {
    next(error);
  }
};

exports.log = async (req, res, next) => {
  try {
    const logs = await prisma.inventoryLog.findMany({
      where: { bookId: req.params.bookId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch (error) {
    next(error);
  }
};
