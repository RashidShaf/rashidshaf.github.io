const prisma = require('../config/database');
const { generateSlug } = require('../utils/helpers');
const { generateVariantsSafe, unlinkWithVariants } = require('../utils/images');
const fs = require('fs');
const path = require('path');

// Best-effort cleanup of a DB-stored category image path. Resolves to absolute
// and unlinks both the base file and its DEFAULT_WIDTHS WebP siblings.
const unlinkCategoryImage = (rel) => {
  if (!rel) return;
  const abs = path.join(__dirname, '..', rel);
  unlinkWithVariants(abs);
};

exports.list = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { books: true, children: true, bookCategories: true } },
        children: {
          orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            _count: { select: { books: true, children: true, bookCategories: true } },
            children: {
              orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
              include: {
                _count: { select: { books: true, children: true, bookCategories: true } },
                children: {
                  orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
                  include: { _count: { select: { books: true, bookCategories: true } } },
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
    const dropUpload = () => { if (req.file?.path) fs.unlink(req.file.path, () => {}); };
    if (!name || !name.trim()) { dropUpload(); return res.status(400).json({ message: 'Name is required' }); }
    if (name.length > 200) { dropUpload(); return res.status(400).json({ message: 'Name must be under 200 characters' }); }
    const image = req.file ? `uploads/categories/${req.file.filename}` : null;
    // Validate parent exists if provided
    let parentSlug = null;
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { slug: true } });
      if (!parent) { dropUpload(); return res.status(400).json({ message: 'Parent category not found' }); }
      parentSlug = parent.slug;
    }
    // Generate parent-aware slug to allow same names under different parents
    let slug = generateSlug(name);
    if (parentSlug) slug = `${parentSlug}-${slug}`;
    let category;
    try {
      category = await prisma.category.create({
        data: { name: name.trim(), nameAr: nameAr?.trim() || null, slug, description, descriptionAr, parentId: parentId || null, displayOrder: parseInt(displayOrder) || 0, image },
      });
    } catch (err) {
      dropUpload();
      throw err;
    }
    if (req.file) await generateVariantsSafe(req.file.path);
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
    const current = await prisma.category.findUnique({ where: { id: req.params.id }, select: { name: true, parentId: true, image: true } });
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

    let category;
    try {
      category = await prisma.category.update({ where: { id: req.params.id }, data });
    } catch (err) {
      // DB update failed — if multer wrote a new file, drop it so it doesn't orphan.
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      throw err;
    }
    if (req.file) {
      // DB committed — replace the old image (base + variants) with the new one.
      if (current.image && current.image !== data.image) {
        unlinkCategoryImage(current.image);
      }
      await generateVariantsSafe(req.file.path);
    }
    res.json(category);
  } catch (error) {
    next(error);
  }
};

// Recursively collect all descendant category IDs
const collectDescendantIds = async (parentIds) => {
  if (parentIds.length === 0) return [];
  const children = await prisma.category.findMany({ where: { parentId: { in: parentIds } }, select: { id: true } });
  if (children.length === 0) return [];
  const childIds = children.map((c) => c.id);
  const deeper = await collectDescendantIds(childIds);
  return [...childIds, ...deeper];
};

exports.remove = async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    // Delete all descendants first, then the category itself
    const descendantIds = await collectDescendantIds([req.params.id]);
    const allIds = [req.params.id, ...descendantIds];

    // Snapshot every image path BEFORE deletion so we can unlink afterwards.
    const allCats = await prisma.category.findMany({
      where: { id: { in: allIds } },
      select: { image: true, placeholderImage: true },
    });

    if (descendantIds.length > 0) {
      await prisma.category.deleteMany({ where: { id: { in: descendantIds } } });
    }
    await prisma.category.delete({ where: { id: req.params.id } });

    // Clean up image files (base + sized variants) for every removed row.
    for (const c of allCats) {
      unlinkCategoryImage(c.image);
      unlinkCategoryImage(c.placeholderImage);
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
      case 'delete': {
        // Collect all descendants of selected categories
        const descendantIds = await collectDescendantIds(ids);
        const allIds = [...new Set([...ids, ...descendantIds])];
        // Snapshot image paths for every row we're about to delete.
        const allCats = await prisma.category.findMany({
          where: { id: { in: allIds } },
          select: { image: true, placeholderImage: true },
        });
        await prisma.category.deleteMany({ where: { id: { in: allIds } } });
        for (const c of allCats) {
          unlinkCategoryImage(c.image);
          unlinkCategoryImage(c.placeholderImage);
        }
        break;
      }
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

exports.uploadPlaceholder = async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!category) {
      // Row vanished — clean up the just-uploaded multer file so it doesn't orphan.
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: 'Category not found.' });
    }
    if (!req.file) return res.status(400).json({ message: 'Image is required.' });

    const placeholderImage = `uploads/categories/${req.file.filename}`;
    let updated;
    try {
      updated = await prisma.category.update({ where: { id: req.params.id }, data: { placeholderImage } });
    } catch (err) {
      // DB update failed — drop the new file so it doesn't orphan, leave old one intact.
      fs.unlink(req.file.path, () => {});
      throw err;
    }
    // DB committed — safe to remove the previous placeholder file + variants.
    if (category.placeholderImage && category.placeholderImage !== placeholderImage) {
      unlinkCategoryImage(category.placeholderImage);
    }
    await generateVariantsSafe(req.file.path);
    res.json(updated);
  } catch (error) { next(error); }
};

// DELETE /admin/categories/:id/image — clears the category hero `image` from
// DB and unlinks the file + sized variants. Admin-only. Used by the X button
// on the category edit form when admin wants to clear without replacing.
exports.removeImage = async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!category) return res.status(404).json({ message: 'Category not found.' });

    if (category.image) {
      await prisma.category.update({ where: { id: req.params.id }, data: { image: null } });
      // DB committed first — only THEN remove the file + sized variants.
      unlinkCategoryImage(category.image);
    }
    res.json({ message: 'Image removed.' });
  } catch (error) { next(error); }
};

exports.removePlaceholder = async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!category) return res.status(404).json({ message: 'Category not found.' });

    if (category.placeholderImage) {
      await prisma.category.update({ where: { id: req.params.id }, data: { placeholderImage: null } });
      // DB committed first — only THEN remove the file + sized variants.
      unlinkCategoryImage(category.placeholderImage);
    }
    res.json({ message: 'Placeholder removed.' });
  } catch (error) { next(error); }
};
