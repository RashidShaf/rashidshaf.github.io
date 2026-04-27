const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');

exports.overview = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, category } = req.query;

    const where = { AND: [] };

    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (category) {
      const collectIds = async (parentIds) => {
        const children = await prisma.category.findMany({ where: { parentId: { in: parentIds } }, select: { id: true } });
        if (children.length === 0) return [];
        const childIds = children.map((c) => c.id);
        const deeper = await collectIds(childIds);
        return [...childIds, ...deeper];
      };
      const categoryIds = [category, ...(await collectIds([category]))];
      where.AND.push({
        OR: [
          { categoryId: { in: categoryIds } },
          { bookCategories: { some: { categoryId: { in: categoryIds } } } },
        ],
      });
    }

    if (where.AND.length === 0) delete where.AND;

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        orderBy: { stock: 'asc' },
        skip,
        take: limit,
        select: {
          id: true, title: true, titleAr: true, author: true, stock: true,
          lowStockThreshold: true, sku: true, salesCount: true, price: true,
          isOutOfStock: true, categoryId: true, hasVariants: true,
          variants: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: { id: true, label: true, labelAr: true, sku: true, stock: true, lowStockThreshold: true, isOutOfStock: true, price: true },
          },
        },
      }),
      prisma.book.count({ where }),
    ]);

    res.json(getPaginatedResponse(books, total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.lowStock = async (req, res, next) => {
  try {
    // Cap the candidate set so the endpoint stays bounded even on a store with
    // thousands of low-stock items. The candidate fetch caps to 200 each side;
    // after the per-row threshold filter, we slice to MAX_RESULTS for response.
    const MAX_CANDIDATES = 200;
    const MAX_RESULTS = 100;

    const [bookCandidates, variantCandidates] = await Promise.all([
      prisma.book.findMany({
        where: { hasVariants: false, stock: { lte: 50 } },
        orderBy: { stock: 'asc' },
        take: MAX_CANDIDATES,
        select: { id: true, title: true, titleAr: true, stock: true, lowStockThreshold: true, sku: true },
      }),
      prisma.productVariant.findMany({
        where: { isActive: true, stock: { lte: 50 } },
        orderBy: { stock: 'asc' },
        take: MAX_CANDIDATES,
        select: {
          id: true, label: true, labelAr: true, sku: true, stock: true, lowStockThreshold: true, color: true,
          book: { select: { id: true, title: true, titleAr: true } },
        },
      }),
    ]);

    const lowBooks = bookCandidates.filter((b) => b.stock <= b.lowStockThreshold);
    const lowVariants = variantCandidates
      .filter((v) => v.stock <= v.lowStockThreshold)
      .map((v) => ({
        id: v.book.id,
        variantId: v.id,
        title: v.book.title,
        titleAr: v.book.titleAr,
        variantLabel: v.label,
        variantLabelAr: v.labelAr,
        variantColor: v.color,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
        sku: v.sku,
      }));

    const merged = [...lowBooks, ...lowVariants]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, MAX_RESULTS);
    res.json(merged);
  } catch (error) {
    next(error);
  }
};

exports.restock = async (req, res, next) => {
  try {
    const { quantity, note, variantId } = req.body;
    const qty = parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty === 0) {
      return res.status(400).json({ message: 'Invalid quantity.' });
    }

    if (variantId) {
      // Interactive transaction — re-read previousStock inside the transaction
      // so two concurrent restocks against the same variant write the correct
      // log lineage instead of both claiming the same previousStock.
      try {
        const newStock = await prisma.$transaction(async (tx) => {
          const fresh = await tx.productVariant.findUnique({
            where: { id: variantId },
            select: { id: true, bookId: true, stock: true },
          });
          if (!fresh || fresh.bookId !== req.params.bookId) {
            const err = new Error('Variant not found.');
            err.status = 404;
            throw err;
          }
          await tx.productVariant.update({ where: { id: fresh.id }, data: { stock: { increment: qty } } });
          const result = fresh.stock + qty;
          await tx.inventoryLog.create({
            data: {
              bookId: fresh.bookId, variantId: fresh.id, action: 'RESTOCK', quantity: qty,
              previousStock: fresh.stock, newStock: result,
              note, performedBy: req.user.id,
            },
          });
          return result;
        });
        return res.json({ message: 'Stock updated.', newStock });
      } catch (err) {
        if (err.status === 404) return res.status(404).json({ message: err.message });
        throw err;
      }
    }

    const newStock = await prisma.$transaction(async (tx) => {
      const fresh = await tx.book.findUnique({
        where: { id: req.params.bookId },
        select: { id: true, stock: true },
      });
      if (!fresh) {
        const err = new Error('Book not found.');
        err.status = 404;
        throw err;
      }
      await tx.book.update({ where: { id: fresh.id }, data: { stock: { increment: qty } } });
      const result = fresh.stock + qty;
      await tx.inventoryLog.create({
        data: {
          bookId: fresh.id, action: 'RESTOCK', quantity: qty,
          previousStock: fresh.stock, newStock: result,
          note, performedBy: req.user.id,
        },
      });
      return result;
    }).catch((err) => {
      if (err.status === 404) { res.status(404).json({ message: err.message }); return null; }
      throw err;
    });

    if (newStock === null) return; // 404 already sent
    res.json({ message: 'Stock updated.', newStock });
  } catch (error) {
    next(error);
  }
};

