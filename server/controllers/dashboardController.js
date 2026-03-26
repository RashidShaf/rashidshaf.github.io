const prisma = require('../config/database');

exports.stats = async (req, res, next) => {
  try {
    const [totalBooks, totalUsers, totalOrders, revenueResult] = await Promise.all([
      prisma.book.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
    ]);

    res.json({
      totalBooks,
      totalUsers,
      totalOrders,
      totalRevenue: revenueResult._sum.total || 0,
    });
  } catch (error) {
    next(error);
  }
};

exports.salesChart = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startDate }, status: { not: 'CANCELLED' } },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const grouped = {};
    orders.forEach((order) => {
      const date = order.createdAt.toISOString().slice(0, 10);
      if (!grouped[date]) grouped[date] = { date, orders: 0, revenue: 0 };
      grouped[date].orders += 1;
      grouped[date].revenue += parseFloat(order.total);
    });

    res.json(Object.values(grouped));
  } catch (error) {
    next(error);
  }
};

exports.topBooks = async (req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      where: { isActive: true },
      orderBy: { salesCount: 'desc' },
      take: 10,
      select: { id: true, title: true, titleAr: true, author: true, salesCount: true, price: true, coverImage: true },
    });
    res.json(books);
  } catch (error) {
    next(error);
  }
};

exports.recentOrders = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        items: { select: { title: true, quantity: true } },
      },
    });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};
