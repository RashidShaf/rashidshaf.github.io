const prisma = require('../config/database');
const { generateSlug } = require('../utils/helpers');

exports.list = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { books: true, children: true } },
        children: {
          orderBy: { displayOrder: 'asc' },
          include: { _count: { select: { books: true } } },
        },
      },
    });
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, nameAr, description, descriptionAr, parentId, displayOrder } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });
    if (name.length > 200) return res.status(400).json({ message: 'Name must be under 200 characters' });
    const image = req.file ? `uploads/categories/${req.file.filename}` : null;
    const category = await prisma.category.create({
      data: { name: name.trim(), nameAr: nameAr?.trim() || null, slug: generateSlug(name), description, descriptionAr, parentId: parentId || null, displayOrder: parseInt(displayOrder) || 0, image },
    });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, nameAr, description, descriptionAr, parentId, displayOrder, isActive } = req.body;
    const data = { nameAr: nameAr || null, description: description || null, descriptionAr: descriptionAr || null, parentId: parentId || null, displayOrder: parseInt(displayOrder) || 0 };
    if (isActive !== undefined) data.isActive = isActive === 'true' || isActive === true;
    if (name) { data.name = name; data.slug = generateSlug(name); }
    if (req.file) { data.image = `uploads/categories/${req.file.filename}`; }

    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json(category);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ message: 'Category deleted.' });
  } catch (error) {
    next(error);
  }
};
