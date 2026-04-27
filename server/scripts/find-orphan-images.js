// Lists files in server/uploads/covers/ that no Book.coverImage,
// Book.images[], or ProductVariant.image references. Run with:
//   node server/scripts/find-orphan-images.js
// Add `--delete` to actually remove the orphans (otherwise dry-run only).
//
// Sized WebP siblings (-400.webp, -800.webp, -1600.webp) of a referenced file
// are considered "owned" by that file, not orphans.

const fs = require('fs');
const path = require('path');
const prisma = require('../config/database');

const COVERS_DIR = path.join(__dirname, '..', 'uploads', 'covers');
const SIZE_SIBLING_RE = /-(400|800|1600)\.webp$/i;

const baseNameOf = (filename) => {
  const m = filename.match(/^(.*)-(?:400|800|1600)\.webp$/i);
  if (!m) return null;
  return m[1];
};

(async () => {
  const dryRun = !process.argv.includes('--delete');

  const [books, variants] = await Promise.all([
    prisma.book.findMany({ select: { coverImage: true, images: true } }),
    prisma.productVariant.findMany({ select: { image: true } }),
  ]);

  const referenced = new Set();
  const addRef = (p) => {
    if (!p) return;
    referenced.add(path.basename(p));
  };
  for (const b of books) {
    addRef(b.coverImage);
    for (const img of (b.images || [])) addRef(img);
  }
  for (const v of variants) addRef(v.image);

  if (!fs.existsSync(COVERS_DIR)) {
    console.log(`No directory: ${COVERS_DIR}`);
    process.exit(0);
  }

  const onDisk = fs.readdirSync(COVERS_DIR);
  const orphans = [];

  for (const name of onDisk) {
    if (referenced.has(name)) continue;
    // If this is a sized sibling and its base file is referenced, it's owned.
    const base = baseNameOf(name);
    if (base) {
      const baseRefs = [...referenced].filter((r) => {
        const dot = r.lastIndexOf('.');
        const stem = dot > 0 ? r.slice(0, dot) : r;
        return stem === base;
      });
      if (baseRefs.length > 0) continue;
    }
    orphans.push(name);
  }

  console.log(`Files on disk:  ${onDisk.length}`);
  console.log(`DB-referenced:  ${referenced.size}`);
  console.log(`Orphans found:  ${orphans.length}`);

  if (orphans.length === 0) {
    console.log('Clean ✓');
    process.exit(0);
  }

  console.log('\nOrphan files:');
  for (const name of orphans) console.log(`  ${name}`);

  if (dryRun) {
    console.log('\nDry-run only. Re-run with --delete to remove them.');
    process.exit(0);
  }

  let deleted = 0;
  for (const name of orphans) {
    try {
      fs.unlinkSync(path.join(COVERS_DIR, name));
      deleted++;
    } catch (e) {
      console.warn(`Failed to delete ${name}: ${e.message}`);
    }
  }
  console.log(`\nDeleted ${deleted}/${orphans.length} orphan files.`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
