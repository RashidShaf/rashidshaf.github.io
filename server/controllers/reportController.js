const prisma = require('../config/database');

exports.sales = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = { status: { not: 'CANCELLED' } };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to + 'T23:59:59.999Z');
    }

    const [orders, stats] = await Promise.all([
      prisma.order.findMany({
        where, orderBy: { createdAt: 'desc' },
        select: { orderNumber: true, total: true, status: true, createdAt: true, items: { select: { quantity: true } } },
      }),
      prisma.order.aggregate({
        where,
        _sum: { total: true },
        _count: true,
        _avg: { total: true },
      }),
    ]);

    const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

    res.json({
      orders,
      summary: {
        totalOrders: stats._count,
        totalRevenue: stats._sum.total || 0,
        averageOrder: stats._avg.total || 0,
        totalItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.inventory = async (req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      where: { isActive: true },
      orderBy: { stock: 'asc' },
      select: { id: true, title: true, author: true, stock: true, lowStockThreshold: true, salesCount: true, price: true },
    });

    const totalStock = books.reduce((sum, b) => sum + b.stock, 0);
    const lowStock = books.filter((b) => b.stock <= b.lowStockThreshold);
    const outOfStock = books.filter((b) => b.stock === 0);
    const totalValue = books.reduce((sum, b) => sum + b.stock * parseFloat(b.price), 0);

    res.json({
      books,
      summary: { totalStock, lowStockCount: lowStock.length, outOfStockCount: outOfStock.length, totalValue },
    });
  } catch (error) {
    next(error);
  }
};
