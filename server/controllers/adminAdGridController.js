const prisma = require('../config/database');
const { generateVariantsSafe } = require('../utils/images');
const fs = require('fs');
const path = require('path');

const TILE_INCLUDE = {
  book: { select: { id: true, slug: true, title: true, titleAr: true, coverImage: true } },
};

const sanitizeTileInput = (raw) => ({
  position: parseInt(raw.position, 10),
  bookId: raw.bookId && raw.bookId !== '' ? raw.bookId : null,
  externalLink: raw.externalLink && raw.externalLink !== '' ? String(raw.externalLink).trim() : null,
  title: raw.title && raw.title !== '' ? String(raw.title).trim() : null,
  titleAr: raw.titleAr && raw.titleAr !== '' ? String(raw.titleAr).trim() : null,
  isActive: raw.isActive === undefined ? true : (raw.isActive === true || raw.isActive === 'true'),
  // image is set by reconcile only if the payload supplies one; otherwise we
  // leave the existing image untouched on update.
  image: raw.image && raw.image !== '' ? String(raw.image) : null,
});

const unlinkImageFiles = (relativePaths) => {
  relativePaths.forEach((rel) => {
    if (!rel) return;
    const abs = path.join(__dirname, '..', rel);
    fs.unlink(abs, () => {});
  });
};

// GET /admin/ad-grids/:cornerId
exports.getByCorner = async (req, res, next) => {
  try {
    const corner = await prisma.category.findUnique({ where: { id: req.params.cornerId } });
    if (!corner) return res.status(404).json({ message: 'Corner not found.' });

    const tiles = await prisma.adGridTile.findMany({
      where: { cornerId: corner.id },
      orderBy: { position: 'asc' },
      include: TILE_INCLUDE,
    });

    // Pad to 6 placeholder slots so the admin form always renders 6 cards
    const byPos = new Map(tiles.map((t) => [t.position, t]));
    const padded = [];
    for (let p = 1; p <= 6; p++) {
      padded.push(byPos.get(p) || { position: p, isPlaceholder: true });
    }

    res.json({ corner: { id: corner.id, name: corner.name, nameAr: corner.nameAr, slug: corner.slug }, tiles: padded });
  } catch (error) { next(error); }
};

// PUT /admin/ad-grids/:cornerId
// Body: { tiles: [{ position, bookId?, externalLink?, title?, titleAr?, isActive?, image? }] }
// Reconcile in a transaction — upsert by (cornerId, position), delete positions
// not present in the payload.
exports.upsertGrid = async (req, res, next) => {
  try {
    const cornerId = req.params.cornerId;
    const corner = await prisma.category.findUnique({ where: { id: cornerId } });
    if (!corner) return res.status(404).json({ message: 'Corner not found.' });

    const incoming = Array.isArray(req.body.tiles) ? req.body.tiles : [];
    if (incoming.length > 6) {
      return res.status(400).json({ message: 'A grid can hold at most 6 tiles.' });
    }

    const cleaned = incoming.map(sanitizeTileInput);
    for (let i = 0; i < cleaned.length; i++) {
      const t = cleaned[i];
      if (!Number.isFinite(t.position) || t.position < 1 || t.position > 6) {
        return res.status(400).json({ message: `Invalid position at slot ${i + 1}.` });
      }
    }

    // Reject duplicate positions in the payload
    const seenPos = new Set();
    for (const t of cleaned) {
      if (seenPos.has(t.position)) {
        return res.status(400).json({ message: `Duplicate position ${t.position} in tiles list.` });
      }
      seenPos.add(t.position);
    }

    const orphanImages = await prisma.$transaction(async (tx) => {
      const existing = await tx.adGridTile.findMany({
        where: { cornerId },
        select: { id: true, position: true, image: true },
      });
      const existingByPos = new Map(existing.map((t) => [t.position, t]));
      const incomingPositions = new Set(cleaned.map((t) => t.position));

      // Tiles to delete = existing positions not in the incoming payload
      const toDelete = existing.filter((t) => !incomingPositions.has(t.position));
      const orphans = toDelete.map((t) => t.image).filter(Boolean);
      if (toDelete.length > 0) {
        await tx.adGridTile.deleteMany({ where: { id: { in: toDelete.map((t) => t.id) } } });
      }

      for (const t of cleaned) {
        const prev = existingByPos.get(t.position);
        if (prev) {
          // Update — keep existing image unless caller explicitly supplied a new path
          await tx.adGridTile.update({
            where: { id: prev.id },
            data: {
              bookId: t.bookId,
              externalLink: t.externalLink,
              title: t.title,
              titleAr: t.titleAr,
              isActive: t.isActive,
              ...(t.image ? { image: t.image } : {}),
            },
          });
        } else {
          // Create — image path is required (caller must have uploaded one first
          // via the per-tile image route, OR the row will be rejected here)
          if (!t.image) {
            const err = new Error(`Tile at position ${t.position} is missing an image.`);
            err.status = 400;
            throw err;
          }
          await tx.adGridTile.create({
            data: {
              cornerId,
              position: t.position,
              image: t.image,
              bookId: t.bookId,
              externalLink: t.externalLink,
              title: t.title,
              titleAr: t.titleAr,
              isActive: t.isActive,
            },
          });
        }
      }

      return orphans;
    });

    unlinkImageFiles(orphanImages);

    const tiles = await prisma.adGridTile.findMany({
      where: { cornerId },
      orderBy: { position: 'asc' },
      include: TILE_INCLUDE,
    });
    res.json({ tiles });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    next(error);
  }
};

// POST /admin/ad-grids/:cornerId/tile/:position/image
exports.uploadTileImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const cornerId = req.params.cornerId;
    const position = parseInt(req.params.position, 10);
    if (!Number.isFinite(position) || position < 1 || position > 6) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: 'Invalid position.' });
    }

    const corner = await prisma.category.findUnique({ where: { id: cornerId }, select: { id: true } });
    if (!corner) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: 'Corner not found.' });
    }

    const image = `uploads/ad-grids/${req.file.filename}`;

    // Upsert: if a tile already exists at this position, update its image and
    // delete the old file. Otherwise, create a placeholder row with this image.
    const existing = await prisma.adGridTile.findUnique({
      where: { cornerId_position: { cornerId, position } },
      select: { id: true, image: true },
    });

    let saved;
    if (existing) {
      saved = await prisma.adGridTile.update({
        where: { id: existing.id },
        data: { image },
      });
      if (existing.image) unlinkImageFiles([existing.image]);
    } else {
      saved = await prisma.adGridTile.create({
        data: { cornerId, position, image, isActive: true },
      });
    }

    await generateVariantsSafe(req.file.path);
    res.json({ id: saved.id, position: saved.position, image: saved.image });
  } catch (error) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    next(error);
  }
};

// DELETE /admin/ad-grids/:cornerId/tile/:position
exports.deleteTile = async (req, res, next) => {
  try {
    const cornerId = req.params.cornerId;
    const position = parseInt(req.params.position, 10);
    const existing = await prisma.adGridTile.findUnique({
      where: { cornerId_position: { cornerId, position } },
      select: { id: true, image: true },
    });
    if (!existing) return res.status(404).json({ message: 'Tile not found.' });
    await prisma.adGridTile.delete({ where: { id: existing.id } });
    if (existing.image) unlinkImageFiles([existing.image]);
    res.json({ message: 'Tile deleted.' });
  } catch (error) { next(error); }
};
