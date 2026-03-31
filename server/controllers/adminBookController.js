const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');
const { generateSlug } = require('../utils/helpers');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, category } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { titleAr: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { authorAr: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by parent category (includes all sub-categories)
    if (category) {
      const children = await prisma.category.findMany({
        where: { parentId: category },
        select: { id: true },
      });
      const categoryIds = [category, ...children.map((c) => c.id)];
      where.categoryId = { in: categoryIds };
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: { category: { select: { id: true, name: true, nameAr: true, parentId: true } } },
      }),
      prisma.book.count({ where }),
    ]);

    res.json(getPaginatedResponse(books, total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: req.params.id },
      include: { category: true },
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
    data.slug = generateSlug(data.title);
    data.price = data.price ? parseFloat(data.price) : 0;
    if (!data.author) data.author = 'Unknown';
    data.compareAtPrice = data.compareAtPrice ? parseFloat(data.compareAtPrice) : null;
    data.stock = data.stock ? parseInt(data.stock) : 0;
    data.pages = data.pages ? parseInt(data.pages) : null;
    if (!data.isbn || data.isbn === '') delete data.isbn;
    if (!data.categoryId || data.categoryId === '') delete data.categoryId;
    if (data.tags && typeof data.tags === 'string') data.tags = data.tags.split(',').map((t) => t.trim()).filter(Boolean);
    else if (!data.tags) data.tags = [];
    // Clean empty strings
    ['titleAr', 'authorAr', 'description', 'descriptionAr', 'publisher', 'publisherAr', 'brand', 'color', 'material', 'dimensions', 'ageRange'].forEach((f) => {
      if (data[f] === '' || data[f] === undefined) data[f] = null;
    });
    ['isFeatured', 'isBestseller', 'isNewArrival', 'isTrending', 'isComingSoon'].forEach((f) => {
      data[f] = data[f] === 'true' || data[f] === true;
    });

    const book = await prisma.book.create({ data, include: { category: true } });
    res.status(201).json(book);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = req.body;
    if (data.title) data.slug = generateSlug(data.title);
    if (data.price !== undefined) data.price = data.price ? parseFloat(data.price) : 0;
    data.compareAtPrice = data.compareAtPrice ? parseFloat(data.compareAtPrice) : null;
    if (data.stock !== undefined) data.stock = data.stock ? parseInt(data.stock) : 0;
    data.pages = data.pages && data.pages !== '' ? parseInt(data.pages) : null;
    if (data.isbn === '') delete data.isbn;
    if (data.categoryId === '') delete data.categoryId;
    if (typeof data.tags === 'string') data.tags = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    ['titleAr', 'authorAr', 'description', 'descriptionAr', 'publisher', 'publisherAr', 'brand', 'color', 'material', 'dimensions', 'ageRange'].forEach((f) => {
      if (data[f] === '' || data[f] === undefined) data[f] = null;
    });
    ['isFeatured', 'isBestseller', 'isNewArrival', 'isTrending', 'isComingSoon'].forEach((f) => {
      if (data[f] !== undefined) data[f] = data[f] === 'true' || data[f] === true;
    });
    if (data.isActive !== undefined) data.isActive = data.isActive === 'true' || data.isActive === true;

    const book = await prisma.book.update({
      where: { id: req.params.id }, data, include: { category: true },
    });
    res.json(book);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.book.delete({ where: { id: req.params.id } });
    res.json({ message: 'Book deleted.' });
  } catch (error) {
    next(error);
  }
};

exports.uploadCover = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const coverImage = `uploads/covers/${req.file.filename}`;
    const book = await prisma.book.update({
      where: { id: req.params.id }, data: { coverImage },
    });
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
