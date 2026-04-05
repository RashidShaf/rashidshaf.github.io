const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          role: true, isBlocked: true, createdAt: true, lastLoginAt: true,
          _count: { select: { orders: true, reviews: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json(getPaginatedResponse(users, total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.block = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role === 'ADMIN') return res.status(403).json({ message: 'Admin accounts cannot be blocked.' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isBlocked: !user.isBlocked },
    });
    res.json({ message: updated.isBlocked ? 'User blocked.' : 'User unblocked.', isBlocked: updated.isBlocked });
  } catch (error) {
    next(error);
  }
};

exports.updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['USER', 'ADMIN'].includes(role)) return res.status(400).json({ message: 'Invalid role.' });

    const updated = await prisma.user.update({
      where: { id: req.params.id }, data: { role },
    });
    res.json({ message: 'Role updated.', role: updated.role });
  } catch (error) {
    next(error);
  }
};
