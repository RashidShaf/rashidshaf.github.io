const slugify = require('slugify');

const generateSlug = (text) => {
  return slugify(text, { lower: true, strict: true, trim: true });
};

const generateOrderNumber = (count) => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `ARK-${today}-${String(count + 1).padStart(3, '0')}`;
};

module.exports = { generateSlug, generateOrderNumber };
