// Crawler-aware HTML response for product pages.
//
// Why: arkaan.qa is a Vite SPA. The static index.html shell has only generic
// site-wide og:title / og:description / og:image. WhatsApp / Telegram /
// Facebook / Twitter / LinkedIn / Slack / iMessage scrapers fetch the URL
// once, never run JavaScript, and read whatever's in <head>. Without this
// middleware they all see the same generic preview for every product.
//
// What: when a crawler User-Agent hits /books/:slug, look up the product,
// render an HTML doc with product-specific og tags (cover image, title,
// rating-aware description). Non-crawlers (real visitors) get the existing
// SPA shell from client/dist/index.html so the storefront keeps working
// exactly as it does today.
//
// Wiring: server.js registers this on GET /books/:slug. Nginx must proxy
// /books/* to localhost:5000 (one block in the site config).

const fs = require('fs');
const path = require('path');
const prisma = require('../config/database');

const SITE_URL = process.env.SITE_URL || 'https://arkaan.qa';
const SPA_INDEX_PATH = path.join(__dirname, '..', '..', 'client', 'dist', 'index.html');

// Cache the SPA shell in memory after the first read. Reset to null on
// startup so a deploy that updates index.html picks up the change after the
// pm2 restart that always follows the deploy.
let SPA_INDEX_CACHE = null;
const readSpaIndex = () => {
  if (SPA_INDEX_CACHE !== null) return SPA_INDEX_CACHE;
  try {
    SPA_INDEX_CACHE = fs.readFileSync(SPA_INDEX_PATH, 'utf8');
  } catch (err) {
    console.warn('[socialMetaTags] cannot read SPA index at', SPA_INDEX_PATH, err.message);
    SPA_INDEX_CACHE = '';
  }
  return SPA_INDEX_CACHE;
};

// Match the User-Agents of every link-preview / search scraper we care about.
// The trailing `bot|spider|crawler` catches the long tail at the cost of a
// few false positives — that's fine, sending rich HTML to a generic curl
// client doesn't hurt anything.
// (Avoid bare `preview` — too broad, can match browser preview tooling.)
//
// `instagram` is included as a literal word because Instagram's link-preview
// fetcher uses a UA like "Instagram 219.0.0.12.117" — no "bot" suffix.
const CRAWLER_RE = /(facebookexternalhit|whatsapp|instagram|snapchat|tiktok|twitterbot|linkedinbot|slackbot|telegrambot|skypeuripreview|applebot|googlebot|bingbot|duckduckbot|yandexbot|baiduspider|pinterestbot|line.*previewer|discordbot|embedly|quora link preview|outbrain|vkshare|w3c_validator|redditbot|bot|spider|crawler)/i;

// In-memory cache so repeated scrapes for the same URL don't re-hit the DB.
// Five minutes is plenty — once a link is shared, the preview gets fetched
// in a burst, then cools down.
const META_CACHE = new Map();
const META_TTL_MS = 5 * 60 * 1000;

// Periodic sweep of expired entries so the Map doesn't grow unbounded. Cheap:
// once every 10 min, walks at most a few thousand keys. Skip when the
// process exits to avoid keeping it alive.
const META_SWEEP_MS = 10 * 60 * 1000;
const sweepInterval = setInterval(() => {
  const now = Date.now();
  for (const [slug, entry] of META_CACHE) {
    if (entry.expires <= now) META_CACHE.delete(slug);
  }
}, META_SWEEP_MS);
if (typeof sweepInterval.unref === 'function') sweepInterval.unref();

const escapeHtml = (raw) => String(raw == null ? '' : raw)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const truncate = (s, n) => {
  const str = String(s || '').replace(/\s+/g, ' ').trim();
  if (str.length <= n) return str;
  return str.slice(0, n - 1).trimEnd() + '…';
};

const buildOgHtml = (book) => {
  const productTitle = book.title || 'Product';
  const fullTitle = `${productTitle} | Arkaan Bookstore`;

  // Description: author · category · QAR price · ★ rating (N reviews)
  const author = book.author && book.author !== 'Unknown' ? book.author : null;
  const categoryName = book.category?.name || null;
  const price = book.price != null && !isNaN(parseFloat(book.price))
    ? `QAR ${parseFloat(book.price).toFixed(2)}`
    : null;
  const reviewCount = parseInt(book.reviewCount || 0, 10);
  const rating = reviewCount > 0 && book.averageRating != null
    ? `★ ${parseFloat(book.averageRating).toFixed(1)} (${reviewCount} review${reviewCount === 1 ? '' : 's'})`
    : null;

  const parts = [author, categoryName, price, rating].filter(Boolean);
  const description = parts.length > 0
    ? parts.join(' · ')
    : truncate(book.description || 'Available at Arkaan Bookstore — Doha, Qatar', 180);

  const image = book.coverImage
    ? `${SITE_URL}/${book.coverImage}`
    : `${SITE_URL}/arkaan-banner-logo.png`;
  const url = `${SITE_URL}/books/${book.slug}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Arkaan Bookstore">
<meta property="og:title" content="${escapeHtml(fullTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:width" content="800">
<meta property="og:image:height" content="800">
<meta property="og:image:alt" content="${escapeHtml(productTitle)}">
<meta property="product:price.amount" content="${escapeHtml(price ? parseFloat(book.price).toFixed(2) : '')}">
<meta property="product:price.currency" content="QAR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(fullTitle)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
</head>
<body>
<h1>${escapeHtml(productTitle)}</h1>
<p>${escapeHtml(description)}</p>
<p><a href="${escapeHtml(url)}">View on Arkaan Bookstore</a></p>
</body>
</html>`;
};

const sendHtml = (res, body, status = 200) => {
  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Crawlers cache aggressively; allow them to revalidate after our 5-min TTL.
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.send(body);
};

const sendSpaShell = (res, status = 200) => {
  const html = readSpaIndex();
  if (!html) {
    // Fail open — let Express's normal 404 handler take over. This only
    // happens if client/dist/index.html is missing on the server.
    return res.status(500).send('SPA shell missing on server');
  }
  return sendHtml(res, html, status);
};

const productHandler = async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const slug = (req.params.slug || '').toString();

  // No slug or non-crawler → serve the SPA shell unchanged.
  if (!slug) return sendSpaShell(res);
  if (!CRAWLER_RE.test(ua)) return sendSpaShell(res);

  // Cache lookup
  const cached = META_CACHE.get(slug);
  const now = Date.now();
  if (cached && cached.expires > now) {
    return sendHtml(res, cached.html);
  }

  try {
    const book = await prisma.book.findUnique({
      where: { slug },
      include: { category: { select: { name: true, nameAr: true } } },
    });
    if (!book || !book.isActive) {
      // Product missing/inactive — let the SPA render its own 404 view.
      return sendSpaShell(res, 404);
    }
    const html = buildOgHtml(book);
    META_CACHE.set(slug, { html, expires: now + META_TTL_MS });
    return sendHtml(res, html);
  } catch (err) {
    console.warn('[socialMetaTags] db lookup failed for slug=%s:', slug, err.message);
    // Fail open: still serve the SPA shell so the page is usable.
    return sendSpaShell(res);
  }
};

module.exports = { productHandler };
