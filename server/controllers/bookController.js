const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');
const { BOOK_SORT_OPTIONS } = require('../config/constants');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, category, minPrice, maxPrice, author, publisher, language, sort, brand, color, material } = req.query;

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
          { publisher: { contains: search, mode: 'insensitive' } },
          { publisherAr: { contains: search, mode: 'insensitive' } },
          { isbn: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    // Category filter — supports multiple comma-separated slugs, includes sub-categories (4 levels)
    if (category) {
      const slugs = category.split(',').map(s => s.trim()).filter(Boolean);
      const cats = await prisma.category.findMany({
        where: { slug: { in: slugs } },
        include: {
          children: {
            select: { id: true, children: { select: { id: true, children: { select: { id: true } } } } },
          },
        },
      });
      if (cats.length > 0) {
        const allIds = [];
        const collectIds = (cat) => {
          allIds.push(cat.id);
          cat.children?.forEach((child) => collectIds(child));
        };
        cats.forEach(collectIds);
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

    // Brand filter (comma-separated multi-select)
    if (brand) {
      const brands = brand.split(',').map(b => b.trim()).filter(Boolean);
      if (brands.length === 1) {
        where.brand = { equals: brands[0], mode: 'insensitive' };
      } else {
        where.AND.push({ OR: brands.map(b => ({ brand: { equals: b, mode: 'insensitive' } })) });
      }
    }

    // Color filter (comma-separated multi-select)
    if (color) {
      const colors = color.split(',').map(c => c.trim()).filter(Boolean);
      if (colors.length === 1) {
        where.color = { equals: colors[0], mode: 'insensitive' };
      } else {
        where.AND.push({ OR: colors.map(c => ({ color: { equals: c, mode: 'insensitive' } })) });
      }
    }

    // Material filter (comma-separated multi-select)
    if (material) {
      const materials = material.split(',').map(m => m.trim()).filter(Boolean);
      if (materials.length === 1) {
        where.material = { equals: materials[0], mode: 'insensitive' };
      } else {
        where.AND.push({ OR: materials.map(m => ({ material: { equals: m, mode: 'insensitive' } })) });
      }
    }

    // Custom field filters (cf_fieldkey=value1,value2)
    // Match exact key+value pairs in JSON like: "fieldkey":{"value":"Red"}
    Object.keys(req.query).filter((k) => k.startsWith('cf_')).forEach((k) => {
      const values = req.query[k].split(',').map((v) => v.trim()).filter(Boolean);
      if (values.length > 0) {
        const cfKey = k.slice(3); // remove "cf_" prefix
        where.AND.push({
          OR: values.map((v) => ({
            OR: [
              { customFields: { contains: `"${cfKey}":{"value":"${v}"` } },
              { customFields: { contains: `"${cfKey}":{"valueAr":"${v}"` } },
            ],
          })),
        });
      }
    });

    // Section filter
    const { section } = req.query;
    if (section === 'featured') where.isFeatured = true;
    if (section === 'bestseller') where.isBestseller = true;
    if (section === 'new') where.isNewArrival = true;
    if (section === 'trending') where.isTrending = true;

    // Sort
    let sortBy = { createdAt: 'desc' };
    switch (sort) {
      case 'price_asc': sortBy = { price: 'asc' }; break;
      case 'price_desc': sortBy = { price: 'desc' }; break;
      case 'newest': sortBy = { createdAt: 'desc' }; break;
      case 'rating': sortBy = { averageRating: 'desc' }; break;
      case 'bestselling': sortBy = { salesCount: 'desc' }; break;
      case 'title_asc': sortBy = { title: 'asc' }; break;
      case 'title_desc': sortBy = { title: 'desc' }; break;
    }
    // Out-of-stock products always go to the bottom
    const orderBy = [{ isOutOfStock: 'asc' }, sortBy];

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, nameAr: true, slug: true, placeholderImage: true,
            parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true } } } } } },
          } },
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
            id: true, name: true, nameAr: true, slug: true, isActive: true, parentId: true, detailFields: true, customFields: true, placeholderImage: true,
            parent: { select: { id: true, name: true, nameAr: true, slug: true, detailFields: true, customFields: true, parentId: true, placeholderImage: true,
              parent: { select: { id: true, name: true, nameAr: true, slug: true, detailFields: true, customFields: true, parentId: true, placeholderImage: true,
                parent: { select: { id: true, name: true, nameAr: true, slug: true, detailFields: true, customFields: true, placeholderImage: true } },
              } },
            } },
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
        select: { id: true, children: { select: { id: true, children: { select: { id: true } } } } },
      },
    },
  });
  if (!cat) return null;
  const allIds = [];
  const collect = (c) => { allIds.push(c.id); c.children?.forEach(collect); };
  collect(cat);
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
      where, orderBy: [{ isOutOfStock: 'asc' }, { createdAt: 'desc' }], take: 8,
      include: { category: { select: { id: true, name: true, nameAr: true, slug: true, placeholderImage: true, parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true } } } } } } } } },
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
      where, orderBy: [{ isOutOfStock: 'asc' }, { createdAt: 'desc' }], take: 8,
      include: { category: { select: { id: true, name: true, nameAr: true, slug: true, placeholderImage: true, parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true } } } } } } } } },
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
      where, orderBy: [{ isOutOfStock: 'asc' }, { createdAt: 'desc' }], take: 8,
      include: { category: { select: { id: true, name: true, nameAr: true, slug: true, placeholderImage: true, parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true } } } } } } } } },
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
      where, orderBy: [{ isOutOfStock: 'asc' }, { createdAt: 'desc' }], take: 8,
      include: { category: { select: { id: true, name: true, nameAr: true, slug: true, placeholderImage: true, parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true } } } } } } } } },
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
      where, orderBy: [{ isOutOfStock: 'asc' }, { createdAt: 'desc' }], take: 8,
      include: { category: { select: { id: true, name: true, nameAr: true, slug: true, placeholderImage: true, parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true } } } } } } } } },
    });
    res.json(books);
  } catch (error) { next(error); }
};

