#!/usr/bin/env node
/**
 * One-shot backfill: compute `searchIndex` for every book that doesn't have
 * one yet (or re-computes all of them with --force).
 *
 * Usage:
 *   node server/scripts/backfill-search-index.js           # only books missing searchIndex
 *   node server/scripts/backfill-search-index.js --force   # recompute for all books
 */
const prisma = require('../config/database');
const { buildSearchIndex } = require('../utils/arabicNormalize');

const force = process.argv.includes('--force');

async function main() {
  const where = force ? {} : { searchIndex: null };
  const books = await prisma.book.findMany({
    where,
    select: {
      id: true,
      title: true,
      titleAr: true,
      author: true,
      authorAr: true,
      publisher: true,
      publisherAr: true,
      isbn: true,
      sku: true,
    },
  });

  console.log(`Found ${books.length} book(s) to process${force ? ' (--force)' : ''}.`);

  let done = 0;
  let failed = 0;

  for (const book of books) {
    try {
      const searchIndex = buildSearchIndex(book);
      await prisma.book.update({
        where: { id: book.id },
        data: { searchIndex },
      });
      done += 1;
      if (done % 50 === 0) console.log(`  ${done}/${books.length} done…`);
    } catch (err) {
      failed += 1;
      console.error(`  [fail] book ${book.id} — ${err.message}`);
    }
  }

  console.log('\n---');
  console.log(`Processed: ${done}`);
  console.log(`Failed:    ${failed}`);
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error('Backfill crashed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
