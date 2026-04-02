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

    // Category filter — supports multiple comma-separated slugs, includes sub-categories (3 levels)
    if (category) {
      const slugs = category.split(',').map(s => s.trim()).filter(Boolean);
      const cats = await prisma.category.findMany({
        where: { slug: { in: slugs } },
        include: {
          children: {
            select: { id: true, children: { select: { id: true } } },
          },
        },
      });
      if (cats.length > 0) {
        const allIds = [];
        cats.forEach(cat => {
          allIds.push(cat.id);
          if (cat.children) {
            cat.children.forEach(child => {
              allIds.push(child.id);
              if (child.children) {
                child.children.forEach(gc => allIds.push(gc.id));
              }
            });
          }
        });
        where.AND.push({
          OR: [
            { categoryId: { in: allIds } },
            { bookCategories: { some: { categoryId: { in: allIds } } } },
          ],
        });
      }
    }

    // Price range
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Author filter (supports comma-separated multi-select)
    if (author) {
      const authors = author.split(',').map(a => a.trim()).filter(Boolean);
      if (authors.length === 1) {
        where.author = { contains: authors[0], mode: 'insensitive' };
      } else {
        where.OR = [...(where.OR || []), ...authors.map(a => ({ author: { contains: a, mode: 'insensitive' } }))];
      }
    }

    // Publisher filter (supports comma-separated multi-select)
    if (publisher) {
      const publishers = publisher.split(',').map(p => p.trim()).filter(Boolean);
      if (publishers.length === 1) {
        where.publisher = { contains: publishers[0], mode: 'insensitive' };
      } else {
        where.OR = [...(where.OR || []), ...publishers.map(p => ({ publisher: { contains: p, mode: 'insensitive' } }))];
      }
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
        bookCategories: { include: { category: { select: { id: true, name: true, nameAr: true, slug: true } } } },
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
    const where = { isActive: true, isFeatured: true, AND: [activeCategoryFilter] };
    const catIds = await getCornerCategoryIds(req.query.corner);
    if (catIds) {
      where.AND.push({
        OR: [{ categoryId: { in: catIds } }, { bookCategories: { some: { categoryId: { in: catIds } } } }],
      });
    }
    const books = await prisma.book.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 8,
      include: { category: { select: { id: true, name: true, nameAr: true, slug: true } } },
    });
    res.json(books);
  } catch (error) { next(error); }
};

exports.newArrivals = async (req, res, next) => {
  try {
    const where = { isActive: true, isNewArrival: true, AND: [activeCategoryFilter] };
    const catIds = await getCornerCategoryIds(req.query.corner);
    if (catIds) {
      where.AND.push({
        OR: [{ categoryId: { in: catIds } }, { bookCategories: { some: { categoryId: { in: catIds } } } }],
      });
    }
    const books = await prisma.book.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 8,
      include: { category: { select: { id: true, name: true, nameAr: true, slug: true } } },
    });
    res.json(books);
  } catch (error) { next(error); }
};

exports.bestsellers = async (req, res, next) => {
  try {
    const where = { isActive: true, isBestseller: true, AND: [activeCategoryFilter] };
    const catIds = await getCornerCategoryIds(req.query.corner);
    if (catIds) {
      where.AND.push({
        OR: [{ categoryId: { in: catIds } }, { bookCategories: { some: { categoryId: { in: catIds } } } }],
      });
    }
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
    const where = { isActive: true, isTrending: true, AND: [activeCategoryFilter] };
    const catIds = await getCornerCategoryIds(req.query.corner);
    if (catIds) {
      where.AND.push({
        OR: [{ categoryId: { in: catIds } }, { bookCategories: { some: { categoryId: { in: catIds } } } }],
      });
    }
    const books = await prisma.book.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 8,
      include: { category: { select: { id: true, name: true, nameAr: true, slug: true } } },
    });
    res.json(books);
  } catch (error) { next(error); }
};

exports.comingSoon = async (req, res, next) => {
  try {
    const where = { isActive: true, isComingSoon: true, AND: [activeCategoryFilter] };
    const catIds = await getCornerCategoryIds(req.query.corner);
    if (catIds) {
      where.AND.push({
        OR: [{ categoryId: { in: catIds } }, { bookCategories: { some: { categoryId: { in: catIds } } } }],
      });
    }
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

exports.filters = async (req, res, next) => {
  try {
    const { category } = req.query;
    const where = { isActive: true };

    if (category) {
      const slugs = category.split(',').map(s => s.trim()).filter(Boolean);
      const cats = await prisma.category.findMany({
        where: { slug: { in: slugs } },
        include: { children: { select: { id: true, children: { select: { id: true } } } } },
      });
      const allIds = [];
      cats.forEach(cat => {
        allIds.push(cat.id);
        cat.children?.forEach(child => {
          allIds.push(child.id);
          child.children?.forEach(gc => allIds.push(gc.id));
        });
      });
      where.OR = [
        { categoryId: { in: allIds } },
        { bookCategories: { some: { categoryId: { in: allIds } } } },
      ];
    }

    const [authors, publishers] = await Promise.all([
      prisma.book.findMany({ where, select: { author: true }, distinct: ['author'], orderBy: { author: 'asc' } }),
      prisma.book.findMany({ where, select: { publisher: true }, distinct: ['publisher'], orderBy: { publisher: 'asc' } }),
    ]);

    res.json({
      authors: authors.map(a => a.author).filter(Boolean),
      publishers: publishers.map(p => p.publisher).filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
};