exports.recommendations = async (req, res, next) => {
  try {
    const book = await prisma.book.findUnique({ where: { id: req.params.id } });
    if (!book) return res.status(404).json({ message: 'Book not found.' });

    const orConditions = [];
    if (book.categoryId) orConditions.push({ categoryId: book.categoryId });
    if (book.author && book.author.trim()) orConditions.push({ author: book.author });
    if (book.publisher && book.publisher.trim()) orConditions.push({ publisher: book.publisher });
    if (book.brand && book.brand.trim()) orConditions.push({ brand: book.brand });
    if (book.tags && book.tags.length > 0) orConditions.push({ tags: { hasSome: book.tags } });
    // Also match products sharing additional categories
    if (book.categoryId) orConditions.push({ bookCategories: { some: { categoryId: book.categoryId } } });

    const books = await prisma.book.findMany({
      where: {
        isActive: true,
        id: { not: book.id },
        ...(orConditions.length > 0 ? { OR: orConditions } : {}),
      },
      orderBy: [{ isOutOfStock: 'asc' }, { averageRating: 'desc' }],
      take: 6,
      include: {
        category: { select: { id: true, name: true, nameAr: true, slug: true, placeholderImage: true, parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true } } } } } } } },
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
        include: { children: { select: { id: true, children: { select: { id: true, children: { select: { id: true } } } } } } },
      });
      const allIds = [];
      const collectIds = (c) => { allIds.push(c.id); c.children?.forEach(collectIds); };
      cats.forEach(collectIds);
      where.OR = [
        { categoryId: { in: allIds } },
        { bookCategories: { some: { categoryId: { in: allIds } } } },
      ];
    }

    const [authors, publishers, brands, colors, materials] = await Promise.all([
      prisma.book.findMany({ where, select: { author: true, authorAr: true }, distinct: ['author'], orderBy: { author: 'asc' } }),
      prisma.book.findMany({ where, select: { publisher: true, publisherAr: true }, distinct: ['publisher'], orderBy: { publisher: 'asc' } }),
      prisma.book.findMany({ where, select: { brand: true, brandAr: true }, distinct: ['brand'], orderBy: { brand: 'asc' } }),
      prisma.book.findMany({ where, select: { color: true, colorAr: true }, distinct: ['color'], orderBy: { color: 'asc' } }),
      prisma.book.findMany({ where, select: { material: true, materialAr: true }, distinct: ['material'], orderBy: { material: 'asc' } }),
    ]);

    // Extract distinct custom field values
    const booksWithCF = await prisma.book.findMany({
      where: { ...where, customFields: { not: null } },
      select: { customFields: true },
    });
    const cfMap = {};
    booksWithCF.forEach((b) => {
      try {
        const parsed = JSON.parse(b.customFields);
        Object.entries(parsed).forEach(([key, val]) => {
          if (!val || (!val.value && !val.valueAr)) return;
          if (!cfMap[key]) cfMap[key] = new Map();
          if (val.value && !cfMap[key].has(val.value)) {
            cfMap[key].set(val.value, val.valueAr || null);
          }
        });
      } catch {}
    });
    const customFieldValues = {};
    Object.entries(cfMap).forEach(([key, map]) => {
      customFieldValues[key] = Array.from(map.entries()).map(([v, vAr]) => ({ value: v, valueAr: vAr }));
    });

    res.json({
      authors: authors.filter(a => a.author).map(a => ({ value: a.author, valueAr: a.authorAr })),
      publishers: publishers.filter(p => p.publisher).map(p => ({ value: p.publisher, valueAr: p.publisherAr })),
      brands: brands.filter(b => b.brand).map(b => ({ value: b.brand, valueAr: b.brandAr })),
      colors: colors.filter(c => c.color).map(c => ({ value: c.color, valueAr: c.colorAr })),
      materials: materials.filter(m => m.material).map(m => ({ value: m.material, valueAr: m.materialAr })),
      customFieldValues,
    });
  } catch (error) {
    next(error);
  }
};
