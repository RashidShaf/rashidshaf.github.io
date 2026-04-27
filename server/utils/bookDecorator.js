// Shared book-list helpers. Used by every storefront endpoint that returns a
// book card so that variant-aware fields (priceFrom/priceTo, anyInStock) are
// computed consistently. Without these the storefront BookCard falls back to
// "out of stock" for any book with hasVariants=true but no variants payload.

const variantListSelect = {
  id: true,
  price: true,
  isOutOfStock: true,
  isActive: true,
  sortOrder: true,
};

// Fields that must NEVER ship to anonymous public callers. Internal margin
// data (purchasePrice), search-engine internals (searchIndex), and ops
// thresholds (lowStockThreshold). Stripped from book + each variant before
// the response leaves the controller.
const PRIVATE_BOOK_FIELDS = ['purchasePrice', 'searchIndex'];
const PRIVATE_VARIANT_FIELDS = ['purchasePrice', 'lowStockThreshold'];

const omit = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = { ...obj };
  for (const k of keys) delete copy[k];
  return copy;
};

const stripPrivateFields = (book) => {
  if (!book) return book;
  const copy = omit(book, PRIVATE_BOOK_FIELDS);
  if (Array.isArray(copy.variants)) {
    copy.variants = copy.variants.map((v) => omit(v, PRIVATE_VARIANT_FIELDS));
  }
  return copy;
};

// Returns a NEW object with priceFrom/priceTo/anyInStock when the book has
// variants. The base product is itself a purchasable option, so its price
// participates in the "From" / "To" range. anyInStock = base in stock OR
// any active variant in stock. Always strips PRIVATE_* fields so public
// payloads never leak margin / internal columns.
const decorateBook = (book) => {
  if (!book) return book;
  const safe = stripPrivateFields(book);
  if (!safe.hasVariants) return safe;
  const variants = Array.isArray(safe.variants) ? safe.variants : [];
  const active = variants.filter((v) => v.isActive !== false);
  const variantPrices = active.map((v) => parseFloat(v.price)).filter((n) => !isNaN(n));
  const basePrice = parseFloat(safe.price);
  const allPrices = [...(isNaN(basePrice) ? [] : [basePrice]), ...variantPrices];

  if (allPrices.length > 0) {
    safe.priceFrom = Number(Math.min(...allPrices).toFixed(2));
    safe.priceTo = Number(Math.max(...allPrices).toFixed(2));
  }
  safe.anyInStock = !safe.isOutOfStock || active.some((v) => !v.isOutOfStock);
  return safe;
};

const decorateBooks = (books) => books.map(decorateBook);

module.exports = { variantListSelect, decorateBook, decorateBooks, stripPrivateFields };
