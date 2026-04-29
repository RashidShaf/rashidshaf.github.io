const prisma = require('../config/database');

const ALLOWED_GLOBAL_TYPES = ['featured', 'newArrivals', 'bestsellers', 'trending', 'comingSoon'];
const ALLOWED_SECTION_TYPES = ['featured', 'bestsellers', 'newArrivals', 'trending', 'comingSoon'];
const DEFAULT_CORNER_SECTION_CONFIG = ALLOWED_SECTION_TYPES.map((type) => ({ type, enabled: true }));

// Maps a section-type key to the Book flag that represents it on the storefront.
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

// GET /api/admin/home/config
// Returns the saved section order + picks per corner per section type + the per-corner section config
// (visibility + order of the 5 per-corner sections that render on `/?corner=<slug>`).
exports.getConfig = async (req, res, next) => {
  try {
    // --- home layout (global + corner section ordering on the root home page) ---
    const setting = await prisma.setting.findUnique({ where: { key: 'homeLayout' } });
    let sections = [];
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed)) sections = parsed;
      } catch {}
    }
    const corners = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, name: true, nameAr: true, slug: true },
    });
    // Drop stale entries first — corner sections whose cornerId no longer
    // matches an active top-level category (deleted, deactivated, or moved
    // under a parent), and global sections whose type is no longer allowed.
    // Without this filter the admin UI shows them as "Unknown corner".
    const validCornerIds = new Set(corners.map((c) => c.id));
    sections = sections.filter((s) => {
      if (s.type === 'corner') return validCornerIds.has(s.cornerId);
      return ALLOWED_GLOBAL_TYPES.includes(s.type);
    });
    const knownCornerIds = new Set(sections.filter((s) => s.type === 'corner').map((s) => s.cornerId));
    corners.forEach((c) => {
      if (!knownCornerIds.has(c.id)) sections.push({ type: 'corner', cornerId: c.id, enabled: true });
    });
    const knownGlobalTypes = new Set(sections.filter((s) => ALLOWED_GLOBAL_TYPES.includes(s.type)).map((s) => s.type));
    ALLOWED_GLOBAL_TYPES.forEach((t) => {
      if (!knownGlobalTypes.has(t)) sections.push({ type: t, enabled: true });
    });

    // --- picks grouped by (corner, sectionType), with flag-based books merged in ---
    const cornerIds = corners.map((c) => c.id);
    const picks = await prisma.homeSectionProduct.findMany({
      where: { cornerId: { in: cornerIds } },
      orderBy: [{ cornerId: 'asc' }, { sectionType: 'asc' }, { displayOrder: 'asc' }],
      include: { book: { select: { id: true, title: true, titleAr: true, coverImage: true, sku: true, price: true, isActive: true } } },
    });
    const cornerPicks = {};
    cornerIds.forEach((id) => {
      cornerPicks[id] = {};
      ALLOWED_SECTION_TYPES.forEach((t) => { cornerPicks[id][t] = []; });
    });
    picks.forEach((p) => {
      const cornerBucket = cornerPicks[p.cornerId] || (cornerPicks[p.cornerId] = {});
      const type = ALLOWED_SECTION_TYPES.includes(p.sectionType) ? p.sectionType : 'featured';
      if (!cornerBucket[type]) cornerBucket[type] = [];
      cornerBucket[type].push(p.book);
    });

    // Merge flag-based books into each corner+section. Books flagged (isFeatured, isBestseller,
    // etc.) through the product page appear at the end of the relevant section's list, marked
    // as auto-included so the admin knows they come from a flag.
    const BOOK_SELECT = { id: true, title: true, titleAr: true, coverImage: true, sku: true, price: true, isActive: true };
    await Promise.all(corners.map(async (c) => {
      const categoryIds = await collectCornerCategoryIds(c.id);
      const bucket = cornerPicks[c.id] || (cornerPicks[c.id] = {});
      for (const sectionType of ALLOWED_SECTION_TYPES) {
        if (!bucket[sectionType]) bucket[sectionType] = [];
        const flag = FLAG_MAP[sectionType];
        if (!flag) continue;
        const pickedIds = bucket[sectionType].map((b) => b.id);
        const flagged = await prisma.book.findMany({
          where: {
            isActive: true,
            [flag]: true,
            id: { notIn: pickedIds },
            OR: [
              { categoryId: { in: categoryIds } },
              { bookCategories: { some: { categoryId: { in: categoryIds } } } },
            ],
          },
          select: BOOK_SELECT,
          take: 50,
        });
        flagged.forEach((b) => {
          bucket[sectionType].push(b);
        });
      }
    }));

    // --- per-corner section config (visibility + order) ---
    const configSetting = await prisma.setting.findUnique({ where: { key: 'cornerSectionConfig' } });
    let cornerSectionConfig = {};
    if (configSetting?.value) {
      try {
        const parsed = JSON.parse(configSetting.value);
        if (parsed && typeof parsed === 'object') cornerSectionConfig = parsed;
      } catch {}
    }
    // Ensure every corner has a config entry — fill in default when missing or malformed.
    corners.forEach((c) => {
      const existing = cornerSectionConfig[c.slug];
      if (!Array.isArray(existing) || existing.length === 0) {
        cornerSectionConfig[c.slug] = DEFAULT_CORNER_SECTION_CONFIG.map((s) => ({ ...s }));
      } else {
        // Normalize: ensure all 5 types present, preserve user-specified order + enabled state
        // + optional per-corner custom titles (titleEn, titleAr).
        const seen = new Set();
        const normalized = [];
        existing.forEach((s) => {
          if (s && ALLOWED_SECTION_TYPES.includes(s.type) && !seen.has(s.type)) {
            seen.add(s.type);
            const entry = { type: s.type, enabled: s.enabled !== false };
            if (typeof s.titleEn === 'string' && s.titleEn.trim()) entry.titleEn = s.titleEn.trim().slice(0, 80);
            if (typeof s.titleAr === 'string' && s.titleAr.trim()) entry.titleAr = s.titleAr.trim().slice(0, 80);
            normalized.push(entry);
          }
        });
        ALLOWED_SECTION_TYPES.forEach((t) => {
          if (!seen.has(t)) normalized.push({ type: t, enabled: true });
        });
        cornerSectionConfig[c.slug] = normalized;
      }
    });

    res.json({ sections, cornerPicks, cornerSectionConfig, corners });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/home/config
