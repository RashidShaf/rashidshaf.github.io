const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');
const { generateSlug } = require('../utils/helpers');
const { generateVariantsSafe, unlinkWithVariants } = require('../utils/images');
const { normalize, buildSearchIndex } = require('../utils/arabicNormalize');
const fs = require('fs');
const path = require('path');

// Anchor a YYYY-MM-DD string at noon UTC so the calendar date stays the same
// when displayed in any timezone from UTC-11 through UTC+11. `new Date(ymd)`
// alone resolves to UTC midnight, which slips back to the previous day in
// Qatar (UTC+3). Mirrors `toISODateNoonUTC` in the admin form. Pass-through
// for empty / null / Date inputs.
const parseDateNoonUTC = (v) => {
  if (v == null || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const s = String(v).trim();
  if (!s) return null;
  // Already an ISO string with a time component — trust it.
  if (/T\d{2}:\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  // Bare YYYY-MM-DD — anchor at noon UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  // Fallback: let Date parse whatever it can.
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

// Strip empties / coerce a single variant's input into a clean Prisma payload.
const sanitizeVariantInput = (raw) => {
  const numOrNull = (v) => {
    if (v === '' || v == null) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  const strOrNull = (v) => (v == null || v === '' ? null : String(v).trim());

  const out = {
    label: String(raw.label || '').trim(),
    labelAr: strOrNull(raw.labelAr),
    sku: strOrNull(raw.sku),
    price: parseFloat(raw.price) || 0,
    purchasePrice: numOrNull(raw.purchasePrice),
    compareAtPrice: numOrNull(raw.compareAtPrice),
    stock: parseInt(raw.stock, 10) || 0,
    lowStockThreshold: raw.lowStockThreshold != null ? parseInt(raw.lowStockThreshold, 10) || 5 : 5,
    color: strOrNull(raw.color),
    colorAr: strOrNull(raw.colorAr),
    // New per-variant overrides — null means "inherit from base book".
    dimensions: strOrNull(raw.dimensions),
    weight: numOrNull(raw.weight),
    brand: strOrNull(raw.brand),
    brandAr: strOrNull(raw.brandAr),
    material: strOrNull(raw.material),
    materialAr: strOrNull(raw.materialAr),
    ageRange: strOrNull(raw.ageRange),
    // Book-specific per-variant overrides
    author: strOrNull(raw.author),
    authorAr: strOrNull(raw.authorAr),
    publisher: strOrNull(raw.publisher),
    publisherAr: strOrNull(raw.publisherAr),
    isbn: strOrNull(raw.isbn),
    pages: (() => {
      if (raw.pages === '' || raw.pages == null) return null;
      const n = parseInt(raw.pages, 10);
      return Number.isFinite(n) ? n : null;
    })(),
    language: (raw.language === 'en' || raw.language === 'ar') ? raw.language : null,
    publishedDate: parseDateNoonUTC(raw.publishedDate),
    // JSON string shape { [fieldKey]: { value, valueAr } } — pass through;
    // empty/'{}' becomes null so storefront merge defaults to base.
    customFields: (raw.customFields && raw.customFields !== '{}') ? raw.customFields : null,
    image: raw.image || null,
    sortOrder: parseInt(raw.sortOrder, 10) || 0,
    isOutOfStock: raw.isOutOfStock === true || raw.isOutOfStock === 'true',
    isActive: raw.isActive === undefined ? true : (raw.isActive === true || raw.isActive === 'true'),
  };
  return out;
};

// Fail fast on duplicate SKUs WITHIN the submitted form, so the admin sees a
// clean inline error instead of a Postgres unique-violation.
const checkDuplicateSkusInPayload = (variants) => {
  const seen = new Set();
  for (let i = 0; i < variants.length; i++) {
    const sku = variants[i].sku;
    if (!sku) continue;
    const key = sku.toLowerCase();
    if (seen.has(key)) {
      const err = new Error(`Duplicate barcode "${sku}" in variants list.`);
      err.status = 400;
      err.variantIndex = i;
      err.field = 'sku';
      throw err;
    }
    seen.add(key);
  }
};

// Reconcile a book's variants: create new (no id), update matched, delete missing.
// Returns the list of image paths that belonged to deleted variants, so the
// caller can unlink the underlying files outside the transaction.
const reconcileVariants = async (tx, bookId, incoming) => {
  const cleaned = incoming.map(sanitizeVariantInput);
  checkDuplicateSkusInPayload(cleaned);

  // E3 guard: a variant SKU must not collide with any Book.sku, otherwise
  // barcode lookups become ambiguous. Variant<->Variant uniqueness is enforced
  // by the @unique index on ProductVariant.sku and by checkDuplicateSkusInPayload.
  const incomingSkus = cleaned.map((v) => v.sku).filter(Boolean);
  if (incomingSkus.length > 0) {
    const colliding = await tx.book.findFirst({
      where: { sku: { in: incomingSkus, mode: 'insensitive' } },
      select: { id: true, sku: true, title: true },
    });
    if (colliding) {
      const idx = cleaned.findIndex((v) => v.sku && v.sku.toLowerCase() === colliding.sku.toLowerCase());
      const err = new Error(`Barcode "${colliding.sku}" is already used by another product ("${colliding.title}").`);
      err.status = 400;
      err.variantIndex = idx;
      err.field = 'sku';
      throw err;
    }
  }

  const existing = await tx.productVariant.findMany({
    where: { bookId },
    select: { id: true, image: true },
  });
  const existingIds = new Set(existing.map((v) => v.id));
  const existingImageById = new Map(existing.map((v) => [v.id, v.image]));
  const incomingIds = new Set(
    incoming.filter((v) => v.id).map((v) => v.id)
  );

  const toDelete = existing.filter((v) => !incomingIds.has(v.id));
  const orphanImages = toDelete.map((v) => v.image).filter(Boolean);

  if (toDelete.length > 0) {
    await tx.productVariant.deleteMany({
      where: { id: { in: toDelete.map((v) => v.id) } },
    });
  }

  for (let i = 0; i < incoming.length; i++) {
    const data = cleaned[i];
    const id = incoming[i].id;
    if (id && existingIds.has(id)) {
      // If the variant's image path changed, the previous file (and its
      // sized WebP siblings) becomes an orphan — collect for cleanup.
      const prevImage = existingImageById.get(id);
      if (prevImage && prevImage !== data.image) {
        orphanImages.push(prevImage);
      }
      await tx.productVariant.update({ where: { id }, data });
    } else {
      await tx.productVariant.create({ data: { ...data, bookId } });
    }
  }

  return orphanImages;
};

// Best-effort cleanup of image files. For each path, also unlinks the
// auto-generated WebP siblings (-400.webp, -800.webp, -1600.webp) created by
// generateVariantsSafe — otherwise replacing or deleting an image leaks the
// resized copies forever. Errors surface in PM2 logs (non-ENOENT only).
const unlinkImageFiles = (relativePaths) => {
  relativePaths.forEach((rel) => {
    if (!rel) return;
    const abs = path.join(__dirname, '..', rel);
    unlinkWithVariants(abs);
  });
};

const buildBooksWhere = async (query) => {
  const { search, category, hasImage, hasDesc, hasDescAr, duplicateBarcode, similarNames,
    hasBarcode, author, publisher, noAuthor, noPublisher, minPrice, maxPrice, minPurchasePrice, maxPurchasePrice } = query;
  const where = { AND: [] };

  if (search) {
    const normalized = normalize(search);
    if (normalized) {
      where.AND.push({ searchIndex: { contains: normalized } });
    }
  }

  if (category) {
    const collectIds = async (parentIds) => {
      const children = await prisma.category.findMany({ where: { parentId: { in: parentIds } }, select: { id: true } });
      if (children.length === 0) return [];
      const childIds = children.map((c) => c.id);
      const deeper = await collectIds(childIds);
      return [...childIds, ...deeper];
    };
    const categoryIds = [category, ...(await collectIds([category]))];
    where.AND.push({
      OR: [
        { categoryId: { in: categoryIds } },
        { bookCategories: { some: { categoryId: { in: categoryIds } } } },
      ],
    });
  }

  if (hasImage === 'true') where.AND.push({ coverImage: { not: null } });
  if (hasImage === 'false') where.AND.push({ coverImage: null });
  if (hasDesc === 'true') where.AND.push({ description: { not: null } });
  if (hasDesc === 'false') where.AND.push({ OR: [{ description: null }, { description: '' }] });
  if (hasDescAr === 'true') where.AND.push({ descriptionAr: { not: null } });
  if (hasDescAr === 'false') where.AND.push({ OR: [{ descriptionAr: null }, { descriptionAr: '' }] });

  if (hasBarcode === 'true')  where.AND.push({ AND: [{ sku: { not: null } }, { sku: { not: '' } }] });
  if (hasBarcode === 'false') where.AND.push({ OR: [{ sku: null }, { sku: '' }] });

  if (author && author.trim()) where.AND.push({
    OR: [
      { author:   { contains: author.trim(), mode: 'insensitive' } },
      { authorAr: { contains: author.trim(), mode: 'insensitive' } },
    ],
  });
  if (publisher && publisher.trim()) where.AND.push({
    OR: [
      { publisher:   { contains: publisher.trim(), mode: 'insensitive' } },
      { publisherAr: { contains: publisher.trim(), mode: 'insensitive' } },
    ],
  });

  if (noAuthor === '1') where.AND.push({
    OR: [
      { author: '' },
      { authorAr: null },
      { authorAr: '' },
    ],
  });
  if (noPublisher === '1') where.AND.push({
    OR: [
      { publisher: null },
      { publisher: '' },
      { publisherAr: null },
      { publisherAr: '' },
    ],
  });

  const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
  const minP = num(minPrice);
  const maxP = num(maxPrice);
  if (minP !== null) where.AND.push({ price: { gte: minP } });
  if (maxP !== null) where.AND.push({ price: { lte: maxP } });
  const minPP = num(minPurchasePrice);
  const maxPP = num(maxPurchasePrice);
  if (minPP !== null) where.AND.push({ purchasePrice: { gte: minPP } });
  if (maxPP !== null) where.AND.push({ purchasePrice: { lte: maxPP } });

  if (duplicateBarcode === 'true') {
    const dupes = await prisma.$queryRaw`
      SELECT sku FROM books WHERE sku IS NOT NULL AND sku != '' GROUP BY sku HAVING COUNT(*) > 1
    `;
    const dupeSKUs = dupes.map((d) => d.sku);
    where.AND.push(dupeSKUs.length > 0 ? { sku: { in: dupeSKUs } } : { id: 'no-results' });
  }

  if (similarNames === 'true') {
    const allBooks = await prisma.book.findMany({ select: { id: true, title: true } });
    const getWords = (t) => t.toLowerCase().replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '').split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
    const groups = {};
    allBooks.forEach((b) => {
      const key = getWords(b.title);
      if (key.length < 3) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(b.id);
    });
    const similarIds = Object.values(groups).filter((ids) => ids.length > 1).flat();
    where.AND.push(similarIds.length > 0 ? { id: { in: similarIds } } : { id: 'no-results' });
  }

  if (where.AND.length === 0) delete where.AND;
  return where;
};

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { duplicateBarcode, similarNames, withStats } = req.query;
    const where = await buildBooksWhere(req.query);

    let orderBy = { createdAt: 'desc' };
    if (similarNames === 'true') orderBy = { title: 'asc' };
    if (duplicateBarcode === 'true') orderBy = { sku: 'asc' };

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where, orderBy, skip, take: limit,
        include: {
          category: { select: { id: true, name: true, nameAr: true, parentId: true } },
          bookCategories: { include: { category: { select: { id: true, name: true, nameAr: true } } } },
          // Variant count drives the "N options" badge on the products table.
          // Without this, the cell always showed 0.
          _count: { select: { variants: true } },
          // Variants array (slim) drives the expandable sub-rows in the admin
          // Books table. Limited fields keep the payload bounded.
          variants: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true, label: true, labelAr: true, sku: true,
              price: true, stock: true, color: true, image: true,
              isOutOfStock: true, isActive: true,
            },
          },
          // (Note: full variant data — including customFields — is fetched via
          // adminBookController.getById, which the BookEdit page uses.)
        },
      }),
      prisma.book.count({ where }),
    ]);

    let stats = null;
    if (withStats === '1') {
      try {
        const activeConditions = [...(where.AND || []), { isActive: true }];
        const activeWhere = activeConditions.length > 0 ? { AND: activeConditions } : {};
        const lowStockFilterConditions = [...(where.AND || []), { stock: { lte: 100 } }];
        const lowStockFilter = { AND: lowStockFilterConditions };

        const [active, lowStockCandidates] = await Promise.all([
          prisma.book.count({ where: activeWhere }),
          prisma.book.findMany({
            where: lowStockFilter,
            select: { stock: true, lowStockThreshold: true },
          }),
        ]);
        const lowStock = lowStockCandidates.filter((b) => b.stock <= b.lowStockThreshold).length;
        stats = { total, active, lowStock };
      } catch {
        stats = null;
      }
    }

    res.json({ ...getPaginatedResponse(books, total, page, limit), stats });
  } catch (error) {
    next(error);
  }
};

