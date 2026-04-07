const prisma = require('../config/database');

// GET /api/admin/categories/:categoryId/filters
exports.list = async (req, res, next) => {
  try {
    const filters = await prisma.categoryFilter.findMany({
      where: { categoryId: req.params.categoryId },
      orderBy: { displayOrder: 'asc' },
    });
    res.json(filters);
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/categories/:categoryId/filters
exports.create = async (req, res, next) => {
  try {
    const { name, nameAr, fieldKey, displayOrder, isActive } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });
    if (!fieldKey || !fieldKey.trim()) return res.status(400).json({ message: 'Field key is required' });

    const filter = await prisma.categoryFilter.create({
      data: {
        categoryId: req.params.categoryId,
        name: name.trim(),
        nameAr: nameAr?.trim() || null,
        fieldKey: fieldKey.trim(),
        displayOrder: parseInt(displayOrder) || 0,
        isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true,
      },
    });
    res.status(201).json(filter);
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/category-filters/:id
exports.update = async (req, res, next) => {
  try {
    const existing = await prisma.categoryFilter.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Filter not found.' });

    const { name, nameAr, fieldKey, displayOrder, isActive } = req.body;
    const data = {};

    if (name !== undefined) data.name = name.trim();
    if (nameAr !== undefined) data.nameAr = nameAr?.trim() || null;
    if (fieldKey !== undefined) data.fieldKey = fieldKey.trim();
    if (displayOrder !== undefined) data.displayOrder = parseInt(displayOrder) || 0;
    if (isActive !== undefined) data.isActive = isActive === 'true' || isActive === true;

    const filter = await prisma.categoryFilter.update({ where: { id: req.params.id }, data });
    res.json(filter);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/category-filters/:id
exports.remove = async (req, res, next) => {
  try {
    const existing = await prisma.categoryFilter.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Filter not found.' });

    await prisma.categoryFilter.delete({ where: { id: req.params.id } });
    res.json({ message: 'Filter deleted.' });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/categories/:categoryId/filters/reorder
exports.reorder = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: 'ids must be an array' });

    const updates = ids.map((id, index) =>
      prisma.categoryFilter.update({ where: { id }, data: { displayOrder: index } })
    );
    await prisma.$transaction(updates);
    res.json({ message: 'Filters reordered.' });
  } catch (error) {
    next(error);
  }
};