exports.adjust = async (req, res, next) => {
  try {
    const { quantity, note, variantId } = req.body;
    const qty = parseInt(quantity, 10);
    if (!Number.isFinite(qty)) return res.status(400).json({ message: 'Invalid quantity.' });

    if (variantId) {
      // Interactive transaction so previousStock + lowStock check both observe
      // the same row state.
      let lowStockNotice = null;
      try {
        const newStock = await prisma.$transaction(async (tx) => {
          const fresh = await tx.productVariant.findUnique({
            where: { id: variantId },
            include: { book: { select: { id: true, title: true } } },
          });
          if (!fresh || fresh.bookId !== req.params.bookId) {
            const err = new Error('Variant not found.'); err.status = 404; throw err;
          }
          const result = fresh.stock + qty;
          if (result < 0) {
            const err = new Error('Stock cannot go below 0.'); err.status = 400; throw err;
          }
          await tx.productVariant.update({ where: { id: fresh.id }, data: { stock: result } });
          await tx.inventoryLog.create({
            data: {
              bookId: fresh.bookId, variantId: fresh.id, action: 'ADJUSTMENT', quantity: qty,
              previousStock: fresh.stock, newStock: result,
              note, performedBy: req.user.id,
            },
          });
          if (result <= fresh.lowStockThreshold) {
            lowStockNotice = {
              bookId: fresh.bookId, variantId: fresh.id, label: fresh.label,
              bookTitle: fresh.book.title, threshold: fresh.lowStockThreshold,
            };
          }
          return result;
        });

        if (lowStockNotice) {
          try {
            const { createNotification } = require('./notificationController');
            await createNotification({
              type: 'LOW_STOCK',
              title: 'Low Stock Alert',
              message: `"${lowStockNotice.bookTitle}" — ${lowStockNotice.label} is low on stock (${newStock} remaining)`,
              metadata: { bookId: lowStockNotice.bookId, variantId: lowStockNotice.variantId, currentStock: newStock, threshold: lowStockNotice.threshold },
            });
          } catch {}
        }
        return res.json({ message: 'Stock adjusted.', newStock });
      } catch (err) {
        if (err.status === 404) return res.status(404).json({ message: err.message });
        if (err.status === 400) return res.status(400).json({ message: err.message });
        throw err;
      }
    }

    let lowStockNotice = null;
    try {
      const newStock = await prisma.$transaction(async (tx) => {
        const fresh = await tx.book.findUnique({ where: { id: req.params.bookId } });
        if (!fresh) { const err = new Error('Book not found.'); err.status = 404; throw err; }
        const result = fresh.stock + qty;
        if (result < 0) { const err = new Error('Stock cannot go below 0.'); err.status = 400; throw err; }
        await tx.book.update({ where: { id: fresh.id }, data: { stock: result } });
        await tx.inventoryLog.create({
          data: {
            bookId: fresh.id, action: 'ADJUSTMENT', quantity: qty,
            previousStock: fresh.stock, newStock: result,
            note, performedBy: req.user.id,
          },
        });
        if (result <= fresh.lowStockThreshold) {
          lowStockNotice = { bookId: fresh.id, title: fresh.title, threshold: fresh.lowStockThreshold };
        }
        return result;
      });

      if (lowStockNotice) {
        try {
          const { createNotification } = require('./notificationController');
          await createNotification({
            type: 'LOW_STOCK',
            title: 'Low Stock Alert',
            message: `"${lowStockNotice.title}" is low on stock (${newStock} remaining)`,
            metadata: { bookId: lowStockNotice.bookId, currentStock: newStock, threshold: lowStockNotice.threshold },
          });
        } catch {}
      }

      res.json({ message: 'Stock adjusted.', newStock });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ message: err.message });
      if (err.status === 400) return res.status(400).json({ message: err.message });
      throw err;
    }
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
      include: {
        variant: { select: { id: true, label: true, labelAr: true, color: true, sku: true } },
      },
    });
    res.json(logs);
  } catch (error) {
    next(error);
  }
};
