const prisma = require('../config/database');
const { generateSlug } = require('../utils/helpers');

exports.create = async (req, res, next) => {
  try {
    const { name, nameAr, description, descriptionAr, parentId, displayOrder } = req.body;
    const image = req.file ? `uploads/categories/${req.file.filename}` : null;
    const category = await prisma.category.create({
      data: { name, nameAr, slug: generateSlug(name), description, descriptionAr, parentId, displayOrder: displayOrder || 0, image },
    });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, nameAr, description, descriptionAr, parentId, displayOrder, isActive } = req.body;
    const data = { nameAr, description, descriptionAr, parentId, displayOrder };
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
