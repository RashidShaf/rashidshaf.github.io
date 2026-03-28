const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');
const { BOOK_SORT_OPTIONS } = require('../config/constants');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, category, minPrice, maxPrice, author, language, sort } = req.query;

    const where = { isActive: true };

    // Search
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { titleAr: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { authorAr: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (category) {
      const cat = await prisma.category.findUnique({ where: { slug: category } });
      if (cat) where.categoryId = cat.id;
    }

    // Price range
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Author filter
    if (author) {
      where.author = { contains: author, mode: 'insensitive' };
    }

    // Language filter
    if (language) {
      where.language = language;
    }

    // Sort
    let orderBy = { createdAt: 'desc' };
    switch (sort) {
      case 'price_asc': orderBy = { price: 'asc' }; break;
      case 'price_desc': orderBy = { price: 'desc' }; break;
      case 'newest': orderBy = { createdAt: 'desc' }; break;
      case 'rating': orderBy = { averageRating: 'desc' }; break;
      case 'bestselling': orderBy = { salesCount: 'desc' }; break;
      case 'title_asc': orderBy = { title: 'asc' }; break;
      case 'title_desc': orderBy = { title: 'desc' }; break;
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, nameAr: true, slug: true } },
        },
      }),
      prisma.book.count({ where }),
    ]);

    res.json(getPaginatedResponse(books, total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.getBySlug = async (req, res, next) => {
  try {
    const book = await prisma.book.findUnique({
      where: { slug: req.params.slug },
      include: {
        category: { select: { id: true, name: true, nameAr: true, slug: true } },
        reviews: {
          where: { isVisible: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!book || !book.isActive) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    // Increment view count
    await prisma.book.update({
      where: { id: book.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json(book);
  } catch (error) {
    next(error);
  }
};

exports.featured = async (req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        category: { select: { id: true, name: true, nameAr: true, slug: true } },
      },
    });
    res.json(books);
  } catch (error) {
    next(error);
  }
};

exports.newArrivals = async (req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      where: { isActive: true, isNewArrival: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        category: { select: { id: true, name: true, nameAr: true, slug: true } },
      },
    });
    res.json(books);
  } catch (error) {
    next(error);
  }
};

exports.bestsellers = async (req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      where: { isActive: true, isBestseller: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        category: { select: { id: true, name: true, nameAr: true, slug: true } },
      },
    });
    res.json(books);
  } catch (error) {
    next(error);
  }
};

exports.trending = async (req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      where: { isActive: true, isTrending: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { category: { select: { id: true, name: true, nameAr: true, slug: true } } },
    });
    res.json(books);
  } catch (error) { next(error); }
};

exports.comingSoon = async (req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      where: { isActive: true, isComingSoon: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { category: { select: { id: true, name: true, nameAr: true, slug: true } } },
    });
    res.json(books);
  } catch (error) { next(error); }
};

exports.recommendations = async (req, res, next) => {
  try {
    const book = await prisma.book.findUnique({ where: { id: req.params.id } });
    if (!book) return res.status(404).json({ message: 'Book not found.' });

    const books = await prisma.book.findMany({
      where: {
        isActive: true,
        id: { not: book.id },
        OR: [
          { categoryId: book.categoryId },
          { author: book.author },
          { tags: { hasSome: book.tags } },
        ],
      },
      orderBy: { averageRating: 'desc' },
      take: 6,
      include: {
        category: { select: { id: true, name: true, nameAr: true, slug: true } },
      },
    });

    res.json(books);
  } catch (error) {
    next(error);
  }
};
