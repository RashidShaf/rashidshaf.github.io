const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DEFAULT_WIDTHS = [400, 800, 1600];
const QUALITY = 75;

// Given /abs/path/to/foo.jpg returns /abs/path/to/foo-{width}.webp
const variantPath = (absPath, width) => {
  const parsed = path.parse(absPath);
  return path.join(parsed.dir, `${parsed.name}-${width}.webp`);
};

// Create resized WebP variants next to the original file.
// - Skips widths larger than the source (sharp would just upscale otherwise).
// - Best-effort: throws aggregate error at end but each variant is independent.
// - Returns array of { width, path, ok } results.
async function generateVariants(absPath, widths = DEFAULT_WIDTHS) {
  if (!fs.existsSync(absPath)) {
    throw new Error(`Source image not found: ${absPath}`);
  }

  const source = sharp(absPath);
  const meta = await source.metadata();
  const sourceWidth = meta.width || 0;

  const results = await Promise.all(
    widths.map(async (width) => {
      const outPath = variantPath(absPath, width);
      try {
        // Skip if the source is already smaller than this target — use source size.
        const targetWidth = sourceWidth && sourceWidth < width ? sourceWidth : width;
        await sharp(absPath)
          .rotate() // auto-rotate based on EXIF
          .resize({ width: targetWidth, withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toFile(outPath);
        return { width, path: outPath, ok: true };
      } catch (err) {
        return { width, path: outPath, ok: false, error: err.message };
      }
    })
  );

  return results;
}

// Safe wrapper — never throws, logs failures. Use this from upload controllers
// where variant generation is best-effort and must not break the upload response.
async function generateVariantsSafe(absPath, widths) {
  try {
    const results = await generateVariants(absPath, widths);
    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      console.warn(`[images] ${failed.length}/${results.length} variants failed for ${absPath}`,
        failed.map((f) => `${f.width}w: ${f.error}`).join('; '));
    }
    return results;
  } catch (err) {
    console.warn(`[images] variant generation failed for ${absPath}:`, err.message);
    return [];
  }
}

module.exports = { generateVariants, generateVariantsSafe, variantPath, DEFAULT_WIDTHS };