// GET /admin/books/filter-options — returns distinct authors and publishers for the filter
// dropdowns, split by language so the UI can show only the list matching the current admin locale.
exports.filterOptions = async (req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      where: { isActive: true },
      select: { author: true, authorAr: true, publisher: true, publisherAr: true },
    });
    const dedupe = (arr) => Array.from(new Set(arr.filter((s) => s && s.trim()))).sort((a, b) => a.localeCompare(b));
    const authors      = dedupe(books.map((b) => b.author));
    const authorsAr    = dedupe(books.map((b) => b.authorAr));
    const publishers   = dedupe(books.map((b) => b.publisher));
    const publishersAr = dedupe(books.map((b) => b.publisherAr));
    res.json({ authors, authorsAr, publishers, publishersAr });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        bookCategories: { include: { category: { select: { id: true, name: true, nameAr: true } } } },
        variants: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    res.json(book);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = req.body;
    let slug = generateSlug(data.title);
    const existingSlug = await prisma.book.findFirst({ where: { slug } });
    if (existingSlug) slug = `${slug}-${Date.now()}`;
    data.slug = slug;
    data.price = data.price ? parseFloat(data.price) : 0;
    if (!data.author) data.author = '';
    data.compareAtPrice = data.compareAtPrice ? parseFloat(data.compareAtPrice) : null;
    data.stock = data.stock ? parseInt(data.stock) : 0;
    data.pages = data.pages ? parseInt(data.pages) : null;
    data.weight = data.weight ? parseFloat(data.weight) : null;
    const parsedDate = parseDateNoonUTC(data.publishedDate);
    if (parsedDate) {
      data.publishedDate = parsedDate;
    } else {
      delete data.publishedDate;
    }
    if (!data.isbn || data.isbn === '') delete data.isbn;
    if (!data.categoryId || data.categoryId === '') delete data.categoryId;
    if (data.tags && typeof data.tags === 'string') data.tags = data.tags.split(',').map((t) => t.trim()).filter(Boolean);
    else if (!data.tags) data.tags = [];
    // Clean empty strings
    ['titleAr', 'authorAr', 'description', 'descriptionAr', 'publisher', 'publisherAr', 'brand', 'brandAr', 'color', 'colorAr', 'material', 'materialAr', 'dimensions', 'ageRange'].forEach((f) => {
      if (data[f] === '' || data[f] === undefined) data[f] = null;
    });
    ['isFeatured', 'isBestseller', 'isNewArrival', 'isTrending', 'isComingSoon', 'isOutOfStock'].forEach((f) => {
      data[f] = data[f] === 'true' || data[f] === true;
    });
    // Variant flag — coerce to boolean
    data.hasVariants = data.hasVariants === true || data.hasVariants === 'true';

    // E3: book SKU must not collide with any variant SKU
    if (data.sku) {
      const variantCollision = await prisma.productVariant.findFirst({
        where: { sku: { equals: data.sku, mode: 'insensitive' } },
        select: { sku: true },
      });
      if (variantCollision) {
        return res.status(400).json({ message: `Barcode "${data.sku}" is already used by a product variant.` });
      }
    }
    // Handle customFields — keep as JSON string for TEXT column, null if empty
    if (!data.customFields || data.customFields === '{}') data.customFields = null;

    // Extract before creating (not Book fields)
    const additionalCategoryIds = data.additionalCategoryIds;
    const variants = Array.isArray(data.variants) ? data.variants : [];
    delete data.additionalCategoryIds;
    delete data.variants;

    // Defensive: if hasVariants is on but no variants supplied, downgrade to
    // a normal product so the storefront doesn't render a broken empty picker.
    if (data.hasVariants && variants.length === 0) {
      data.hasVariants = false;
    }

    // Compute normalized search index so Arabic/English variants match during search
    data.searchIndex = buildSearchIndex({ ...data, variants });

    const book = await prisma.$transaction(async (tx) => {
      const created = await tx.book.create({ data });

      if (additionalCategoryIds && Array.isArray(additionalCategoryIds) && additionalCategoryIds.length > 0) {
        await tx.bookCategory.createMany({
          data: additionalCategoryIds.map((catId) => ({ bookId: created.id, categoryId: catId })),
        });
      }

      if (data.hasVariants && variants.length > 0) {
        await reconcileVariants(tx, created.id, variants);
      }

      return tx.book.findUnique({
        where: { id: created.id },
        include: {
          category: true,
          bookCategories: { include: { category: { select: { id: true, name: true, nameAr: true } } } },
          variants: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });

    res.status(201).json(book);
  } catch (error) {
    if (error.status === 400 && error.field === 'sku') {
      return res.status(400).json({
        message: error.message,
        variantErrors: [{ index: error.variantIndex, field: 'sku', message: error.message }],
      });
    }
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = req.body;
    if (data.title) {
      let slug = generateSlug(data.title);
      const existingSlug = await prisma.book.findFirst({ where: { slug, id: { not: req.params.id } } });
      if (existingSlug) slug = `${slug}-${Date.now()}`;
      data.slug = slug;
    }
    if (data.price !== undefined) data.price = data.price ? parseFloat(data.price) : 0;
    data.compareAtPrice = data.compareAtPrice ? parseFloat(data.compareAtPrice) : null;
    if (data.stock !== undefined) data.stock = data.stock ? parseInt(data.stock) : 0;
    data.pages = data.pages && data.pages !== '' ? parseInt(data.pages) : null;
    if (data.weight !== undefined) data.weight = data.weight ? parseFloat(data.weight) : null;
    if (data.publishedDate !== undefined) {
      data.publishedDate = parseDateNoonUTC(data.publishedDate);
    }
    if (data.isbn === '') delete data.isbn;
    if (data.categoryId === '') delete data.categoryId;
    if (typeof data.tags === 'string') data.tags = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    ['titleAr', 'authorAr', 'description', 'descriptionAr', 'publisher', 'publisherAr', 'brand', 'brandAr', 'color', 'colorAr', 'material', 'materialAr', 'dimensions', 'ageRange'].forEach((f) => {
      if (data[f] === '' || data[f] === undefined) data[f] = null;
    });
    ['isFeatured', 'isBestseller', 'isNewArrival', 'isTrending', 'isComingSoon', 'isOutOfStock'].forEach((f) => {
      if (data[f] !== undefined) data[f] = data[f] === 'true' || data[f] === true;
    });
    if (data.isActive !== undefined) data.isActive = data.isActive === 'true' || data.isActive === true;
    if (data.hasVariants !== undefined) data.hasVariants = data.hasVariants === true || data.hasVariants === 'true';

    // E3: book SKU must not collide with any variant SKU (own variants excluded
    // from the lookup since they'll be reconciled in this same request)
    if (data.sku) {
      const variantCollision = await prisma.productVariant.findFirst({
        where: {
          sku: { equals: data.sku, mode: 'insensitive' },
          bookId: { not: req.params.id },
        },
        select: { sku: true },
      });
      if (variantCollision) {
        return res.status(400).json({ message: `Barcode "${data.sku}" is already used by a product variant.` });
      }
    }
    if (data.customFields && typeof data.customFields === 'string') {
      // Keep as string for TEXT column
    } else if (data.customFields === '' || data.customFields === undefined) {
      delete data.customFields;
    }

    // Extract before updating (not Book fields)
    const additionalCategoryIds = data.additionalCategoryIds;
    const variantsPayload = data.variants;
    delete data.additionalCategoryIds;
    delete data.variants;

    // Defensive: if the payload says hasVariants=true with an empty variants
    // array, downgrade to a normal product. Same guard as the create path.
    if (data.hasVariants === true && Array.isArray(variantsPayload) && variantsPayload.length === 0) {
      data.hasVariants = false;
    }

    // Fetch current state so we can
    //   (a) rebuild searchIndex from merged old + new field values + variants
    //   (b) only delete Home Layout picks when a section flag TRANSITIONED true → false
    // Include the existing variants so a non-variant field update (e.g. title)
    // doesn't silently drop variant SKUs/labels from the search index.
    const existing = await prisma.book.findUnique({
      where: { id: req.params.id },
      select: {
        title: true, titleAr: true, author: true, authorAr: true, publisher: true, publisherAr: true, isbn: true, sku: true,
        isFeatured: true, isBestseller: true, isNewArrival: true, isTrending: true, isComingSoon: true,
        hasVariants: true,
        variants: { select: { sku: true, label: true, labelAr: true, color: true, colorAr: true } },
      },
    });

    // Rebuild searchIndex when any searchable field OR variants change.
    // When the payload doesn't include a variants array, fall back to the
    // existing variants so we don't strip them from the index.
    const searchFields = ['title', 'titleAr', 'author', 'authorAr', 'publisher', 'publisherAr', 'isbn', 'sku'];
    const variantsArray = Array.isArray(variantsPayload) ? variantsPayload : null;
    if (searchFields.some((f) => f in data) || variantsArray) {
      const variantsForIndex = variantsArray !== null ? variantsArray : (existing?.variants || []);
      data.searchIndex = buildSearchIndex({ ...existing, ...data, variants: variantsForIndex });
    }

    // Determine which section picks to delete based on flag TRANSITIONS (true → false).
    const FLAG_TO_SECTION = {
      isFeatured:    'featured',
      isBestseller:  'bestsellers',
      isNewArrival:  'newArrivals',
      isTrending:    'trending',
      isComingSoon:  'comingSoon',
    };
    const picksToDelete = [];
    for (const [flagName, sectionType] of Object.entries(FLAG_TO_SECTION)) {
      if (flagName in data && existing?.[flagName] === true && data[flagName] === false) {
        picksToDelete.push(sectionType);
      }
    }

    // Atomic: book update + variant reconciliation + section pick cleanup.
    const orphanImages = await prisma.$transaction(async (tx) => {
      await tx.book.update({ where: { id: req.params.id }, data });

      let orphans = [];
      if (variantsArray !== null) {
        orphans = await reconcileVariants(tx, req.params.id, variantsArray);
      }

      for (const sectionType of picksToDelete) {
        await tx.homeSectionProduct.deleteMany({
          where: { bookId: req.params.id, sectionType },
        });
      }

      if (additionalCategoryIds !== undefined) {
        await tx.bookCategory.deleteMany({ where: { bookId: req.params.id } });
        if (Array.isArray(additionalCategoryIds) && additionalCategoryIds.length > 0) {
          await tx.bookCategory.createMany({
            data: additionalCategoryIds.map((catId) => ({ bookId: req.params.id, categoryId: catId })),
          });
        }
      }

      return orphans;
    });

    // Best-effort cleanup of variant image files outside the transaction
    unlinkImageFiles(orphanImages);

    const book = await prisma.book.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        bookCategories: { include: { category: { select: { id: true, name: true, nameAr: true } } } },
        variants: { orderBy: { sortOrder: 'asc' } },
      },
    });

    res.json(book);
  } catch (error) {
    if (error.status === 400 && error.field === 'sku') {
      return res.status(400).json({
        message: error.message,
        variantErrors: [{ index: error.variantIndex, field: 'sku', message: error.message }],
      });
    }
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: req.params.id },
      include: { variants: { select: { image: true } } },
    });
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    await prisma.book.delete({ where: { id: req.params.id } });
    // Clean up image files (book + variant images)
    const filesToDelete = [
      book.coverImage,
      ...(book.images || []),
      ...book.variants.map((v) => v.image),
    ];
    unlinkImageFiles(filesToDelete);
    res.json({ message: 'Book deleted.' });
  } catch (error) {
    next(error);
  }
};

