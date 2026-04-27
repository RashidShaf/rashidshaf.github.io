import React, { useMemo, useRef, useState } from 'react';
import { FiPlus, FiTrash2, FiImage, FiChevronDown } from 'react-icons/fi';
import AutocompleteInput from './AutocompleteInput';

const inputClass = 'w-full px-3 py-2.5 bg-white border border-admin-input-border rounded-md text-sm text-admin-text focus:outline-none focus:border-admin-accent';
const labelClass = 'block text-[11px] font-medium text-admin-muted mb-1 uppercase tracking-wider';

// blank() — when given a basePrefill object, copies the base product's values
// into the new variant so the admin only has to override what differs.
// `baseCustomFieldValues` is the parent form's customFieldValues map, so the
// new variant inherits per-corner custom fields too.
//
// EXCEPTION: price / purchasePrice / compareAtPrice are NOT prefilled. Variants
// usually have different prices than the base, so the admin must enter them
// explicitly to avoid accidentally copying the base price.
const blank = (basePrefill = {}, baseCustomFieldValues = {}) => ({
  _key: Math.random().toString(36).slice(2, 9),
  id: '',
  label: '',
  labelAr: '',
  sku: '',
  price: '',
  purchasePrice: '',
  compareAtPrice: '',
  stock: '0',
  color: basePrefill.color ?? '',
  colorAr: basePrefill.colorAr ?? '',
  dimensions: basePrefill.dimensions ?? '',
  weight: basePrefill.weight ?? '',
  brand: basePrefill.brand ?? '',
  brandAr: basePrefill.brandAr ?? '',
  material: basePrefill.material ?? '',
  materialAr: basePrefill.materialAr ?? '',
  ageRange: basePrefill.ageRange ?? '',
  // Book-specific
  author: basePrefill.author ?? '',
  authorAr: basePrefill.authorAr ?? '',
  publisher: basePrefill.publisher ?? '',
  publisherAr: basePrefill.publisherAr ?? '',
  isbn: basePrefill.isbn ?? '',
  pages: basePrefill.pages ?? '',
  language: basePrefill.language ?? '',
  publishedDate: basePrefill.publishedDate ?? '',
  // Deep-clone so editing the new variant's CFs doesn't mutate the base form.
  customFieldValues: JSON.parse(JSON.stringify(baseCustomFieldValues || {})),
  image: '',
  imageFile: null,
  imagePreview: null,
  sortOrder: 0,
  isOutOfStock: false,
  isActive: true,
});

