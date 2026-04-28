// Lists files under server/uploads/<dir>/ that no DB record references.
// Covers all four upload roots:
//   - covers/      -> Book.coverImage, Book.images[], ProductVariant.image
//   - ad-grids/    -> AdGridTile.image
//   - banners/     -> Banner.desktopImage, Banner.mobileImage
//   - categories/  -> Category.image, Category.placeholderImage
//
// Run with:
//   node server/scripts/find-orphan-images.js
// Add `--delete` to actually remove the orphans (otherwise dry-run only).
//
// Sized WebP siblings (-400.webp, -800.webp, -1600.webp) of a referenced file
// are considered "owned" by that file, not orphans.

const fs = require('fs');
const path = require('path');
const prisma = require('../config/database');

// Match any "-<width>.webp" sibling (covers/products use 400/800/1600,
// banners use 2400, etc.). Width must be 3-4 digits.
const baseNameOf = (filename) => {
  const m = filename.match(/^(.*)-(\d{3,4})\.webp$/i);
  if (!m) return null;
  return m[1];
};

const collectCoverRefs = async () => {
  const [books, variants] = await Promise.all([
    prisma.book.findMany({ select: { coverImage: true, images: true } }),
    prisma.productVariant.findMany({ select: { image: true } }),
  ]);
  const refs = new Set();
  const addRef = (p) => { if (p) refs.add(path.basename(p)); };
  for (const b of books) {
    addRef(b.coverImage);
    for (const img of (b.images || [])) addRef(img);
  }
  for (const v of variants) addRef(v.image);
  return refs;
};

const collectAdGridRefs = async () => {
  const tiles = await prisma.adGridTile.findMany({ select: { image: true } });
  const refs = new Set();
  for (const t of tiles) if (t.image) refs.add(path.basename(t.image));
  return refs;
};

const collectBannerRefs = async () => {
  const banners = await prisma.banner.findMany({ select: { desktopImage: true, mobileImage: true } });
  const refs = new Set();
  for (const b of banners) {
    if (b.desktopImage) refs.add(path.basename(b.desktopImage));
    if (b.mobileImage) refs.add(path.basename(b.mobileImage));
  }
  return refs;
};

const collectCategoryRefs = async () => {
  const cats = await prisma.category.findMany({ select: { image: true, placeholderImage: true } });
  const refs = new Set();
  for (const c of cats) {
    if (c.image) refs.add(path.basename(c.image));
    if (c.placeholderImage) refs.add(path.basename(c.placeholderImage));
  }
  return refs;
};

const TARGETS = [
  { label: 'covers', dir: path.join(__dirname, '..', 'uploads', 'covers'), collect: collectCoverRefs },
  { label: 'ad-grids', dir: path.join(__dirname, '..', 'uploads', 'ad-grids'), collect: collectAdGridRefs },
  { label: 'banners', dir: path.join(__dirname, '..', 'uploads', 'banners'), collect: collectBannerRefs },
  { label: 'categories', dir: path.join(__dirname, '..', 'uploads', 'categories'), collect: collectCategoryRefs },
];

const findOrphansFor = async ({ label, dir, collect }) => {
  if (!fs.existsSync(dir)) {
    return { label, dir, missing: true, onDisk: 0, refs: 0, orphans: [] };
  }
  const referenced = await collect();
  const onDisk = fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && !d.name.startsWith('.'))
    .map((d) => d.name);
  const orphans = [];
  for (const name of onDisk) {
    if (referenced.has(name)) continue;
    const base = baseNameOf(name);
    if (base) {
      const ownedByReferencedBase = [...referenced].some((r) => {
        const dot = r.lastIndexOf('.');
        const stem = dot > 0 ? r.slice(0, dot) : r;
        return stem === base;
      });
      if (ownedByReferencedBase) continue;
    }
    orphans.push(name);
  }
  return { label, dir, missing: false, onDisk: onDisk.length, refs: referenced.size, orphans };
};

(async () => {
  const dryRun = !process.argv.includes('--delete');

  let totalOrphans = 0;
  let totalDeleted = 0;

  for (const target of TARGETS) {
    const result = await findOrphansFor(target);
    console.log(`\n[${result.label}]`);
    if (result.missing) {
      console.log(`  No directory: ${result.dir}`);
      continue;
    }
    console.log(`  Files on disk:  ${result.onDisk}`);
    console.log(`  DB-referenced:  ${result.refs}`);
    console.log(`  Orphans found:  ${result.orphans.length}`);

    if (result.orphans.length === 0) {
      console.log('  Clean ✓');
      continue;
    }
    totalOrphans += result.orphans.length;

    console.log('  Orphan files:');
    for (const name of result.orphans) console.log(`    ${name}`);

    if (dryRun) continue;

    for (const name of result.orphans) {
      try {
        fs.unlinkSync(path.join(result.dir, name));
        totalDeleted++;
      } catch (e) {
        console.warn(`  Failed to delete ${name}: ${e.message}`);
      }
    }
  }

  if (dryRun && totalOrphans > 0) {
    console.log('\nDry-run only. Re-run with --delete to remove them.');
  } else if (!dryRun) {
    console.log(`\nDeleted ${totalDeleted}/${totalOrphans} orphan files.`);
  }
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