// Body: {
//   sections: [...],                                           // home layout (unchanged)
//   cornerPicks: { [cornerId]: { [sectionType]: [bookId, ...] } },   // new nested shape
//   cornerSectionConfig: { [cornerSlug]: [{type, enabled}, ...] }    // new
// }
// Backward compatibility: if cornerPicks[cornerId] is a flat array (old format), treat as 'featured'.
exports.saveConfig = async (req, res, next) => {
  try {
    const { sections, cornerPicks, cornerSectionConfig } = req.body;
    if (!Array.isArray(sections)) return res.status(400).json({ message: 'sections must be an array' });
    if (cornerPicks && typeof cornerPicks !== 'object') return res.status(400).json({ message: 'cornerPicks must be an object' });
    if (cornerSectionConfig && typeof cornerSectionConfig !== 'object') return res.status(400).json({ message: 'cornerSectionConfig must be an object' });

    const cleanSections = sections
      .filter((s) => s && typeof s.type === 'string')
      .map((s) => {
        if (s.type === 'corner') return { type: 'corner', cornerId: String(s.cornerId), enabled: s.enabled !== false };
        if (ALLOWED_GLOBAL_TYPES.includes(s.type)) return { type: s.type, enabled: s.enabled !== false };
        return null;
      })
      .filter(Boolean);

    // Snapshot "before" picks for the corners being saved; used inside the transaction
    // to detect which books gained/lost their pick and flip matching flags atomically.
    const cornerIdsInPayload = Object.keys(cornerPicks || {});
    let beforePicks = [];
    if (cornerIdsInPayload.length > 0) {
      beforePicks = await prisma.homeSectionProduct.findMany({
        where: { cornerId: { in: cornerIdsInPayload } },
        select: { cornerId: true, sectionType: true, bookId: true },
      });
    }

    await prisma.$transaction(async (tx) => {
      // --- home layout setting ---
      await tx.setting.upsert({
        where: { key: 'homeLayout' },
        update: { value: JSON.stringify(cleanSections) },
        create: { key: 'homeLayout', value: JSON.stringify(cleanSections) },
      });

      // --- pick writes ---
      if (cornerPicks) {
        for (const [cornerId, sectionsOrArray] of Object.entries(cornerPicks)) {
          await tx.homeSectionProduct.deleteMany({ where: { cornerId } });

          let perSection;
          if (Array.isArray(sectionsOrArray)) {
            perSection = { featured: sectionsOrArray };
          } else if (sectionsOrArray && typeof sectionsOrArray === 'object') {
            perSection = sectionsOrArray;
          } else {
            continue;
          }

          const rows = [];
          for (const [sectionType, bookIds] of Object.entries(perSection)) {
            if (!ALLOWED_SECTION_TYPES.includes(sectionType)) continue;
            if (!Array.isArray(bookIds)) continue;
            bookIds
              .filter((id) => typeof id === 'string' && id)
              .forEach((bookId, i) => rows.push({ cornerId, sectionType, bookId, displayOrder: i }));
          }
          if (rows.length > 0) {
            await tx.homeSectionProduct.createMany({ data: rows, skipDuplicates: true });
          }
        }
      }

      // --- corner section config (order + visibility + custom titles per corner) ---
      if (cornerSectionConfig) {
        const cleanConfig = {};
        for (const [slug, arr] of Object.entries(cornerSectionConfig)) {
          if (!Array.isArray(arr)) continue;
          const seen = new Set();
          const normalized = [];
          arr.forEach((s) => {
            if (s && ALLOWED_SECTION_TYPES.includes(s.type) && !seen.has(s.type)) {
              seen.add(s.type);
              const entry = { type: s.type, enabled: s.enabled !== false };
              if (typeof s.titleEn === 'string' && s.titleEn.trim()) entry.titleEn = s.titleEn.trim().slice(0, 80);
              if (typeof s.titleAr === 'string' && s.titleAr.trim()) entry.titleAr = s.titleAr.trim().slice(0, 80);
              normalized.push(entry);
            }
          });
          ALLOWED_SECTION_TYPES.forEach((t) => {
            if (!seen.has(t)) normalized.push({ type: t, enabled: true });
          });
          cleanConfig[slug] = normalized;
        }
        await tx.setting.upsert({
          where: { key: 'cornerSectionConfig' },
          update: { value: JSON.stringify(cleanConfig) },
          create: { key: 'cornerSectionConfig', value: JSON.stringify(cleanConfig) },
        });
      }

      // --- two-way flag sync, still inside the transaction for atomicity ---
      if (cornerIdsInPayload.length > 0) {
        const afterPicks = await tx.homeSectionProduct.findMany({
          where: { cornerId: { in: cornerIdsInPayload } },
          select: { sectionType: true, bookId: true },
        });

        for (const [sectionType, flag] of Object.entries(FLAG_MAP)) {
          const beforeIds = new Set(
            beforePicks.filter((p) => p.sectionType === sectionType).map((p) => p.bookId)
          );
          const afterIds = new Set(
            afterPicks.filter((p) => p.sectionType === sectionType).map((p) => p.bookId)
          );

          const added = [...afterIds].filter((id) => !beforeIds.has(id));
          if (added.length > 0) {
            await tx.book.updateMany({
              where: { id: { in: added }, [flag]: false },
              data: { [flag]: true },
            });
          }

          const removed = [...beforeIds].filter((id) => !afterIds.has(id));
          if (removed.length > 0) {
            // Still picked for this section type in some OTHER corner we didn't touch?
            const stillPicked = await tx.homeSectionProduct.findMany({
              where: { sectionType, bookId: { in: removed } },
              select: { bookId: true },
              distinct: ['bookId'],
            });
            const stillSet = new Set(stillPicked.map((r) => r.bookId));
            const orphaned = removed.filter((id) => !stillSet.has(id));
            if (orphaned.length > 0) {
              await tx.book.updateMany({
                where: { id: { in: orphaned }, [flag]: true },
                data: { [flag]: false },
              });
            }
          }
        }
      }
    }, { timeout: 20000 });

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