exports.uploadCover = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    // Fetch current book to get old cover path
    const existingBook = await prisma.book.findUnique({
      where: { id: req.params.id },
      select: { coverImage: true },
    });
    if (!existingBook) {
      // Book deleted between page load and save — clean up the multer-written
      // file so it doesn't become an orphan, then 404.
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: 'Book not found.' });
    }

    const coverImage = `uploads/covers/${req.file.filename}`;
    let book;
    try {
      book = await prisma.book.update({
        where: { id: req.params.id }, data: { coverImage },
      });
    } catch (err) {
      // Race: book row vanished between findUnique and update. Don't leak the
      // upload — the file is already on disk via multer, but no DB record
      // will reference it.
      fs.unlink(req.file.path, () => {});
      if (err && err.code === 'P2025') {
        return res.status(404).json({ message: 'Book no longer exists.' });
      }
      throw err;
    }

    // Delete old cover file (and its sized WebP siblings) if it exists
    if (existingBook?.coverImage && existingBook.coverImage !== coverImage) {
      unlinkImageFiles([existingBook.coverImage]);
    }

    // Generate responsive WebP variants (best-effort, non-blocking for response)
    await generateVariantsSafe(req.file.path);

    res.json({ coverImage: book.coverImage });
  } catch (error) {
    next(error);
  }
};

