const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, search, customerType } = req.query;

    const where = {};
    if (status) where.status = status;
    if (customerType === 'guest') where.userId = null;
    if (customerType === 'customer') where.userId = { not: null };
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { shippingPhone: { contains: search, mode: 'insensitive' } },
        { shippingName: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          items: { select: { title: true, quantity: true, price: true, book: { select: { title: true, titleAr: true, author: true, coverImage: true } } } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json(getPaginatedResponse(orders, total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        items: { select: { title: true, quantity: true, price: true, book: { select: { title: true, titleAr: true, author: true, coverImage: true } } } },
      },
    });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(order);
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    history.push({ status, timestamp: new Date().toISOString(), by: req.user.id });

    const updateData = { status, statusHistory: history };
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (status === 'CANCELLED') updateData.cancelledAt = new Date();

    const updated = await prisma.order.update({
      where: { id: req.params.id }, data: updateData,
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.bulkAction = async (req, res, next) => {
  try {
    const { ids, action, status } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No items selected.' });

    switch (action) {
      case 'delete':
        await prisma.order.deleteMany({ where: { id: { in: ids } } });
        break;
      case 'updateStatus': {
        const validStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
        if (!status || !validStatuses.includes(status)) return res.status(400).json({ message: 'Valid status required.' });
        const updateData = { status };
        if (status === 'DELIVERED') updateData.deliveredAt = new Date();
        if (status === 'CANCELLED') updateData.cancelledAt = new Date();
        await prisma.order.updateMany({ where: { id: { in: ids } }, data: updateData });
        break;
      }
      default:
        return res.status(400).json({ message: 'Invalid action.' });
    }
    res.json({ message: 'Bulk action completed.', count: ids.length });
  } catch (error) { next(error); }
};
