const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');
const { generateSlug } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');

const buildBooksWhere = async (query) => {
  const { search, category, hasImage, hasDesc, hasDescAr, duplicateBarcode, similarNames } = query;
  const where = { AND: [] };

  if (search) {
    where.AND.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { titleAr: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { authorAr: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ],
    });
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

exports.getById = async (req, res, next) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        bookCategories: { include: { category: { select: { id: true, name: true, nameAr: true } } } },
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
    if (data.publishedDate && typeof data.publishedDate === 'string') {
      data.publishedDate = new Date(data.publishedDate);
    } else if (!data.publishedDate) {
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
    // Handle customFields — keep as JSON string for TEXT column, null if empty
    if (!data.customFields || data.customFields === '{}') data.customFields = null;

    // Extract additionalCategoryIds before creating (not a Book field)
    const additionalCategoryIds = data.additionalCategoryIds;
    delete data.additionalCategoryIds;

    const book = await prisma.book.create({ data, include: { category: true, bookCategories: { include: { category: { select: { id: true, name: true, nameAr: true } } } } } });

    // Create BookCategory records for additional categories
    if (additionalCategoryIds && Array.isArray(additionalCategoryIds) && additionalCategoryIds.length > 0) {
      await prisma.bookCategory.createMany({
        data: additionalCategoryIds.map((catId) => ({ bookId: book.id, categoryId: catId })),
      });
      // Re-fetch to include the new bookCategories
      const updated = await prisma.book.findUnique({
        where: { id: book.id },
        include: { category: true, bookCategories: { include: { category: { select: { id: true, name: true, nameAr: true } } } } },
      });
      return res.status(201).json(updated);
    }

    res.status(201).json(book);
  } catch (error) {
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
      data.publishedDate = data.publishedDate ? new Date(data.publishedDate) : null;
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
    if (data.customFields && typeof data.customFields === 'string') {
      // Keep as string for TEXT column
    } else if (data.customFields === '' || data.customFields === undefined) {
      delete data.customFields;
    }

    // Extract additionalCategoryIds before updating (not a Book field)
    const additionalCategoryIds = data.additionalCategoryIds;
    delete data.additionalCategoryIds;

    const book = await prisma.book.update({
      where: { id: req.params.id }, data, include: { category: true, bookCategories: { include: { category: { select: { id: true, name: true, nameAr: true } } } } },
    });

    // Update BookCategory records if additionalCategoryIds provided
    if (additionalCategoryIds !== undefined) {
      await prisma.bookCategory.deleteMany({ where: { bookId: req.params.id } });
      if (Array.isArray(additionalCategoryIds) && additionalCategoryIds.length > 0) {
        await prisma.bookCategory.createMany({
          data: additionalCategoryIds.map((catId) => ({ bookId: req.params.id, categoryId: catId })),
        });
      }
      // Re-fetch to include updated bookCategories
      const updated = await prisma.book.findUnique({
        where: { id: req.params.id },
        include: { category: true, bookCategories: { include: { category: { select: { id: true, name: true, nameAr: true } } } } },
      });
      return res.json(updated);
    }

    res.json(book);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const book = await prisma.book.findUnique({ where: { id: req.params.id } });
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    await prisma.book.delete({ where: { id: req.params.id } });
    // Clean up image files
    const filesToDelete = [book.coverImage, ...(book.images || [])];
    filesToDelete.forEach((img) => {
      if (img) {
        const filePath = path.join(__dirname, '..', img);
        fs.unlink(filePath, () => {});
      }
    });
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

    const coverImage = `uploads/covers/${req.file.filename}`;
    const book = await prisma.book.update({
      where: { id: req.params.id }, data: { coverImage },
    });

    // Delete old cover file if it exists
    if (existingBook?.coverImage) {
      const oldPath = path.join(__dirname, '..', existingBook.coverImage);
      fs.unlink(oldPath, () => {});
    }

    res.json({ coverImage: book.coverImage });
  } catch (error) {
    next(error);
  }
};

exports.uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded.' });
    const newImages = req.files.map((f) => `uploads/covers/${f.filename}`);
    const book = await prisma.book.findUnique({ where: { id: req.params.id }, select: { images: true } });
    const images = [...(book?.images || []), ...newImages].slice(0, 3);
    const updated = await prisma.book.update({
      where: { id: req.params.id }, data: { images },
    });
    res.json({ images: updated.images });
  } catch (error) {
    next(error);
  }
};

exports.deleteImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    const book = await prisma.book.findUnique({ where: { id: req.params.id }, select: { images: true } });
    const images = (book?.images || []).filter((img) => img !== imageUrl);
    await prisma.book.update({ where: { id: req.params.id }, data: { images } });
    res.json({ images });
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
        break;
      case 'markOutOfStock':
        await prisma.book.updateMany({ where: { id: { in: ids } }, data: { isOutOfStock: true } });
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
