/**
 * Generates the 1200x630 social-share banner used as the og:image fallback
 * for non-product pages. Run from the server folder:
 *
 *   node scripts/generate-share-banner.js
 *
 * Writes ../client/public/arkaan-banner-logo.png. Re-run any time the brand
 * mark or tagline changes.
 */

const path = require('path');
const sharp = require('sharp');

const W = 1200;
const H = 630;
const MAROON = { r: 0x56, g: 0x07, b: 0x36, alpha: 1 };       // #560736
const CREAM = { r: 0xFA, g: 0xF6, b: 0xEF, alpha: 1 };          // #FAF6EF subtle warm white
const TEXT_PRIMARY = '#560736';
const TEXT_SECONDARY = 'rgba(86, 7, 54, 0.72)';

const LOGO_PATH = path.join(__dirname, '..', '..', 'client', 'public', 'logo.webp');
const OUT_PATH = path.join(__dirname, '..', '..', 'client', 'public', 'arkaan-banner-logo.png');

(async () => {
  // Centered layout: logo top, English title, Arabic title, tagline, URL.
  // Conservative font sizes + generic sans-serif so the rasterizer's font
  // fallback (sharp doesn't have the project's web fonts available) doesn't
  // overflow the canvas.
  const LOGO_TARGET = 240;
  const resizedLogo = await sharp(LOGO_PATH)
    .resize({
      width: LOGO_TARGET,
      height: LOGO_TARGET,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .toBuffer();
  const logoMeta = await sharp(resizedLogo).metadata();
  const logoLeft = Math.floor((W - logoMeta.width) / 2);
  const logoTop = 50;

  const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .title  { font: 700 64px sans-serif; fill: ${TEXT_PRIMARY}; letter-spacing: -0.5px; }
    .arabic { font: 700 48px sans-serif; fill: ${TEXT_PRIMARY}; }
    .tag    { font: 400 26px sans-serif; fill: ${TEXT_SECONDARY}; }
    .url    { font: 600 24px sans-serif; fill: ${TEXT_PRIMARY}; letter-spacing: 6px; }
  </style>
  <text x="${W / 2}" y="370" class="title" text-anchor="middle">Arkaan Bookstore</text>
  <text x="${W / 2}" y="430" class="arabic" text-anchor="middle">مكتبة أركان</text>
  <text x="${W / 2}" y="490" class="tag" text-anchor="middle">Books · Stationery · Printing · Doha, Qatar</text>
  <text x="${W / 2}" y="565" class="url" text-anchor="middle">ARKAAN.QA</text>
</svg>
`.trim();

  await sharp({
    create: { width: W, height: H, channels: 4, background: CREAM },
  })
    .composite([
      { input: resizedLogo, left: logoLeft, top: logoTop },
      { input: Buffer.from(svg), left: 0, top: 0 },
    ])
    .png({ quality: 95, compressionLevel: 8 })
    .toFile(OUT_PATH);

  console.log(`Wrote ${OUT_PATH}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
