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
  const flag = FLAG_MAP[sectionType];
  if (!flag) return [];

  // Show EVERY book the admin marked for this section, regardless of how they
  // marked it: explicit pick in Home Layout, or flag checkbox from the product
  // edit page / bulk tools. Picks go first (admin-controlled order), flagged
  // books follow (newest first). Duplicates are removed. Out-of-stock drops
  // to the bottom of the combined list.
  const [picks, flagged] = await Promise.all([
    prisma.homeSectionProduct.findMany({
      where: { cornerId, sectionType, book: { isActive: true } },
      orderBy: { displayOrder: 'asc' },
      include: { book: { include: BOOK_INCLUDE } },
    }),
    prisma.book.findMany({
      where: {
        isActive: true,
        [flag]: true,
        OR: [
          { categoryId: { in: cornerCategoryIds } },
          { bookCategories: { some: { categoryId: { in: cornerCategoryIds } } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: BOOK_INCLUDE,
    }),
  ]);

  const pickedIds = new Set(picks.map((p) => p.bookId));
  const merged = [
    ...picks.map((p) => p.book),
    ...flagged.filter((b) => !pickedIds.has(b.id)),
  ];

  // Stable sort: out-of-stock to the bottom, otherwise preserve merged order.
  return merged
    .sort((a, b) => (a.isOutOfStock ? 1 : 0) - (b.isOutOfStock ? 1 : 0))
    .slice(0, 24);
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
      // Custom per-corner titles — client falls back to default translation when empty.
      titleEn: typeof entry.titleEn === 'string' ? entry.titleEn : null,
      titleAr: typeof entry.titleAr === 'string' ? entry.titleAr : null,
      // One failed section should not 500 the whole home layout. Log and show empty.
      books: await cornerSectionBooks(cat.id, entry.type, categoryIds).catch((err) => {
        console.error(`cornerSectionBooks failed for corner=${cat.slug} type=${entry.type}:`, err);
        return [];
      }),
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

// Public: GET /api/home/corner-titles
// Lightweight — returns just the per-corner section title overrides so the catalog
// page (Books.jsx) can relabel its section filter dropdown when a corner is selected.
// Shape: { [cornerSlug]: { [sectionType]: { titleEn, titleAr } } }
exports.getCornerTitles = async (req, res, next) => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'cornerSectionConfig' } });
    if (!row?.value) return res.json({});
    let parsed;
    try { parsed = JSON.parse(row.value); } catch { return res.json({}); }
    if (!parsed || typeof parsed !== 'object') return res.json({});
    const out = {};
    for (const [slug, arr] of Object.entries(parsed)) {
      if (!Array.isArray(arr)) continue;
      const titles = {};
      arr.forEach((s) => {
        if (s && typeof s.type === 'string' && ALLOWED_SECTION_TYPES.includes(s.type)) {
          titles[s.type] = {
            titleEn: typeof s.titleEn === 'string' && s.titleEn.trim() ? s.titleEn.trim() : null,
            titleAr: typeof s.titleAr === 'string' && s.titleAr.trim() ? s.titleAr.trim() : null,
          };
        }
      });
      out[slug] = titles;
    }
    res.json(out);
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
        titleEn: typeof entry.titleEn === 'string' ? entry.titleEn : null,
        titleAr: typeof entry.titleAr === 'string' ? entry.titleAr : null,
        books: await cornerSectionBooks(cornerCat.id, entry.type, categoryIds).catch((err) => {
          console.error(`cornerSectionBooks failed for corner=${slug} type=${entry.type}:`, err);
          return [];
        }),
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
