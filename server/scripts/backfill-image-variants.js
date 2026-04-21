#!/usr/bin/env node
/**
 * One-shot backfill: walk server/uploads/{covers,categories,banners} and
 * generate WebP variants for any original image that doesn't already have them.
 *
 * Safe to re-run — skips files that already have all their variants.
 *
 * Usage (from project root):
 *   node server/scripts/backfill-image-variants.js
 */
const fs = require('fs');
const path = require('path');
const { generateVariants, variantPath, DEFAULT_WIDTHS } = require('../utils/images');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

const TARGETS = [
  { dir: 'covers', widths: DEFAULT_WIDTHS },
  { dir: 'categories', widths: DEFAULT_WIDTHS },
  { dir: 'banners', widths: [800, 1600, 2400] },
];

const ORIGINAL_EXT_RE = /\.(jpe?g|png)$/i;

function listOriginals(absDir) {
  if (!fs.existsSync(absDir)) return [];
  return fs.readdirSync(absDir)
    .filter((name) => ORIGINAL_EXT_RE.test(name))
    .map((name) => path.join(absDir, name));
}

function allVariantsExist(srcPath, widths) {
  return widths.every((w) => fs.existsSync(variantPath(srcPath, w)));
}

async function main() {
  let totalScanned = 0;
  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const { dir, widths } of TARGETS) {
    const absDir = path.join(UPLOADS_ROOT, dir);
    const originals = listOriginals(absDir);
    console.log(`\n== ${dir}/ — ${originals.length} original file(s)`);

    for (const src of originals) {
      totalScanned += 1;
      const rel = path.relative(UPLOADS_ROOT, src);
      if (allVariantsExist(src, widths)) {
        totalSkipped += 1;
        process.stdout.write(`  [skip] ${rel}\n`);
        continue;
      }

      try {
        const results = await generateVariants(src, widths);
        const okCount = results.filter((r) => r.ok).length;
        if (okCount === widths.length) {
          totalProcessed += 1;
          process.stdout.write(`  [done] ${rel} — ${okCount} variants\n`);
        } else {
          totalFailed += 1;
          process.stdout.write(`  [partial] ${rel} — ${okCount}/${widths.length} ok\n`);
        }
      } catch (err) {
        totalFailed += 1;
        process.stdout.write(`  [fail] ${rel} — ${err.message}\n`);
      }
    }
  }

  console.log('\n---');
  console.log(`Scanned:   ${totalScanned}`);
  console.log(`Processed: ${totalProcessed}`);
  console.log(`Skipped:   ${totalSkipped} (already had all variants)`);
  console.log(`Failed:    ${totalFailed}`);
  console.log('Done.');
}

main().catch((err) => {
  console.error('Backfill crashed:', err);
  process.exit(1);
});
