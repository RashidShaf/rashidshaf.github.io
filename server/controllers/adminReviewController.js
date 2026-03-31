const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, isVisible, rating } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { comment: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { book: { title: { contains: search, mode: 'insensitive' } } },
        { book: { titleAr: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (isVisible !== undefined) {
      where.isVisible = isVisible === 'true';
    }
    if (rating) {
      where.rating = parseInt(rating);
    }

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

    res.json(getPaginatedResponse(reviews, total, page, limit));
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
