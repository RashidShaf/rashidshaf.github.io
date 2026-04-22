#!/usr/bin/env node
/**
 * One-shot backfill: any book that has an explicit pick in HomeSectionProduct
 * gets its matching section flag (isFeatured / isBestseller / etc.) set to true.
 *
 * Reconciles legacy data from before two-way flag<->pick sync was deployed.
 * Idempotent — re-running does nothing on already-synced data.
 *
 * Usage:
 *   node server/scripts/backfill-flag-sync.js            # apply changes
 *   node server/scripts/backfill-flag-sync.js --dry-run  # preview only
 */
const prisma = require('../config/database');

const FLAG_MAP = {
  featured:    'isFeatured',
  bestsellers: 'isBestseller',
  newArrivals: 'isNewArrival',
  trending:    'isTrending',
  comingSoon:  'isComingSoon',
};

const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`Starting flag backfill${dryRun ? ' (DRY RUN — no writes)' : ''}…\n`);
  let total = 0;

  for (const [sectionType, flag] of Object.entries(FLAG_MAP)) {
    const picks = await prisma.homeSectionProduct.findMany({
      where: { sectionType },
      select: { bookId: true },
      distinct: ['bookId'],
    });
    const ids = picks.map((p) => p.bookId);

    if (ids.length === 0) {
      console.log(`[${sectionType}] no picks — skipping`);
      continue;
    }

    const needsFlag = await prisma.book.findMany({
      where: { id: { in: ids }, [flag]: false },
      select: { id: true, title: true },
    });

    if (needsFlag.length === 0) {
      console.log(`[${sectionType}] ${ids.length} pick(s), all already flagged — nothing to do`);
      continue;
    }

    console.log(`[${sectionType}] ${needsFlag.length} book(s) need ${flag}=true:`);
    for (const b of needsFlag) {
      console.log(`    - ${b.id}  ${b.title}`);
    }

    if (!dryRun) {
      const result = await prisma.book.updateMany({
        where: { id: { in: needsFlag.map((b) => b.id) } },
        data:  { [flag]: true },
      });
      console.log(`    => updated ${result.count} book(s)`);
      total += result.count;
    } else {
      total += needsFlag.length;
    }
  }

  console.log('\n---');
  console.log(dryRun
    ? `Would update ${total} book(s). Run again without --dry-run to apply.`
    : `Done. Updated ${total} book(s) total.`);
}

main()
  .catch((err) => {
    console.error('Backfill crashed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
