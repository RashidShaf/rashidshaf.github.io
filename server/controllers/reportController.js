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
        select: {
          orderNumber: true, total: true, status: true, createdAt: true,
          shippingPhone: true, shippingName: true,
          user: { select: { firstName: true, lastName: true } },
          items: { select: { quantity: true, title: true, book: { select: { title: true, titleAr: true } } } },
        },
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

exports.salesExport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = { status: { not: 'CANCELLED' } };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to + 'T23:59:59.999Z');
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const escapeCsv = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const header = 'Order Number,Customer,Phone,Email,Items,Total (QAR),Status,Date';
    const rows = orders.map((o) => {
      const customer = o.user ? `${o.user.firstName} ${o.user.lastName}` : (o.shippingName || 'Guest');
      const itemCount = o.items.reduce((sum, i) => sum + i.quantity, 0);
      const date = new Date(o.createdAt).toISOString().split('T')[0];
      return [
        escapeCsv(o.orderNumber),
        escapeCsv(customer),
        escapeCsv(o.shippingPhone || ''),
        escapeCsv(o.user?.email || ''),
        itemCount,
        parseFloat(o.total).toFixed(2),
        o.status,
        date,
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

exports.inventory = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const where = { AND: [] };

    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { titleAr: { contains: search, mode: 'insensitive' } },
          { author: { contains: search, mode: 'insensitive' } },
          { authorAr: { contains: search, mode: 'insensitive' } },
          { isbn: { contains: search, mode: 'insensitive' } },
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

    const books = await prisma.book.findMany({
      where,
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
