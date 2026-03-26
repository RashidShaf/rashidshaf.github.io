const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');
const { generateSlug } = require('../utils/helpers');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: { category: { select: { id: true, name: true, nameAr: true } } },
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
    data.price = parseFloat(data.price);
    if (data.compareAtPrice) data.compareAtPrice = parseFloat(data.compareAtPrice);
    if (data.stock) data.stock = parseInt(data.stock);
    if (data.pages) data.pages = parseInt(data.pages);
    if (data.tags && typeof data.tags === 'string') data.tags = data.tags.split(',').map((t) => t.trim());

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
    if (data.price) data.price = parseFloat(data.price);
    if (data.compareAtPrice) data.compareAtPrice = parseFloat(data.compareAtPrice);
    if (data.stock !== undefined) data.stock = parseInt(data.stock);
    if (data.pages) data.pages = parseInt(data.pages);
    if (data.tags && typeof data.tags === 'string') data.tags = data.tags.split(',').map((t) => t.trim());

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
    await prisma.book.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Book deactivated.' });
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
