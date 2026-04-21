const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

const SITE_URL = (process.env.CLIENT_URL || 'https://arkaan.qa').replace(/\/$/, '');

const escapeXml = (str) =>
  String(str).replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[c]);

const urlEntry = (loc, lastmod, changefreq, priority) => {
  const parts = [`    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${new Date(lastmod).toISOString()}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join('\n')}\n  </url>`;
};

router.get('/sitemap.xml', async (req, res) => {
  try {
    const [books, categories] = await Promise.all([
      prisma.book.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        select: { slug: true, parentId: true, updatedAt: true },
      }),
    ]);

    const urls = [];

    // Static pages
    urls.push(urlEntry(`${SITE_URL}/`, null, 'daily', '1.0'));
    urls.push(urlEntry(`${SITE_URL}/books`, null, 'daily', '0.9'));
    urls.push(urlEntry(`${SITE_URL}/about`, null, 'monthly', '0.5'));
    urls.push(urlEntry(`${SITE_URL}/contact`, null, 'monthly', '0.5'));
    urls.push(urlEntry(`${SITE_URL}/track-order`, null, 'monthly', '0.4'));

    // Category pages — split by hierarchy:
    //  - Corners (parentId = null) use /?corner=slug (their real landing URL)
    //  - Sub-categories use /books?category=slug (filterable browse URL)
    for (const cat of categories) {
      if (cat.parentId === null) {
        urls.push(urlEntry(`${SITE_URL}/?corner=${encodeURIComponent(cat.slug)}`, cat.updatedAt, 'weekly', '0.8'));
      } else {
        urls.push(urlEntry(`${SITE_URL}/books?category=${encodeURIComponent(cat.slug)}`, cat.updatedAt, 'weekly', '0.7'));
      }
    }

    // Book pages
    for (const book of books) {
      urls.push(urlEntry(`${SITE_URL}/books/${encodeURIComponent(book.slug)}`, book.updatedAt, 'weekly', '0.8'));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('Failed to generate sitemap');
  }
});

module.exports = router;
