const prisma = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.unread === 'true') {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(notification);
  } catch (error) {
    next(error);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { isRead: false },
    });
    res.json({ count });
  } catch (error) {
    next(error);
  }
};

exports.createNotification = async ({ type, title, message, metadata }) => {
  return prisma.notification.create({
    data: {
      type,
      title,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
};
