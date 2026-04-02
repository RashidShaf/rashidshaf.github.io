const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');
const { generateOrderNumber } = require('../utils/helpers');

exports.create = async (req, res, next) => {
  try {
    const { shippingName, shippingPhone, shippingAddress, shippingCity, shippingNotes, paymentMethod, cartItems: clientCart } = req.body;

    // Accept cart items from request body (local cart)
    if (!clientCart || clientCart.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    // Fetch book details and validate stock
    const bookIds = clientCart.map((item) => item.bookId);
    const books = await prisma.book.findMany({ where: { id: { in: bookIds }, isActive: true } });
    const bookMap = {};
    books.forEach((b) => { bookMap[b.id] = b; });

    const validItems = [];
    for (const item of clientCart) {
      const book = bookMap[item.bookId];
      if (!book) {
        return res.status(404).json({ message: `Book not found: ${item.bookId}` });
      }
      if (book.isOutOfStock) {
        return res.status(400).json({
          message: `"${book.title}" is currently out of stock`,
        });
      }
      validItems.push({ book, quantity: item.quantity });
    }

    // Read shipping settings from DB
    const shippingSettings = await prisma.setting.findMany({
      where: { key: { in: ['shippingThreshold', 'shippingCost'] } },
    });
    const settingsMap = {};
    shippingSettings.forEach((s) => { settingsMap[s.key] = s.value; });
    const freeShippingThreshold = parseFloat(settingsMap.shippingThreshold) || 100;
    const flatShippingCost = parseFloat(settingsMap.shippingCost) || 15;

    // Calculate totals
    const subtotal = validItems.reduce(
      (sum, item) => sum + parseFloat(item.book.price) * item.quantity, 0
    );
    const shippingCost = subtotal >= freeShippingThreshold ? 0 : flatShippingCost;
    const total = subtotal + shippingCost;

    // Generate order number
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const orderCount = await prisma.order.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
    });
    const orderNumber = generateOrderNumber(orderCount);

    // Resolve userId: logged-in user, or match guest phone to existing account
    let userId = req.user?.id || null;
    if (!userId && shippingPhone) {
      const matchedUser = await prisma.user.findFirst({
        where: { phone: shippingPhone, isBlocked: false },
        select: { id: true },
      });
      if (matchedUser) userId = matchedUser.id;
    }

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          subtotal,
          shippingCost,
          total,
          paymentMethod: paymentMethod || 'COD',
          shippingName,
          shippingPhone,
          shippingAddress,
          shippingCity,
          shippingNotes,
          status: 'CONFIRMED',
          statusHistory: [{ status: 'CONFIRMED', timestamp: new Date().toISOString() }],
          items: {
            create: validItems.map((item) => ({
              bookId: item.book.id,
              quantity: item.quantity,
              price: item.book.price,
              title: item.book.title,
            })),
          },
        },
        include: { items: true },
      });

      // Decrement stock
      for (const item of validItems) {
        await tx.book.update({
          where: { id: item.book.id },
          data: {
            stock: { decrement: item.quantity },
            salesCount: { increment: item.quantity },
          },
        });

        await tx.inventoryLog.create({
          data: {
            bookId: item.book.id,
            action: 'SALE',
            quantity: -item.quantity,
            previousStock: item.book.stock,
            newStock: item.book.stock - item.quantity,
            note: `Order ${orderNumber}`,
          },
        });
      }

      return newOrder;
    });

    // Create admin notification for new order
    try {
      const { createNotification } = require('./notificationController');
      await createNotification({
        type: 'NEW_ORDER',
        title: 'New Order Received',
        message: `Order ${order.orderNumber} placed for QAR ${parseFloat(order.total).toFixed(2)}`,
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
      });
    } catch {}

    res.status(201).json({ message: 'Order placed successfully.', order });
  } catch (error) {
    next(error);
  }
};

exports.track = async (req, res, next) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const orders = await prisma.order.findMany({
      where: { shippingPhone: phone },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { book: { select: { id: true, slug: true, coverImage: true, titleAr: true, authorAr: true } } },
        },
      },
    });

    res.json(orders);
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: {
            include: { book: { select: { id: true, slug: true, coverImage: true } } },
          },
        },
      }),
      prisma.order.count({ where: { userId: req.user.id } }),
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
        items: {
          include: { book: { select: { id: true, slug: true, coverImage: true, titleAr: true, authorAr: true } } },
        },
      },
    });

    if (!order || (order.userId && order.userId !== req.user.id)) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { book: true } } },
    });

    if (!order || (order.userId && order.userId !== req.user.id)) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage.' });
    }

    await prisma.$transaction(async (tx) => {
      // Restore stock
      for (const item of order.items) {
        await tx.book.update({
          where: { id: item.bookId },
          data: {
            stock: { increment: item.quantity },
            salesCount: { decrement: item.quantity },
          },
        });

        await tx.inventoryLog.create({
          data: {
            bookId: item.bookId,
            action: 'RETURN',
            quantity: item.quantity,
            previousStock: item.book.stock,
            newStock: item.book.stock + item.quantity,
            note: `Cancelled order ${order.orderNumber}`,
          },
        });
      }

      const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      history.push({ status: 'CANCELLED', timestamp: new Date().toISOString() });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          statusHistory: history,
        },
      });
    });

    res.json({ message: 'Order cancelled.' });
  } catch (error) {
    next(error);
  }
};
