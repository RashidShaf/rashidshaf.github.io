/**
 * Arabic + English text normalizer for search matching.
 *
 * Flattens Arabic letter variants and removes diacritics so that a search
 * query matches stored text regardless of hamza placement, diacritics, or
 * equivalent letter forms.
 *
 * Rules (from user-confirmed list):
 *   - Alif forms:    أ إ آ ٱ  → ا
 *   - Yeh forms:     ى → ي
 *   - Hamza-on-yeh:  ئ → ي
 *   - Hamza-on-waw:  ؤ → و
 *   - Teh marbuta:   ة → ه
 *   - Standalone hamza ء  → removed
 *   - Tatweel ـ  → removed
 *   - Tashkeel (all 8 diacritics + superscript alef) → removed
 *   - English → lowercased
 *   - Whitespace collapsed
 */

// Tashkeel: fathatan, dammatan, kasratan, fatha, damma, kasra, shadda, sukun,
// plus superscript alef.
const TASHKEEL_RE = /[\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652\u0670]/g;
const TATWEEL_RE = /\u0640/g;
const HAMZA_STANDALONE_RE = /\u0621/g;

function normalize(text) {
  if (text == null) return '';
  return String(text)
    .normalize('NFC')
    // Alif variants: أ (U+0623), إ (U+0625), آ (U+0622), ٱ (U+0671)  → ا (U+0627)
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    // ى (U+0649 alef maksura) → ي (U+064A yeh)
    .replace(/\u0649/g, '\u064A')
    // ئ (U+0626 hamza on yeh) → ي
    .replace(/\u0626/g, '\u064A')
    // ؤ (U+0624 hamza on waw) → و (U+0648 waw)
    .replace(/\u0624/g, '\u0648')
    // ة (U+0629 teh marbuta) → ه (U+0647 heh)
    .replace(/\u0629/g, '\u0647')
    // Strip diacritics, tatweel, standalone hamza
    .replace(TASHKEEL_RE, '')
    .replace(TATWEEL_RE, '')
    .replace(HAMZA_STANDALONE_RE, '')
    // English + whitespace cleanup
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build a single search-index string from a book's searchable fields.
 * Normalized on both sides (this function on write, `normalize()` on the
 * incoming query) guarantees the match works.
 */
function buildSearchIndex(book) {
  const parts = [
    book.title,
    book.titleAr,
    book.author,
    book.authorAr,
    book.publisher,
    book.publisherAr,
    book.isbn,
    book.sku,
  ];
  // Variant SKUs and labels also resolve via search.
  if (Array.isArray(book.variants)) {
    book.variants.forEach((v) => {
      parts.push(v.sku, v.label, v.labelAr, v.color, v.colorAr);
    });
  }
  return parts
    .filter((p) => p != null && p !== '')
    .map((p) => normalize(p))
    .filter(Boolean)
    .join(' ');
}

module.exports = { normalize, buildSearchIndex };