export default function VariantsPanel({
  t,
  language,
  variants,
  setVariants,
  suggestedColors = [],
  suggestedColorsAr = [],
  suggestedBrands = [],
  suggestedBrandsAr = [],
  suggestedMaterials = [],
  suggestedMaterialsAr = [],
  suggestedAuthors = [],
  suggestedAuthorsAr = [],
  suggestedPublishers = [],
  suggestedPublishersAr = [],
  apiBase,
  duplicateSkuIndices = new Set(),
  category,                      // NEW — selected parent corner category (for detailFields)
  basePrefill = {},              // NEW — base product form values for prefill on Add
  categoryCustomFields = [],     // NEW — parsed customField defs from the corner [{ key, name, nameAr }]
  baseCustomFieldValues = {},    // NEW — base product's customFieldValues to prefill from
  suggestedCustomFields = {},    // NEW — autocomplete suggestions per custom field
}) {
  const fileInputRefs = useRef({});
  const [expanded, setExpanded] = useState({});

  // Mirror BookCreate's detailFields filter so the variant card shows only
  // the inputs the admin opted in for this corner.
  //   - No corner selected at all → hide every conditional field. Admin must
  //     pick a corner first; otherwise we'd show the union of every possible
  //     attribute, which is noisy and meaningless.
  //   - Corner selected, no detailFields config → fall back to "show all"
  //     (matches the existing convention in BookCreate's base form).
  //   - Corner with detailFields → show only those listed.
  const visibleFields = useMemo(() => {
    if (!category?.detailFields) return null;
    try {
      const parsed = JSON.parse(category.detailFields);
      return Array.isArray(parsed) ? parsed : (parsed.detail || null);
    } catch { return null; }
  }, [category]);
  const show = (key) => {
    if (!category) return false;
    if (!visibleFields) return true;
    return visibleFields.includes(key);
  };

  const update = (idx, patch) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const addRow = () => {
    const fresh = { ...blank(basePrefill, baseCustomFieldValues), sortOrder: 0 };
    // New variants almost always need spec fields filled in — open the
    // Product Details section by default. Existing (DB-loaded) variants
    // stay collapsed.
    setExpanded((p) => ({ ...p, [fresh._key]: true }));
    setVariants((prev) => [...prev, { ...fresh, sortOrder: prev.length }]);
  };

  // Update one custom field value within a single variant
  const updateCF = (idx, key, partial) => {
    setVariants((prev) => prev.map((v, i) => {
      if (i !== idx) return v;
      const cfs = { ...(v.customFieldValues || {}) };
      cfs[key] = { ...(cfs[key] || {}), ...partial };
      return { ...v, customFieldValues: cfs };
    }));
  };

  const removeRow = (idx) => {
    setVariants((prev) => {
      const removed = prev[idx];
      if (removed) {
        const key = removed._key || removed.id || idx;
        setExpanded((p) => {
          if (!(key in p)) return p;
          const next = { ...p };
          delete next[key];
          return next;
        });
      }
      return prev.filter((_, i) => i !== idx).map((v, i) => ({ ...v, sortOrder: i }));
    });
  };

  const handleImagePick = (idx, file) => {
    const preview = URL.createObjectURL(file);
    update(idx, { imageFile: file, imagePreview: preview });
  };

  return (
    <div className="space-y-4">
      {variants.length === 0 && (
        <p className="text-sm text-admin-muted bg-gray-50 border border-dashed border-admin-border rounded-lg p-6 text-center">
          {t('books.noVariantsYet')}
        </p>
      )}

      {variants.map((v, idx) => {
        const dup = duplicateSkuIndices.has(idx);
        const existingImageUrl = v.image && apiBase ? `${apiBase}/${v.image}` : null;
        const previewSrc = v.imagePreview || existingImageUrl;
        const variantKey = v._key || v.id || idx;
        const isExpanded = !!expanded[variantKey];
        const anyDetailFieldVisible =
          show('author') || show('publisher') || show('isbn') || show('pages') ||
          show('language') || show('publishedDate') || show('color') || show('brand') ||
          show('material') || show('dimensions') || show('weight') || show('ageRange') ||
          (Array.isArray(categoryCustomFields) && categoryCustomFields.length > 0);
        return (
          <div
            key={v._key || v.id || idx}
            className="bg-white border border-admin-border rounded-lg p-4 shadow-sm"
          >
            {/* Header: option N + active/out-of-stock toggles + delete */}
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-admin-accent">
                {t('books.variants_one')} {idx + 1}
              </span>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-admin-text">
                  <input
                    type="checkbox"
                    checked={v.isActive !== false}
                    onChange={(e) => update(idx, { isActive: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-admin-input-border text-admin-accent focus:ring-admin-accent"
                  />
                  {t('common.active')}
                </label>
                <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-admin-text">
                  <input
                    type="checkbox"
                    checked={!!v.isOutOfStock}
                    onChange={(e) => update(idx, { isOutOfStock: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-red-300 text-red-500 focus:ring-red-400"
                  />
                  <span className={v.isOutOfStock ? 'text-red-600' : ''}>{t('books.outOfStock')}</span>
                </label>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="p-1.5 text-admin-muted hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  aria-label={t('common.delete')}
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Image — left column */}
              <div className="flex-shrink-0">
                <label className={labelClass}>{t('books.image')}</label>
                <div
                  onClick={() => fileInputRefs.current[idx]?.click()}
                  className="relative w-24 h-24 sm:w-28 sm:h-28 bg-gray-50 border-2 border-dashed border-admin-border rounded-lg cursor-pointer hover:border-admin-accent transition-colors overflow-hidden flex items-center justify-center"
                >
                  {previewSrc ? (
                    <img src={previewSrc} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-admin-muted">
                      <FiImage size={20} className="mx-auto mb-1" />
                      <span className="text-[10px]">{t('common.upload')}</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  ref={(el) => { fileInputRefs.current[idx] = el; }}
                  onChange={(e) => e.target.files?.[0] && handleImagePick(idx, e.target.files[0])}
                />
                {previewSrc && (
                  <button
                    type="button"
                    onClick={() => update(idx, { imageFile: null, imagePreview: null, image: '' })}
                    className="text-[10px] text-red-500 mt-1 hover:underline"
                  >
                    {t('common.remove')}
                  </button>
                )}
                {!previewSrc && (
                  <p className="text-[10px] text-admin-muted mt-1 max-w-[112px]">
                    {t('books.variantImageHint')}
                  </p>
                )}
              </div>

              {/* Fields — right column */}
              <div className="flex-1 space-y-3 min-w-0">
                {/* Row 1: Label EN + Label AR (always shown) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{t('books.variantLabelEn')}</label>
                    <input
                      value={v.label}
                      onChange={(e) => update(idx, { label: e.target.value })}
                      placeholder={t('books.variantLabelPlaceholderEn')}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('books.variantLabelAr')}</label>
                    <input
                      value={v.labelAr}
                      onChange={(e) => update(idx, { labelAr: e.target.value })}
                      placeholder={t('books.variantLabelPlaceholderAr')}
                      dir="rtl"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Row 2: Barcode + Price + Stock (always shown) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>{t('books.barcode')}</label>
                    <input
                      value={v.sku}
                      onChange={(e) => update(idx, { sku: e.target.value })}
                      placeholder={t('books.variantBarcodePlaceholder')}
                      className={`${inputClass} ${dup ? 'border-red-400' : ''}`}
                    />
                    {dup && <p className="text-[10px] text-red-500 mt-1">{t('books.duplicateBarcode')}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t('books.priceQAR')}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={v.price}
                      onChange={(e) => update(idx, { price: e.target.value })}
                      placeholder="0.00"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('books.stock')}</label>
                    <input
                      type="number"
                      min="0"
                      value={v.stock}
                      onChange={(e) => update(idx, { stock: e.target.value })}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Row 3: Purchase price + Compare-at price (always shown) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{t('books.purchasePrice')}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={v.purchasePrice}
                      onChange={(e) => update(idx, { purchasePrice: e.target.value })}
                      placeholder="0.00"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('books.compareAtPrice')}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={v.compareAtPrice}
                      onChange={(e) => update(idx, { compareAtPrice: e.target.value })}
                      placeholder="0.00"
                      className={inputClass}
                    />
                  </div>
                </div>

                {anyDetailFieldVisible && (
                  <button
                    type="button"
                    onClick={() => setExpanded((p) => ({ ...p, [variantKey]: !p[variantKey] }))}
                    className="flex items-center gap-2 w-full pt-2 mt-1 border-t border-admin-border text-[11px] font-semibold uppercase tracking-wider text-admin-muted hover:text-admin-accent transition-colors"
                  >
                    <FiChevronDown
                      size={14}
                      className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                    {t('books.productDetails')}
                  </button>
                )}

                {/* Conditional rows — gated by category.detailFields */}
                {isExpanded && (<>
                {show('author') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{t('books.authorEn')}</label>
                      <AutocompleteInput
                        name={`variant-author-${idx}`}
                        value={v.author}
                        onChange={(e) => update(idx, { author: e.target.value })}
                        suggestions={suggestedAuthors}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('books.authorAr')}</label>
                      <AutocompleteInput
                        name={`variant-author-ar-${idx}`}
                        value={v.authorAr}
                        onChange={(e) => update(idx, { authorAr: e.target.value })}
                        suggestions={suggestedAuthorsAr}
                        dir="rtl"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {show('publisher') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{t('books.publisherEn')}</label>
                      <AutocompleteInput
                        name={`variant-publisher-${idx}`}
                        value={v.publisher}
                        onChange={(e) => update(idx, { publisher: e.target.value })}
                        suggestions={suggestedPublishers}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('books.publisherAr')}</label>
                      <AutocompleteInput
                        name={`variant-publisher-ar-${idx}`}
                        value={v.publisherAr}
                        onChange={(e) => update(idx, { publisherAr: e.target.value })}
                        suggestions={suggestedPublishersAr}
                        dir="rtl"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {(show('isbn') || show('pages') || show('language')) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {show('isbn') && (
                      <div>
                        <label className={labelClass}>{t('books.isbn')}</label>
                        <input
                          value={v.isbn}
                          onChange={(e) => update(idx, { isbn: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    )}
                    {show('pages') && (
                      <div>
                        <label className={labelClass}>{t('books.pages')}</label>
                        <input
                          type="number"
                          min="0"
                          value={v.pages}
                          onChange={(e) => update(idx, { pages: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    )}
                    {show('language') && (
                      <div>
                        <label className={labelClass}>{t('books.language')}</label>
                        <select
                          value={v.language}
                          onChange={(e) => update(idx, { language: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">{t('books.selectLanguage')}</option>
                          <option value="en">{t('books.langEnglish')}</option>
                          <option value="ar">{t('books.langArabic')}</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {show('publishedDate') && (
                  <div>
                    <label className={labelClass}>{t('books.publishedDate')}</label>
                    <input
                      type="date"
                      value={v.publishedDate ? String(v.publishedDate).slice(0, 10) : ''}
                      onChange={(e) => update(idx, { publishedDate: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                )}

                {show('color') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{t('books.color')}</label>
                      <AutocompleteInput
                        name={`variant-color-${idx}`}
                        value={v.color}
                        onChange={(e) => update(idx, { color: e.target.value })}
                        suggestions={suggestedColors}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('books.colorAr')}</label>
                      <AutocompleteInput
                        name={`variant-color-ar-${idx}`}
                        value={v.colorAr}
                        onChange={(e) => update(idx, { colorAr: e.target.value })}
                        suggestions={suggestedColorsAr}
                        dir="rtl"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {show('brand') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{t('books.brand')}</label>
                      <AutocompleteInput
                        name={`variant-brand-${idx}`}
                        value={v.brand}
                        onChange={(e) => update(idx, { brand: e.target.value })}
                        suggestions={suggestedBrands}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('books.brandAr')}</label>
                      <AutocompleteInput
                        name={`variant-brand-ar-${idx}`}
                        value={v.brandAr}
                        onChange={(e) => update(idx, { brandAr: e.target.value })}
                        suggestions={suggestedBrandsAr}
                        dir="rtl"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {show('material') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{t('books.material')}</label>
                      <AutocompleteInput
                        name={`variant-material-${idx}`}
                        value={v.material}
                        onChange={(e) => update(idx, { material: e.target.value })}
                        suggestions={suggestedMaterials}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('books.materialAr')}</label>
                      <AutocompleteInput
                        name={`variant-material-ar-${idx}`}
                        value={v.materialAr}
                        onChange={(e) => update(idx, { materialAr: e.target.value })}
                        suggestions={suggestedMaterialsAr}
                        dir="rtl"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {(show('dimensions') || show('weight') || show('ageRange')) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {show('dimensions') && (
                      <div>
                        <label className={labelClass}>{t('books.dimensions')}</label>
                        <input
                          value={v.dimensions}
                          onChange={(e) => update(idx, { dimensions: e.target.value })}
                          placeholder={t('books.dimPlaceholder')}
                          className={inputClass}
                        />
                      </div>
                    )}
                    {show('weight') && (
                      <div>
                        <label className={labelClass}>{t('books.weight')}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={v.weight}
                          onChange={(e) => update(idx, { weight: e.target.value })}
                          placeholder="0.00"
                          className={inputClass}
                        />
                      </div>
                    )}
                    {show('ageRange') && (
                      <div>
                        <label className={labelClass}>{t('books.ageRange')}</label>
                        <input
                          value={v.ageRange}
                          onChange={(e) => update(idx, { ageRange: e.target.value })}
                          placeholder={t('books.agePlaceholder')}
                          className={inputClass}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Custom fields — admin-defined per corner. Same EN/AR pattern
                    as the base product, but stored on each variant so this
                    option can override individual custom field values. */}
                {Array.isArray(categoryCustomFields) && categoryCustomFields.length > 0 && categoryCustomFields.map((cf) => {
                  const cfSuggestions = suggestedCustomFields[cf.key] || [];
                  const cfVal = v.customFieldValues?.[cf.key] || {};
                  const cfLabel = language === 'ar' && cf.nameAr ? cf.nameAr : cf.name;
                  return (
                    <div key={cf.key} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>{cfLabel}</label>
                        <AutocompleteInput
                          name={`variant-cf-${idx}-${cf.key}`}
                          value={cfVal.value || ''}
                          onChange={(e) => updateCF(idx, cf.key, { value: e.target.value })}
                          suggestions={cfSuggestions.map((s) => s.value).filter(Boolean)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{cfLabel} ({t('books.langArabic')})</label>
                        <AutocompleteInput
                          name={`variant-cf-${idx}-${cf.key}-ar`}
                          value={cfVal.valueAr || ''}
                          onChange={(e) => updateCF(idx, cf.key, { valueAr: e.target.value })}
                          suggestions={cfSuggestions.map((s) => s.valueAr).filter(Boolean)}
                          dir="rtl"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  );
                })}
                </>)}
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addRow}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-admin-accent border-2 border-dashed border-admin-accent rounded-lg hover:bg-admin-accent hover:text-white transition-colors"
      >
        <FiPlus size={14} />
        {t('books.addVariant')}
      </button>
    </div>
  );
}

VariantsPanel.blank = blank;
