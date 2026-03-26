const prisma = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const lists = await prisma.readingList.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
    res.json(lists);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, nameAr, description, isPublic } = req.body;
    const list = await prisma.readingList.create({
      data: { userId: req.user.id, name, nameAr, description, isPublic: isPublic || false },
    });
    res.status(201).json(list);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const list = await prisma.readingList.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
          include: {
            book: {
              select: {
                id: true, title: true, titleAr: true, slug: true, author: true, authorAr: true,
                price: true, coverImage: true, format: true, averageRating: true,
                category: { select: { name: true, nameAr: true, slug: true } },
              },
            },
          },
        },
      },
    });

    if (!list) return res.status(404).json({ message: 'Reading list not found.' });
    if (!list.isPublic && list.userId !== req.user?.id) {
      return res.status(403).json({ message: 'This list is private.' });
    }

    res.json(list);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const list = await prisma.readingList.findUnique({ where: { id: req.params.id } });
    if (!list || list.userId !== req.user.id) {
      return res.status(404).json({ message: 'Reading list not found.' });
    }

    const { name, nameAr, description, isPublic } = req.body;
    const updated = await prisma.readingList.update({
      where: { id: req.params.id },
      data: { name, nameAr, description, isPublic },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const list = await prisma.readingList.findUnique({ where: { id: req.params.id } });
    if (!list || list.userId !== req.user.id) {
      return res.status(404).json({ message: 'Reading list not found.' });
    }
    await prisma.readingList.delete({ where: { id: req.params.id } });
    res.json({ message: 'Reading list deleted.' });
  } catch (error) {
    next(error);
  }
};

exports.addBook = async (req, res, next) => {
  try {
    const list = await prisma.readingList.findUnique({ where: { id: req.params.id } });
    if (!list || list.userId !== req.user.id) {
      return res.status(404).json({ message: 'Reading list not found.' });
    }

    const count = await prisma.readingListItem.count({ where: { readingListId: req.params.id } });
    const item = await prisma.readingListItem.create({
      data: { readingListId: req.params.id, bookId: req.body.bookId, displayOrder: count },
    });
    res.status(201).json(item);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'Book already in list.' });
    next(error);
  }
};

exports.removeBook = async (req, res, next) => {
  try {
    await prisma.readingListItem.deleteMany({
      where: { readingListId: req.params.id, bookId: req.params.bookId },
    });
    res.json({ message: 'Book removed from list.' });
  } catch (error) {
    next(error);
  }
};
