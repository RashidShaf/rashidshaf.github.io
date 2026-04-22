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

const ALLOWED_SECTION_TYPES = ['featured', 'bestsellers', 'newArrivals', 'trending', 'comingSoon'];
const FLAG_MAP = {
  featured: 'isFeatured',
  bestsellers: 'isBestseller',
  newArrivals: 'isNewArrival',
  trending: 'isTrending',
  comingSoon: 'isComingSoon',
};

// ---------- Layout config (root home page section order) ----------

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

async function getCornerSectionConfigMap() {
  const row = await prisma.setting.findUnique({ where: { key: 'cornerSectionConfig' } });
  if (!row?.value) return {};
  try {
    const parsed = JSON.parse(row.value);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch { return {}; }
}

// ---------- Per-corner category helpers ----------

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
  // 1) admin picks first, in displayOrder — but out-of-stock items go to the bottom.
  // Fetch a bit extra, then re-sort in JS so isOutOfStock sinks, preserving displayOrder within groups.
  const picksRaw = await prisma.homeSectionProduct.findMany({
    where: { cornerId, sectionType, book: { isActive: true } },
    orderBy: { displayOrder: 'asc' },
    include: { book: { include: BOOK_INCLUDE } },
    take: 24,
  });
  if (picksRaw.length > 0) {
    const sorted = picksRaw
      .slice()
      .sort((a, b) => {
        const aOut = a.book.isOutOfStock ? 1 : 0;
        const bOut = b.book.isOutOfStock ? 1 : 0;
        if (aOut !== bOut) return aOut - bOut;
        return a.displayOrder - b.displayOrder;
      })
      .slice(0, 12);
    return sorted.map((p) => p.book);
  }

  // 2) fallback: flag-based inside this corner (already sorts out-of-stock to bottom)
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

// Build a corner block for the home layout: metadata + L2 children + the 5 per-section carousels.
async function corner(cornerId, cornerSectionConfig) {
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

  const configArr = Array.isArray(cornerSectionConfig?.[cat.slug])
    ? cornerSectionConfig[cat.slug]
    : ALLOWED_SECTION_TYPES.map((type) => ({ type, enabled: true }));
  const enabled = configArr.filter((s) => s && ALLOWED_SECTION_TYPES.includes(s.type) && s.enabled !== false);

  const categoryIds = await collectCornerCategoryIds(cat.id);
  const cornerSections = await Promise.all(
    enabled.map(async (entry) => ({
      type: entry.type,
      books: await cornerSectionBooks(cat.id, entry.type, categoryIds),
    }))
  );

  return {
    type: 'corner',
    corner: { id: cat.id, name: cat.name, nameAr: cat.nameAr, slug: cat.slug, children: cat.children, _count: cat._count },
    cornerSections,
  };
}

// ---------- Root-home global sections (e.g. "Everyone's Talking About" across all corners) ----------

async function globalSection(type) {
  const flag = FLAG_MAP[type];
  if (!flag) return null;
  const books = await prisma.book.findMany({
    where: { isActive: true, [flag]: true, OR: [{ category: { isActive: true } }, { categoryId: null }] },
    orderBy: [{ isOutOfStock: 'asc' }, { createdAt: 'desc' }],
    take: 8,
    include: BOOK_INCLUDE,
  });
  return { type, books };
}

// ---------- Public endpoints ----------

// Public: GET /api/home/layout
exports.getLayout = async (req, res, next) => {
  try {
    const [config, cornerSectionConfig] = await Promise.all([getLayoutConfig(), getCornerSectionConfigMap()]);
    const sections = [];
    for (const entry of config) {
      if (entry?.enabled === false) continue;
      if (entry.type === 'corner') {
        const s = await corner(entry.cornerId, cornerSectionConfig);
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

// Public: GET /api/home/corner-sections/:slug
// Kept for deep-linking / standalone corner views.
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

    const configMap = await getCornerSectionConfigMap();
    const config = Array.isArray(configMap[slug])
      ? configMap[slug]
      : ALLOWED_SECTION_TYPES.map((type) => ({ type, enabled: true }));

    const enabledEntries = config.filter((s) => s && ALLOWED_SECTION_TYPES.includes(s.type) && s.enabled !== false);
    const categoryIds = await collectCornerCategoryIds(cornerCat.id);

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