// DELETE /admin/books/:id/cover — removes cover from DB and disk (incl. sized
// WebP siblings). Used by the admin Edit form's "X" button on the cover preview
// when the admin wants to clear the cover without replacing it.
exports.removeCover = async (req, res, next) => {
  try {
    const existing = await prisma.book.findUnique({
      where: { id: req.params.id },
      select: { coverImage: true },
    });
    if (!existing) return res.status(404).json({ message: 'Book not found.' });

    if (existing.coverImage) {
      await prisma.book.update({
        where: { id: req.params.id },
        data: { coverImage: null },
      });
      unlinkImageFiles([existing.coverImage]);
    }

    res.json({ coverImage: null });
  } catch (error) {
    next(error);
  }
};

exports.uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded.' });
    const book = await prisma.book.findUnique({ where: { id: req.params.id }, select: { images: true } });
    if (!book) {
      // Book vanished between page load and save — clean up multer files.
      req.files.forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(404).json({ message: 'Book not found.' });
    }

    const newImages = req.files.map((f) => `uploads/covers/${f.filename}`);
    const merged = [...(book.images || []), ...newImages];
    const images = merged.slice(0, 3);
    const dropped = merged.slice(3); // anything beyond the cap — never persisted

    let updated;
    try {
      updated = await prisma.book.update({
        where: { id: req.params.id }, data: { images },
      });
    } catch (err) {
      // Race or other Prisma failure — clean up everything we just wrote.
      req.files.forEach((f) => fs.unlink(f.path, () => {}));
      if (err && err.code === 'P2025') {
        return res.status(404).json({ message: 'Book no longer exists.' });
      }
      throw err;
    }

    // Drop any over-cap files (`.slice(0, 3)` would otherwise leak them as orphans)
    if (dropped.length > 0) {
      unlinkImageFiles(dropped);
    }

    // Generate variants only for files we actually kept.
    const keptFiles = req.files.filter((f) => images.includes(`uploads/covers/${f.filename}`));
    await Promise.all(keptFiles.map((f) => generateVariantsSafe(f.path)));

    res.json({ images: updated.images });
  } catch (error) {
    next(error);
  }
};

