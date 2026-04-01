const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');
const { BOOK_SORT_OPTIONS } = require('../config/constants');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, category, minPrice, maxPrice, author, publisher, language, sort } = req.query;

    const where = {
      isActive: true,
      AND: [
        { OR: [{ category: { isActive: true } }, { categoryId: null }] },
      ],
    };

    // Search
    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { titleAr: { contains: search, mode: 'insensitive' } },
          { author: { contains: search, mode: 'insensitive' } },
          { authorAr: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    // Category filter — includes sub-categories and grandchildren (3 levels)
    if (category) {
      const cat = await prisma.category.findUnique({
        where: { slug: category },
        include: {
          children: {
            select: { id: true, children: { select: { id: true } } },
          },
        },
      });
      if (cat) {
        const allIds = [cat.id];
        if (cat.children) {
          cat.children.forEach(child => {
            allIds.push(child.id);
            if (child.children) {
              child.children.forEach(gc => allIds.push(gc.id));
            }
          });
        }
        where.categoryId = { in: allIds };
      }
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

    // Publisher filter
    if (publisher) {
      where.publisher = { contains: publisher, mode: 'insensitive' };
    }

    // Language filter
    if (language) {
      where.language = language;
    }

    // Section filter
    const { section } = req.query;
    if (section === 'featured') where.isFeatured = true;
    if (section === 'bestseller') where.isBestseller = true;
    if (section === 'new') where.isNewArrival = true;
    if (section === 'trending') where.isTrending = true;

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
        category: {
          select: {
            id: true, name: true, nameAr: true, slug: true, isActive: true, parentId: true,
            parent: { select: { id: true, name: true, nameAr: true, slug: true } },
          },
        },
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

    if (!book || !book.isActive || (book.category && !book.category.isActive)) {
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

// Helper: filter for books with active category (or no category)
const activeCategoryFilter = { OR: [{ category: { isActive: true } }, { categoryId: null }] };

// Helper: resolve corner slug to category IDs (parent + children)
const getCornerCategoryIds = async (cornerSlug) => {
  if (!cornerSlug) return null;
  const cat = await prisma.category.findUnique({
    where: { slug: cornerSlug },
    include: {
      children: {
        select: { id: true, children: { select: { id: true } } },
      },
    },
  });
  if (!cat) return null;
  const allIds = [cat.id];
  if (cat.children) {
    cat.children.forEach(child => {
      allIds.push(child.id);
      if (child.children) {
        child.children.forEach(gc => allIds.push(gc.id));
      }
    });
  }
  return allIds;
};

exports.featured = async (req, res, next) => {
  try {
    const where = { isActive: true, isFeatured: true, ...activeCategoryFilter };
    const catIds = await getCornerCategoryIds(req.query.corner);
    if (catIds) where.categoryId = { in: catIds };
    const books = await prisma.book.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 8,
      include: { category: { select: { id: true, name: true, nameAr: true, slug: true } } },
    });
    res.json(books);
  } catch (error) { next(error); }
};

exports.newArrivals = async (req, res, next) => {
  try {
    const where = { isActive: true, isNewArrival: true, ...activeCategoryFilter };
    const catIds = await getCornerCategoryIds(req.query.corner);
    if (catIds) where.categoryId = { in: catIds };
    const books = await prisma.book.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 8,
      include: { category: { select: { id: true, name: true, nameAr: true, slug: true } } },
    });
    res.json(books);
  } catch (error) { next(error); }
};

exports.bestsellers = async (req, res, next) => {
  try {
    const where = { isActive: true, isBestseller: true, ...activeCategoryFilter };
    const catIds = await getCornerCategoryIds(req.query.corner);
    if (catIds) where.categoryId = { in: catIds };
    const books = await prisma.book.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 8,
      include: { category: { select: { id: true, name: true, nameAr: true, slug: true } } },
    });
    res.json(books);
  } catch (error) {
    next(error);
  }
};

exports.trending = async (req, res, next) => {
  try {
    const where = { isActive: true, isTrending: true, ...activeCategoryFilter };
    const catIds = await getCornerCategoryIds(req.query.corner);
    if (catIds) where.categoryId = { in: catIds };
    const books = await prisma.book.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 8,
      include: { category: { select: { id: true, name: true, nameAr: true, slug: true } } },
    });
    res.json(books);
  } catch (error) { next(error); }
};

exports.comingSoon = async (req, res, next) => {
  try {
    const where = { isActive: true, isComingSoon: true, ...activeCategoryFilter };
    const catIds = await getCornerCategoryIds(req.query.corner);
    if (catIds) where.categoryId = { in: catIds };
    const books = await prisma.book.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 8,
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
