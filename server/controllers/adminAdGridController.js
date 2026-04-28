const prisma = require('../config/database');
const { generateVariantsSafe, variantPath, DEFAULT_WIDTHS } = require('../utils/images');
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

// Translate well-known Prisma errors into clean 4xx responses. Returning
// the response signals "handled"; null means "let next(error) take over."
const handlePrismaError = (err, res, slot) => {
  if (!err) return null;
  const msg = typeof err.message === 'string' ? err.message : '';
  // PrismaClientValidationError ("Argument `x` must not be null", "Argument `x` is missing")
  // — fired client-side before the DB call. Or DB-side P2011/P2012 NOT NULL violation.
  const isMissingField =
    err.name === 'PrismaClientValidationError'
    || err.code === 'P2011' || err.code === 'P2012'
    || /must not be null/i.test(msg)
    || /null constraint/i.test(msg);
  if (isMissingField) {
    // Try to surface which field — Prisma's message format includes
    // "Argument `image` must not be null" or "Argument `image` is missing".
    const fieldMatch = msg.match(/argument `?(\w+)`?/i);
    const field = fieldMatch ? fieldMatch[1] : null;
    let message;
    if (field === 'image') {
      message = slot
        ? `Tile at position ${slot} needs an image. Upload one before saving.`
        : 'Tile needs an image. Upload one before saving.';
    } else if (field) {
      message = slot
        ? `Tile at position ${slot} is missing a required field (${field}).`
        : `A required field is missing (${field}).`;
    } else {
      message = slot
        ? `Tile at position ${slot} is missing a required field.`
        : 'A required field is missing.';
    }
    return res.status(400).json({ message, code: 'MISSING_REQUIRED_FIELD', field });
  }
  if (err.code === 'P2002') {
    return res.status(400).json({ message: 'Duplicate value (unique constraint).', code: 'DUPLICATE' });
  }
  if (err.code === 'P2003') {
    return res.status(400).json({ message: 'Invalid reference (foreign key).', code: 'INVALID_REFERENCE' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found.', code: 'NOT_FOUND' });
  }
  return null;
};

// Corner-level enable/disable lives in a single Setting row to avoid a
// schema migration. JSON shape: { [cornerId]: boolean }. A missing entry
// means "enabled" (default behavior — corners that have tiles render them).
const AD_GRID_ENABLED_KEY = 'adGridEnabledByCorner';

const readEnabledMap = async () => {
  const row = await prisma.setting.findUnique({ where: { key: AD_GRID_ENABLED_KEY } });
  if (!row?.value) return {};
  try {
    const parsed = JSON.parse(row.value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
};

const writeEnabledMap = async (map) => {
  await prisma.setting.upsert({
    where: { key: AD_GRID_ENABLED_KEY },
    update: { value: JSON.stringify(map) },
    create: { key: AD_GRID_ENABLED_KEY, value: JSON.stringify(map) },
  });
};

const isCornerAdGridEnabled = (map, cornerId) => {
  // Default to true when the corner isn't in the map yet.
  return map[cornerId] !== false;
};

// Unlink the original image and its auto-generated WebP siblings
// (-400/-800/-1600.webp from generateVariantsSafe). Without sibling cleanup
// every replace/delete leaks 3 orphans per tile.
const unlinkImageFiles = (relativePaths) => {
  relativePaths.forEach((rel) => {
    if (!rel) return;
    const abs = path.join(__dirname, '..', rel);
    fs.unlink(abs, () => {});
    DEFAULT_WIDTHS.forEach((w) => {
      fs.unlink(variantPath(abs, w), () => {});
    });
  });
};

// GET /admin/ad-grids/:cornerId
exports.getByCorner = async (req, res, next) => {
  try {
    const corner = await prisma.category.findUnique({ where: { id: req.params.cornerId } });
    if (!corner) return res.status(404).json({ message: 'Corner not found.' });

    const [tiles, enabledMap] = await Promise.all([
      prisma.adGridTile.findMany({
        where: { cornerId: corner.id },
        orderBy: { position: 'asc' },
        include: TILE_INCLUDE,
      }),
      readEnabledMap(),
    ]);

    // Pad to 6 placeholder slots so the admin form always renders 6 cards
    const byPos = new Map(tiles.map((t) => [t.position, t]));
    const padded = [];
    for (let p = 1; p <= 6; p++) {
      padded.push(byPos.get(p) || { position: p, isPlaceholder: true });
    }

    res.json({
      corner: { id: corner.id, name: corner.name, nameAr: corner.nameAr, slug: corner.slug },
      tiles: padded,
      adGridEnabled: isCornerAdGridEnabled(enabledMap, corner.id),
    });
  } catch (error) { next(error); }
};

// PATCH /admin/ad-grids/:cornerId/active
// Body: { enabled: boolean }
// Toggles whether this corner's ad grid is rendered on the storefront.
// Stored in the global `adGridEnabledByCorner` Setting JSON map.
exports.setCornerActive = async (req, res, next) => {
  try {
    const cornerId = req.params.cornerId;
    const corner = await prisma.category.findUnique({
      where: { id: cornerId },
      select: { id: true, parentId: true },
    });
    if (!corner) return res.status(404).json({ message: 'Corner not found.' });
    // Only top-level categories ("corners") can have an ad grid — sub-categories
    // shouldn't be togglable here.
    if (corner.parentId !== null) {
      return res.status(400).json({ message: 'Only top-level corners can have an ad grid.' });
    }

    const enabled = req.body?.enabled === true || req.body?.enabled === 'true';

    // Read-modify-write the JSON map atomically. Without a transaction,
    // simultaneous toggles on different corners could erase each other.
    await prisma.$transaction(async (tx) => {
      const row = await tx.setting.findUnique({ where: { key: AD_GRID_ENABLED_KEY } });
      let map = {};
      if (row?.value) {
        try {
          const parsed = JSON.parse(row.value);
          if (parsed && typeof parsed === 'object') map = parsed;
        } catch {}
      }
      map[corner.id] = enabled;
      await tx.setting.upsert({
        where: { key: AD_GRID_ENABLED_KEY },
        update: { value: JSON.stringify(map) },
        create: { key: AD_GRID_ENABLED_KEY, value: JSON.stringify(map) },
      });
    });

    res.json({ cornerId: corner.id, adGridEnabled: enabled });
  } catch (error) {
    if (handlePrismaError(error, res)) return;
    next(error);
  }
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
      // Reject path-traversal attempts in the image path. We only accept paths
      // that this server itself produced (under uploads/ad-grids/). No `..`,
      // no absolute paths, no escape via leading slash.
      if (t.image) {
        const safe = !t.image.includes('..')
          && !path.isAbsolute(t.image)
          && t.image.startsWith('uploads/ad-grids/');
        if (!safe) {
          return res.status(400).json({ message: `Invalid image path at slot ${i + 1}.` });
        }
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
          // Update — image is always written (including null when admin
          // cleared it via the X button). Old file becomes an orphan if the
          // image changed.
          if (prev.image && prev.image !== t.image) {
            orphans.push(prev.image);
          }
          // Prisma v6 requires relation syntax (connect/disconnect) instead
          // of the scalar FK on update.
          await tx.adGridTile.update({
            where: { id: prev.id },
            data: {
              externalLink: t.externalLink,
              title: t.title,
              titleAr: t.titleAr,
              isActive: t.isActive,
              image: t.image,
              book: t.bookId
                ? { connect: { id: t.bookId } }
                : { disconnect: true },
            },
          });
        } else {
          // Create. Image is allowed to be null so admin can scaffold a tile
          // (link/titles) before settling on an image. Storefront skips
          // image-less tiles.
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
    if (handlePrismaError(error, res)) return;
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
    if (handlePrismaError(error, res, parseInt(req.params.position, 10))) return;
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
  } catch (error) {
    if (handlePrismaError(error, res)) return;
    next(error);
  }
};