exports.deleteImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    const book = await prisma.book.findUnique({ where: { id: req.params.id }, select: { images: true } });
    const before = book?.images || [];
    const images = before.filter((img) => img !== imageUrl);
    await prisma.book.update({ where: { id: req.params.id }, data: { images } });
    // Only unlink if the image was actually in the set (defensive against bad input)
    if (imageUrl && before.includes(imageUrl)) {
      unlinkImageFiles([imageUrl]);
    }
    res.json({ images });
  } catch (error) {
    next(error);
  }
};

exports.uploadVariantImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const { id: bookId, variantId } = req.params;

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, bookId: true, image: true },
    });
    if (!variant || variant.bookId !== bookId) {
      // Don't leak the orphan upload — clean up immediately
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: 'Variant not found for this book.' });
    }

    const image = `uploads/covers/${req.file.filename}`;
    let updated;
    try {
      updated = await prisma.productVariant.update({
        where: { id: variantId },
        data: { image },
      });
    } catch (err) {
      // Race condition: another request deleted the variant between findUnique
      // and update. Translate Prisma's RecordNotFound (P2025) to a clean 404
      // instead of leaking a 500. Also clean up the orphaned upload.
      if (err && err.code === 'P2025') {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ message: 'Variant no longer exists.' });
      }
      throw err;
    }

    // Delete the previous variant image file
    if (variant.image) {
      unlinkImageFiles([variant.image]);
    }

    await generateVariantsSafe(req.file.path);
    res.json({ image: updated.image, variantId });
  } catch (error) {
    next(error);
  }
};

