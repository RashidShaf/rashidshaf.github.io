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
      select: { id: true, detailFields: true, customFields: true },
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    let detailArr = [];
    let filterArr = [];
    if (category.detailFields) {
      try {
        const parsed = JSON.parse(category.detailFields);
        if (Array.isArray(parsed)) {
          // Old format: array of keys — all filterable keys are filters
          detailArr = parsed;
          filterArr = parsed.filter((k) => FILTERABLE_KEYS.includes(k) || k.startsWith('cf_'));
        } else if (parsed.detail) {
          // New format: { detail: [...], filters: [...] }
          detailArr = parsed.detail;
          filterArr = parsed.filters || [];
        }
      } catch {}
    }

    const filters = filterArr
      .filter((key) => FILTERABLE_KEYS.includes(key))
      .map((key, i) => ({ fieldKey: key, displayOrder: i }));

    // Add custom fields as filters (only if in filterArr)
    let cfDefs = [];
    if (category.customFields) {
      try { cfDefs = JSON.parse(category.customFields); } catch {}
    }
    cfDefs.forEach((cf, i) => {
      const cfKey = `cf_${cf.key}`;
      if (filterArr.includes(cfKey)) {
        filters.push({ fieldKey: cfKey, displayOrder: filters.length + i, name: cf.name, nameAr: cf.nameAr });
      }
    });

    res.json(filters);
  } catch (error) {
    next(error);
  }
};
