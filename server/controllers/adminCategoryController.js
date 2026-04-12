const prisma = require('../config/database');
const { generateSlug } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');

exports.list = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { books: true, children: true } },
        children: {
          orderBy: { displayOrder: 'asc' },
          include: {
            _count: { select: { books: true, children: true } },
            children: {
              orderBy: { displayOrder: 'asc' },
              include: {
                _count: { select: { books: true, children: true } },
                children: {
                  orderBy: { displayOrder: 'asc' },
                  include: { _count: { select: { books: true } } },
                },
              },
            },
          },
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
    // Validate parent exists if provided
    let parentSlug = null;
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { slug: true } });
      if (!parent) return res.status(400).json({ message: 'Parent category not found' });
      parentSlug = parent.slug;
    }
    // Generate parent-aware slug to allow same names under different parents
    let slug = generateSlug(name);
    if (parentSlug) slug = `${parentSlug}-${slug}`;
    const category = await prisma.category.create({
      data: { name: name.trim(), nameAr: nameAr?.trim() || null, slug, description, descriptionAr, parentId: parentId || null, displayOrder: parseInt(displayOrder) || 0, image },
    });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

exports.reorder = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ message: 'orderedIds must be an array' });
    await Promise.all(
      orderedIds.map((id, index) => prisma.category.update({ where: { id }, data: { displayOrder: index } }))
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, nameAr, description, descriptionAr, parentId, displayOrder, isActive, detailFields, customFields } = req.body;
    const current = await prisma.category.findUnique({ where: { id: req.params.id }, select: { name: true, parentId: true } });
    if (!current) return res.status(404).json({ message: 'Category not found' });

    // Prevent moving a sub-category to top level
    if (current.parentId && (parentId === '' || parentId === null)) {
      return res.status(400).json({ message: 'Cannot move a sub-category to top level' });
    }

    const data = { nameAr: nameAr || null, description: description || null, descriptionAr: descriptionAr || null };
    if (displayOrder !== undefined && displayOrder !== null && displayOrder !== '') {
      data.displayOrder = parseInt(displayOrder);
    }
    // Only update parentId if explicitly provided and not empty
    if (parentId && parentId !== '') data.parentId = parentId;
    if (isActive !== undefined) data.isActive = isActive === 'true' || isActive === true;
    if (name) data.name = name;
    // Regenerate slug when name or parent changes
    if (name || (parentId && parentId !== '')) {
      const finalName = name || current.name;
      const finalParentId = data.parentId || current.parentId;
      let slug = generateSlug(finalName);
      if (finalParentId) {
        const parent = await prisma.category.findUnique({ where: { id: finalParentId }, select: { slug: true } });
        if (parent) slug = `${parent.slug}-${slug}`;
      }
      data.slug = slug;
    }
    if (detailFields !== undefined) data.detailFields = detailFields || null;
    if (customFields !== undefined) data.customFields = customFields || null;
    if (req.file) { data.image = `uploads/categories/${req.file.filename}`; }

    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json(category);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    await prisma.category.delete({ where: { id: req.params.id } });
    // Clean up image file
    if (category.image) {
      const filePath = path.join(__dirname, '..', category.image);
      fs.unlink(filePath, () => {});
    }
    res.json({ message: 'Category deleted.' });
  } catch (error) {
    next(error);
  }
};

exports.bulkAction = async (req, res, next) => {
  try {
    const { ids, action } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No items selected.' });

    switch (action) {
      case 'delete':
        await prisma.category.deleteMany({ where: { id: { in: ids } } });
        break;
      case 'activate':
        await prisma.category.updateMany({ where: { id: { in: ids } }, data: { isActive: true } });
        break;
      case 'deactivate':
        await prisma.category.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
        break;
      default:
        return res.status(400).json({ message: 'Invalid action.' });
    }
    res.json({ message: 'Bulk action completed.', count: ids.length });
  } catch (error) { next(error); }
};
