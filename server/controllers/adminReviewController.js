const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');

const buildReviewsWhere = (query) => {
  const { search, isVisible, rating } = query;
  const where = {};
  if (search) {
    where.OR = [
      { comment: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
      { book: { title: { contains: search, mode: 'insensitive' } } },
      { book: { titleAr: { contains: search, mode: 'insensitive' } } },
      { user: { firstName: { contains: search, mode: 'insensitive' } } },
      { user: { lastName: { contains: search, mode: 'insensitive' } } },
      { guestName: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (isVisible !== undefined) {
    where.isVisible = isVisible === 'true';
  }
  if (rating) {
    where.rating = parseInt(rating);
  }
  return where;
};

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { withStats } = req.query;
    const where = buildReviewsWhere(req.query);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true } },
          book: { select: { id: true, title: true, titleAr: true, slug: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    let stats = null;
    if (withStats === '1') {
      try {
        const visibleWhere = { AND: [where, { isVisible: true }] };
        const [visibleCount, avgAgg] = await Promise.all([
          prisma.review.count({ where: visibleWhere }),
          prisma.review.aggregate({ where, _avg: { rating: true } }),
        ]);
        const avgRating = avgAgg._avg.rating != null ? avgAgg._avg.rating.toFixed(1) : '0.0';
        stats = { total, visible: visibleCount, avgRating };
      } catch {
        stats = null;
      }
    }

    res.json({ ...getPaginatedResponse(reviews, total, page, limit), stats });
  } catch (error) {
    next(error);
  }
};

exports.toggleVisibility = async (req, res, next) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) return res.status(404).json({ message: 'Review not found.' });

    const updated = await prisma.review.update({
      where: { id: req.params.id },
      data: { isVisible: !review.isVisible },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true } },
        book: { select: { id: true, title: true, titleAr: true, slug: true } },
      },
    });

    // Recalculate book average rating and review count (visible reviews only)
    const stats = await prisma.review.aggregate({
      where: { bookId: review.bookId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.book.update({
      where: { id: review.bookId },
      data: { averageRating: stats._avg.rating || 0, reviewCount: stats._count.rating || 0 },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) return res.status(404).json({ message: 'Review not found.' });

    await prisma.review.delete({ where: { id: req.params.id } });

    // Recalculate book average rating and review count (visible reviews only)
    const stats = await prisma.review.aggregate({
      where: { bookId: review.bookId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.book.update({
      where: { id: review.bookId },
      data: { averageRating: stats._avg.rating || 0, reviewCount: stats._count.rating || 0 },
    });

    res.json({ message: 'Review deleted.' });
  } catch (error) {
    next(error);
  }
};

exports.bulkAction = async (req, res, next) => {
  try {
    const { ids, action } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No items selected.' });

    // Get affected bookIds before action (for stats recalculation)
    const affectedReviews = await prisma.review.findMany({ where: { id: { in: ids } }, select: { bookId: true } });
    const affectedBookIds = [...new Set(affectedReviews.map((r) => r.bookId))];

    switch (action) {
      case 'delete':
        await prisma.review.deleteMany({ where: { id: { in: ids } } });
        break;
      case 'show':
        await prisma.review.updateMany({ where: { id: { in: ids } }, data: { isVisible: true } });
        break;
      case 'hide':
        await prisma.review.updateMany({ where: { id: { in: ids } }, data: { isVisible: false } });
        break;
      default:
        return res.status(400).json({ message: 'Invalid action.' });
    }

    // Recalculate stats for all affected books
    await Promise.all(affectedBookIds.map(async (bookId) => {
      const stats = await prisma.review.aggregate({
        where: { bookId, isVisible: true },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await prisma.book.update({
        where: { id: bookId },
        data: { averageRating: stats._avg.rating || 0, reviewCount: stats._count.rating || 0 },
      });
    }));

    res.json({ message: 'Bulk action completed.', count: ids.length });
  } catch (error) { next(error); }
};