// PATCH /admin/books/:bookId/variants/:variantId
// Whitelisted body: { isOutOfStock?, isActive? }. Used by inline toggles in
// the admin Books table. Verifies the variant belongs to the URL book id —
// closes the cross-book IDOR window where an admin URL-tampers another book's
// variant id.
exports.patchVariant = async (req, res, next) => {
  try {
    const { id: bookId, variantId } = req.params;
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, bookId: true },
    });
    if (!variant || variant.bookId !== bookId) {
      return res.status(404).json({ message: 'Variant not found for this book.' });
    }

    const data = {};
    if (typeof req.body.isOutOfStock === 'boolean') data.isOutOfStock = req.body.isOutOfStock;
    if (typeof req.body.isActive === 'boolean') data.isActive = req.body.isActive;
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    let updated;
    try {
      updated = await prisma.productVariant.update({
        where: { id: variantId },
        data,
        select: {
          id: true, label: true, labelAr: true, sku: true,
          price: true, stock: true, color: true, image: true,
          isOutOfStock: true, isActive: true,
        },
      });
    } catch (err) {
      if (err && err.code === 'P2025') {
        return res.status(404).json({ message: 'Variant no longer exists.' });
      }
      throw err;
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.bulkAction = async (req, res, next) => {
  try {
    const { ids, action, categoryId } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No items selected.' });

    switch (action) {
      case 'delete':
        await prisma.book.deleteMany({ where: { id: { in: ids } } });
        break;
      case 'activate':
        await prisma.book.updateMany({ where: { id: { in: ids } }, data: { isActive: true } });
        break;
      case 'deactivate':
        await prisma.book.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
        break;
      case 'moveCategory': {
        if (!categoryId) return res.status(400).json({ message: 'Category ID required.' });
        // Set primary category
        await prisma.book.updateMany({ where: { id: { in: ids } }, data: { categoryId } });
        // Replace additional categories
        const additionalCategoryIds = req.body.additionalCategoryIds || [];
        if (additionalCategoryIds.length > 0) {
          // Remove old additional categories for these books
          await prisma.bookCategory.deleteMany({ where: { bookId: { in: ids } } });
          // Add new additional categories
          const records = ids.flatMap(bookId => additionalCategoryIds.map(catId => ({ bookId, categoryId: catId })));
          await prisma.bookCategory.createMany({ data: records, skipDuplicates: true });
        } else {
          // No additional categories — just clear old ones
          await prisma.bookCategory.deleteMany({ where: { bookId: { in: ids } } });
        }
        break;
      }
      case 'markInStock':
        await prisma.book.updateMany({ where: { id: { in: ids } }, data: { isOutOfStock: false } });
        await prisma.productVariant.updateMany({ where: { bookId: { in: ids } }, data: { isOutOfStock: false } });
        break;
      case 'markOutOfStock':
        await prisma.book.updateMany({ where: { id: { in: ids } }, data: { isOutOfStock: true } });
        await prisma.productVariant.updateMany({ where: { bookId: { in: ids } }, data: { isOutOfStock: true } });
        break;
      case 'setSection': {
        const sectionData = {};
        ['isFeatured','isBestseller','isNewArrival','isTrending','isComingSoon'].forEach(f => {
          if (req.body[f] !== undefined) sectionData[f] = req.body[f] === true || req.body[f] === 'true';
        });
        if (Object.keys(sectionData).length > 0) {
          await prisma.book.updateMany({ where: { id: { in: ids } }, data: sectionData });
        }
        break;
      }
      case 'setPublisher': {
        if (!req.body.publisher && !req.body.publisherAr) return res.status(400).json({ message: 'Publisher required.' });
        const pubData = {};
        if (req.body.publisher) pubData.publisher = req.body.publisher;
        if (req.body.publisherAr) pubData.publisherAr = req.body.publisherAr;
        await prisma.book.updateMany({ where: { id: { in: ids } }, data: pubData });
        break;
      }
      case 'setAuthor': {
        if (!req.body.author && !req.body.authorAr) return res.status(400).json({ message: 'Author required.' });
        const authData = {};
        if (req.body.author) authData.author = req.body.author;
        if (req.body.authorAr) authData.authorAr = req.body.authorAr;
        await prisma.book.updateMany({ where: { id: { in: ids } }, data: authData });
        break;
      }
      case 'setBrand': {
        if (!req.body.brand && !req.body.brandAr) return res.status(400).json({ message: 'Brand required.' });
        const brandData = {};
        if (req.body.brand) brandData.brand = req.body.brand;
        if (req.body.brandAr) brandData.brandAr = req.body.brandAr;
        await prisma.book.updateMany({ where: { id: { in: ids } }, data: brandData });
        break;
      }
      case 'setColor': {
        if (!req.body.color && !req.body.colorAr) return res.status(400).json({ message: 'Color required.' });
        const colorData = {};
        if (req.body.color) colorData.color = req.body.color;
        if (req.body.colorAr) colorData.colorAr = req.body.colorAr;
        await prisma.book.updateMany({ where: { id: { in: ids } }, data: colorData });
        break;
      }
      case 'setMaterial': {
        if (!req.body.material && !req.body.materialAr) return res.status(400).json({ message: 'Material required.' });
        const matData = {};
        if (req.body.material) matData.material = req.body.material;
        if (req.body.materialAr) matData.materialAr = req.body.materialAr;
        await prisma.book.updateMany({ where: { id: { in: ids } }, data: matData });
        break;
      }
      case 'setCustomField': {
        const { fieldKey, value, valueAr } = req.body;
        if (!fieldKey || (!value && !valueAr)) return res.status(400).json({ message: 'Field value required.' });
        const books = await prisma.book.findMany({ where: { id: { in: ids } }, select: { id: true, customFields: true } });
        await Promise.all(books.map((book) => {
          let cf = {};
          if (book.customFields) { try { cf = JSON.parse(book.customFields); } catch {} }
          cf[fieldKey] = { ...cf[fieldKey] };
          if (value) cf[fieldKey].value = value;
          if (valueAr) cf[fieldKey].valueAr = valueAr;
          return prisma.book.update({ where: { id: book.id }, data: { customFields: JSON.stringify(cf) } });
        }));
        break;
      }
      default:
        return res.status(400).json({ message: 'Invalid action.' });
    }
    res.json({ message: 'Bulk action completed.', count: ids.length });
  } catch (error) { next(error); }
};
