const prisma = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { books: { where: { isActive: true } } } },
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            _count: { select: { books: { where: { isActive: true } } } },
            children: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' },
              include: {
                _count: { select: { books: { where: { isActive: true } } } },
                children: {
                  where: { isActive: true },
                  orderBy: { displayOrder: 'asc' },
                  include: {
                    _count: { select: { books: { where: { isActive: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Only return top-level categories (no parent)
    const topLevel = categories.filter((c) => !c.parentId);

    res.json(topLevel);
  } catch (error) {
    next(error);
  }
};

exports.getBySlug = async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug, isActive: true },
      include: {
        _count: { select: { books: { where: { isActive: true } } } },
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    res.json(category);
  } catch (error) {
    next(error);
  }
};

exports.getFilters = async (req, res, next) => {
  const FILTERABLE_KEYS = ['author', 'publisher', 'language', 'brand', 'color', 'material'];
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, detailFields: true },
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    let fields = [];
    if (category.detailFields) {
      try { fields = JSON.parse(category.detailFields); } catch {}
    }

    const filters = fields
      .filter((key) => FILTERABLE_KEYS.includes(key))
      .map((key, i) => ({ fieldKey: key, displayOrder: i }));

    res.json(filters);
  } catch (error) {
    next(error);
  }
};
