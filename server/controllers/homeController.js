const prisma = require('../config/database');

const BOOK_INCLUDE = {
  category: {
    select: {
      id: true, name: true, nameAr: true, slug: true, placeholderImage: true,
      parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true, parent: { select: { placeholderImage: true } } } } } },
    },
  },
};

const DEFAULT_GLOBAL_ORDER = ['featured', 'newArrivals', 'bestsellers', 'trending', 'comingSoon'];

// Build the default layout config: every active L1 corner (displayOrder) followed by global sections.
async function buildDefaultLayout() {
  const corners = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { displayOrder: 'asc' },
    select: { id: true },
  });
  return [
    ...corners.map((c) => ({ type: 'corner', cornerId: c.id, enabled: true })),
    ...DEFAULT_GLOBAL_ORDER.map((t) => ({ type: t, enabled: true })),
  ];
}

// Read layout config from Settings, seeding a default row on first access.
async function getLayoutConfig() {
  const existing = await prisma.setting.findUnique({ where: { key: 'homeLayout' } });
  if (existing?.value) {
    try {
      const parsed = JSON.parse(existing.value);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  const defaults = await buildDefaultLayout();
  await prisma.setting.upsert({
    where: { key: 'homeLayout' },
    update: { value: JSON.stringify(defaults) },
    create: { key: 'homeLayout', value: JSON.stringify(defaults) },
  });
  return defaults;
}

async function corner(cornerId) {
  const cat = await prisma.category.findUnique({
    where: { id: cornerId },
    include: {
      _count: { select: { books: { where: { isActive: true } } } },
      children: {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
        include: { _count: { select: { books: { where: { isActive: true } } } } },
      },
    },
  });
  if (!cat || !cat.isActive) return null;
  const picks = await prisma.homeSectionProduct.findMany({
    where: { cornerId, book: { isActive: true } },
    orderBy: { displayOrder: 'asc' },
    include: { book: { include: BOOK_INCLUDE } },
  });
  return {
    type: 'corner',
    corner: { id: cat.id, name: cat.name, nameAr: cat.nameAr, slug: cat.slug, children: cat.children, _count: cat._count },
    books: picks.map((p) => p.book),
  };
}

async function cornerBooksForGlobalSection(flagField) {
  // Reuse the same logic that the separate endpoints used: isActive book + its flag true + active category.
  return prisma.book.findMany({
    where: { isActive: true, [flagField]: true, OR: [{ category: { isActive: true } }, { categoryId: null }] },
    orderBy: [{ isOutOfStock: 'asc' }, { createdAt: 'desc' }],
    take: 8,
    include: BOOK_INCLUDE,
  });
}

async function globalSection(type) {
  const flagMap = {
    featured: 'isFeatured',
    newArrivals: 'isNewArrival',
    bestsellers: 'isBestseller',
    trending: 'isTrending',
    comingSoon: 'isComingSoon',
  };
  const flag = flagMap[type];
  if (!flag) return null;
  const books = await cornerBooksForGlobalSection(flag);
  return { type, books };
}

// Public: GET /api/home/layout
exports.getLayout = async (req, res, next) => {
  try {
    const config = await getLayoutConfig();
    const sections = [];
    for (const entry of config) {
      if (entry?.enabled === false) continue;
      if (entry.type === 'corner') {
        const s = await corner(entry.cornerId);
        if (s) sections.push(s);
      } else {
        const s = await globalSection(entry.type);
        if (s) sections.push(s);
      }
    }
    res.json({ sections });
  } catch (error) {
    next(error);
  }
};
