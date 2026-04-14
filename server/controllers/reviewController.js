const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');

exports.listByBook = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const bookId = req.params.bookId;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { bookId, isVisible: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true } } },
      }),
      prisma.review.count({ where: { bookId, isVisible: true } }),
    ]);

    res.json(getPaginatedResponse(reviews, total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { rating, title, comment, guestName } = req.body;
    const bookId = req.params.bookId;
    const isGuest = !req.user;

    // Duplicate check for logged-in users
    if (!isGuest) {
      const existing = await prisma.review.findFirst({
        where: { userId: req.user.id, bookId },
      });
      if (existing) {
        return res.status(409).json({ message: 'You have already reviewed this book.' });
      }
    }

    // Check if user purchased this book (only for logged-in users)
    let purchased = false;
    if (!isGuest) {
      purchased = await prisma.orderItem.findFirst({
        where: {
          bookId,
          order: { userId: req.user.id, status: { in: ['DELIVERED', 'CONFIRMED', 'PROCESSING', 'SHIPPED'] } },
        },
      });
    }

    const review = await prisma.review.create({
      data: {
        userId: isGuest ? null : req.user.id,
        bookId,
        rating: Math.min(5, Math.max(1, rating)),
        title,
        comment,
        guestName: isGuest ? (guestName?.trim() || 'Guest') : null,
        isVerified: !!purchased,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Update book average rating
    const stats = await prisma.review.aggregate({
      where: { bookId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.book.update({
      where: { id: bookId },
      data: {
        averageRating: stats._avg.rating || 0,
        reviewCount: stats._count.rating || 0,
      },
    });

    // Create admin notification for new review
    try {
      const { createNotification } = require('./notificationController');
      const book = await prisma.book.findUnique({ where: { id: bookId }, select: { title: true } });
      const reviewerName = isGuest ? (guestName || 'Guest') : review.user?.firstName;
      await createNotification({
        type: 'NEW_REVIEW',
        title: 'New Review',
        message: `${reviewerName} rated "${book?.title}" ${rating}/5`,
        metadata: { bookId, reviewId: review.id },
      });
    } catch {}

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review || review.userId !== req.user.id) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    const { rating, title, comment } = req.body;
    const updated = await prisma.review.update({
      where: { id: req.params.id },
      data: { rating: rating ? Math.min(5, Math.max(1, rating)) : undefined, title, comment },
    });

    // Recalculate
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
    if (!review || review.userId !== req.user.id) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    await prisma.review.delete({ where: { id: req.params.id } });

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
