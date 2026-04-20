const prisma = require('../config/database');

const ALLOWED_GLOBAL_TYPES = ['featured', 'newArrivals', 'bestsellers', 'trending', 'comingSoon'];

// GET /api/admin/home/config
// Returns the saved section order + the picks for every corner referenced in the config.
exports.getConfig = async (req, res, next) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'homeLayout' } });
    let sections = [];
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed)) sections = parsed;
      } catch {}
    }
    // Ensure every active corner appears somewhere in the list (seed newly-created ones).
    const corners = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, name: true, nameAr: true, slug: true },
    });
    const knownCornerIds = new Set(sections.filter((s) => s.type === 'corner').map((s) => s.cornerId));
    corners.forEach((c) => {
      if (!knownCornerIds.has(c.id)) sections.push({ type: 'corner', cornerId: c.id, enabled: true });
    });
    // Ensure all global types are present (so admin can toggle them even if they aren't saved yet).
    const knownGlobalTypes = new Set(sections.filter((s) => ALLOWED_GLOBAL_TYPES.includes(s.type)).map((s) => s.type));
    ALLOWED_GLOBAL_TYPES.forEach((t) => {
      if (!knownGlobalTypes.has(t)) sections.push({ type: t, enabled: true });
    });

    // Fetch picks for every corner in the config.
    // We include isActive so the admin UI can mark inactive books — we do NOT filter them out,
    // because the admin should see everything they've picked (inactive books are hidden on the
    // storefront by homeController, but admin needs visibility to heal them).
    const cornerIds = sections.filter((s) => s.type === 'corner').map((s) => s.cornerId);
    const picks = await prisma.homeSectionProduct.findMany({
      where: { cornerId: { in: cornerIds } },
      orderBy: { displayOrder: 'asc' },
      include: { book: { select: { id: true, title: true, titleAr: true, coverImage: true, sku: true, price: true, isActive: true } } },
    });
    const cornerPicks = {};
    cornerIds.forEach((id) => { cornerPicks[id] = []; });
    picks.forEach((p) => {
      if (!cornerPicks[p.cornerId]) cornerPicks[p.cornerId] = [];
      cornerPicks[p.cornerId].push(p.book);
    });

    res.json({ sections, cornerPicks, corners });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/home/config
// Body: { sections: [...], cornerPicks: { [cornerId]: [bookId, bookId, ...] } }
exports.saveConfig = async (req, res, next) => {
  try {
    const { sections, cornerPicks } = req.body;
    if (!Array.isArray(sections)) return res.status(400).json({ message: 'sections must be an array' });
    if (cornerPicks && typeof cornerPicks !== 'object') return res.status(400).json({ message: 'cornerPicks must be an object' });

    // Validate section shapes
    const cleanSections = sections
      .filter((s) => s && typeof s.type === 'string')
      .map((s) => {
        if (s.type === 'corner') return { type: 'corner', cornerId: String(s.cornerId), enabled: s.enabled !== false };
        if (ALLOWED_GLOBAL_TYPES.includes(s.type)) return { type: s.type, enabled: s.enabled !== false };
        return null;
      })
      .filter(Boolean);

    // Run all writes inside a single transaction so a partial failure doesn't leave some corners
    // updated while others are still on the old picks.
    const ops = [];
    ops.push(prisma.setting.upsert({
      where: { key: 'homeLayout' },
      update: { value: JSON.stringify(cleanSections) },
      create: { key: 'homeLayout', value: JSON.stringify(cleanSections) },
    }));

    if (cornerPicks) {
      for (const [cornerId, bookIds] of Object.entries(cornerPicks)) {
        if (!Array.isArray(bookIds)) continue;
        ops.push(prisma.homeSectionProduct.deleteMany({ where: { cornerId } }));
        const rows = bookIds
          .filter((id) => typeof id === 'string' && id)
          .map((bookId, i) => ({ cornerId, bookId, displayOrder: i }));
        if (rows.length > 0) {
          ops.push(prisma.homeSectionProduct.createMany({ data: rows, skipDuplicates: true }));
        }
      }
    }

    await prisma.$transaction(ops);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/home/books-search?q=&cornerId=
// Returns matching books optionally scoped to a corner's descendant categories.
exports.searchBooks = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const cornerId = req.query.cornerId;
    const where = { isActive: true };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { titleAr: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (cornerId) {
      // Resolve the corner's entire category subtree
      const collect = async (parentId) => {
        const children = await prisma.category.findMany({ where: { parentId }, select: { id: true } });
        if (children.length === 0) return [];
        const ids = children.map((c) => c.id);
        const deeper = [];
        for (const id of ids) deeper.push(...(await collect(id)));
        return [...ids, ...deeper];
      };
      const allIds = [cornerId, ...(await collect(cornerId))];
      where.AND = [{
        OR: [
          { categoryId: { in: allIds } },
          { bookCategories: { some: { categoryId: { in: allIds } } } },
        ],
      }];
    }
    const books = await prisma.book.findMany({
      where,
      take: 20,
      orderBy: { title: 'asc' },
      select: { id: true, title: true, titleAr: true, coverImage: true, sku: true, price: true },
    });
    res.json(books);
  } catch (error) {
    next(error);
  }
};
