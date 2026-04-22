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

// ======================== Per-corner section page ========================

const ALLOWED_SECTION_TYPES = ['featured', 'bestsellers', 'newArrivals', 'trending', 'comingSoon'];
const FLAG_MAP = {
  featured: 'isFeatured',
  bestsellers: 'isBestseller',
  newArrivals: 'isNewArrival',
  trending: 'isTrending',
  comingSoon: 'isComingSoon',
};

// Walk a corner's category subtree to collect every descendant category ID.
async function collectCornerCategoryIds(cornerId) {
  const walk = async (parentIds) => {
    if (parentIds.length === 0) return [];
    const children = await prisma.category.findMany({ where: { parentId: { in: parentIds } }, select: { id: true } });
    if (children.length === 0) return [];
    const ids = children.map((c) => c.id);
    const deeper = await walk(ids);
    return [...ids, ...deeper];
  };
  return [cornerId, ...(await walk([cornerId]))];
}

async function cornerSectionBooks(cornerId, sectionType, cornerCategoryIds) {
  // 1) admin picks first, in displayOrder
  const picks = await prisma.homeSectionProduct.findMany({
    where: { cornerId, sectionType, book: { isActive: true } },
    orderBy: { displayOrder: 'asc' },
    include: { book: { include: BOOK_INCLUDE } },
    take: 12,
  });
  if (picks.length > 0) return picks.map((p) => p.book);

  // 2) fallback: flag-based inside this corner
  const flag = FLAG_MAP[sectionType];
  if (!flag) return [];
  return prisma.book.findMany({
    where: {
      isActive: true,
      [flag]: true,
      OR: [
        { categoryId: { in: cornerCategoryIds } },
        { bookCategories: { some: { categoryId: { in: cornerCategoryIds } } } },
      ],
    },
    orderBy: [{ isOutOfStock: 'asc' }, { createdAt: 'desc' }],
    take: 12,
    include: BOOK_INCLUDE,
  });
}

// Public: GET /api/home/corner-sections/:slug
// Returns all enabled sections for this corner (admin picks + fallback), in the admin-specified order.
exports.getCornerSections = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const cornerCat = await prisma.category.findUnique({
      where: { slug },
      select: { id: true, name: true, nameAr: true, slug: true, isActive: true, parentId: true },
    });
    if (!cornerCat || !cornerCat.isActive || cornerCat.parentId !== null) {
      return res.status(404).json({ message: 'Corner not found.' });
    }

    // Read admin-saved order/visibility for this corner; default to all 5 enabled.
    const configSetting = await prisma.setting.findUnique({ where: { key: 'cornerSectionConfig' } });
    let config;
    try {
      const parsed = configSetting?.value ? JSON.parse(configSetting.value) : {};
      config = Array.isArray(parsed?.[slug]) ? parsed[slug] : null;
    } catch { config = null; }
    if (!config || config.length === 0) {
      config = ALLOWED_SECTION_TYPES.map((type) => ({ type, enabled: true }));
    }

    const categoryIds = await collectCornerCategoryIds(cornerCat.id);

    // Fetch every enabled section's books in parallel.
    const enabledEntries = config.filter((s) => s && ALLOWED_SECTION_TYPES.includes(s.type) && s.enabled !== false);
    const sections = await Promise.all(
      enabledEntries.map(async (entry) => ({
        type: entry.type,
        books: await cornerSectionBooks(cornerCat.id, entry.type, categoryIds),
      }))
    );

    res.json({
      corner: { id: cornerCat.id, name: cornerCat.name, nameAr: cornerCat.nameAr, slug: cornerCat.slug },
      sections,
    });
  } catch (error) {
    next(error);
  }
};
