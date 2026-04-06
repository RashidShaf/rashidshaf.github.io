import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiX, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import AutocompleteInput from '../components/AutocompleteInput';
import api from '../utils/api';

export default function BookCreate() {
  const { t, language, isRTL } = useLanguageStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileRef = useRef(null);
  const imagesRef = useRef(null);

  const [allCategories, setAllCategories] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [expandedSubs, setExpandedSubs] = useState({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', titleAr: '', author: '', authorAr: '', isbn: '', sku: '',
    description: '', descriptionAr: '', price: '', compareAtPrice: '',
    publisher: '', publisherAr: '', language: 'en', pages: '',
    stock: '0', parentCategoryId: '', tags: '',
    publishedDate: '', weight: '',
    brand: '', material: '', color: '', dimensions: '', ageRange: '',
    isFeatured: false, isBestseller: false, isNewArrival: false, isTrending: false, isComingSoon: false, isOutOfStock: false,
  });

  const [suggestedAuthors, setSuggestedAuthors] = useState([]);
  const [suggestedPublishers, setSuggestedPublishers] = useState([]);
  const [suggestedBrands, setSuggestedBrands] = useState([]);

  // Fetch all categories (with children)
  useEffect(() => {
    api.get('/admin/categories').then((res) => {
      const all = res.data.data || res.data;
      setAllCategories(all);
    }).catch(() => {});
    // Fetch existing authors, publishers, brands for autocomplete
    api.get('/books/filters').then((res) => {
      setSuggestedAuthors(res.data.authors || []);
      setSuggestedPublishers(res.data.publishers || []);
      setSuggestedBrands(res.data.brands || []);
    }).catch(() => {});
  }, []);

  // Pre-select parent from URL param
  useEffect(() => {
    const preselect = searchParams.get('category');
    if (preselect && allCategories.length > 0) {
      const isParent = allCategories.some((c) => c.id === preselect && !c.parentId);
      if (isParent) {
        setForm((prev) => ({ ...prev, parentCategoryId: preselect }));
      }
    }
  }, [searchParams, allCategories]);

  const parentCategories = useMemo(() => allCategories.filter((c) => !c.parentId), [allCategories]);

  // Level 2 categories for selected corner
  const cornerChildren = useMemo(() => {
    if (!form.parentCategoryId) return [];
    return allCategories.filter((c) => c.parentId === form.parentCategoryId);
  }, [form.parentCategoryId, allCategories]);

  // Determine which corner is selected
  const selectedParent = parentCategories.find((c) => c.id === form.parentCategoryId);
  const cornerSlug = selectedParent?.slug?.toLowerCase() || '';
  const isBooks = cornerSlug === 'books';

  // Dynamic detail fields based on category config
  const visibleFields = useMemo(() => {
    if (!selectedParent?.detailFields) return null; // null = show all
    try { return JSON.parse(selectedParent.detailFields); } catch { return null; }
  }, [selectedParent]);
  const show = (key) => !visibleFields || visibleFields.includes(key);

  const getName = (cat) => language === 'ar' && cat.nameAr ? cat.nameAr : cat.name;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'isComingSoon' && checked) {
      setForm((prev) => ({ ...prev, isComingSoon: true, isFeatured: false, isBestseller: false, isNewArrival: false, isTrending: false }));
    } else if (name === 'parentCategoryId') {
      setForm((prev) => ({ ...prev, parentCategoryId: value }));
      setSelectedCategoryIds([]);
      setExpandedSubs({});
    } else {
      setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const toggleCategorySelect = (catId) => {
    const isSelecting = !selectedCategoryIds.includes(catId);
    setSelectedCategoryIds((prev) =>
      isSelecting ? [...prev, catId] : prev.filter((id) => id !== catId)
    );
    // Auto-expand if checking a Level 2 that has Level 3 children
    if (isSelecting) {
      const hasChildren = allCategories.some((c) => c.parentId === catId);
      if (hasChildren) setExpandedSubs((prev) => ({ ...prev, [catId]: true }));
    }
  };

  // Compute primary category ID (first selected or corner)
  const primaryCategoryId = selectedCategoryIds[0] || '';

  const handleAdditionalImages = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = 3 - additionalImages.length;
    if (remaining <= 0) return;
    const limited = files.slice(0, remaining);
    setAdditionalImages((prev) => [...prev, ...limited]);
    setImagePreviews((prev) => [...prev, ...limited.map((f) => URL.createObjectURL(f))]);
  };

  const removeAdditionalImage = (index) => {
    setAdditionalImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCover = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.parentCategoryId;

      // First selected = primary, rest = additional
      if (selectedCategoryIds.length > 0) {
        payload.categoryId = selectedCategoryIds[0];
        if (selectedCategoryIds.length > 1) {
          payload.additionalCategoryIds = selectedCategoryIds.slice(1);
        }
      } else if (form.parentCategoryId) {
        payload.categoryId = form.parentCategoryId;
      }

      if (!payload.categoryId) delete payload.categoryId;
      if (!payload.compareAtPrice) delete payload.compareAtPrice;
      if (!payload.isbn) delete payload.isbn;
      if (!payload.sku) delete payload.sku;
      // Clean empty optional fields
      ['brand', 'material', 'color', 'dimensions', 'ageRange', 'weight'].forEach((f) => {
        if (!payload[f]) delete payload[f];
      });
      if (payload.publishedDate) {
        payload.publishedDate = new Date(payload.publishedDate).toISOString();
      } else {
        delete payload.publishedDate;
      }

      const res = await api.post('/admin/books', payload);
      const bookId = res.data.id;

      if (coverFile && bookId) {
        const fd = new FormData();
        fd.append('cover', coverFile);
        await api.post(`/admin/books/${bookId}/cover`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (additionalImages.length > 0 && bookId) {
        const fd = new FormData();
        additionalImages.forEach((f) => fd.append('images', f));
        await api.post(`/admin/books/${bookId}/images`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('Product created');
      const tab = form.parentCategoryId || '';
      navigate(`/books${tab ? `?tab=${tab}` : ''}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 3xl:px-4 3xl:py-3 bg-white border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent';
  const labelClass = 'block text-sm 3xl:text-base font-medium text-admin-text mb-1.5';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center gap-3 mb-6 3xl:mb-8">
        <Link to="/books" className="p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100 transition-colors">
          <FiArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
        </Link>
        <h2 className="text-2xl 3xl:text-3xl font-bold text-admin-text">{t('books.addBook')}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6 3xl:gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6 3xl:space-y-8">
            {/* Category — Corner dropdown + checkbox tree */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">Category</h3>
              <div>
                <label className={labelClass}>Corner *</label>
                <select name="parentCategoryId" value={form.parentCategoryId} onChange={handleChange} className={inputClass}>
                  <option value="">— Select Corner —</option>
                  {parentCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{getName(cat)}</option>
                  ))}
                </select>
              </div>

              {cornerChildren.length > 0 && (
                <div>
                  <label className={labelClass}>Select Categories</label>
                  <div className="border border-admin-input-border rounded-lg max-h-64 overflow-y-auto">
                    {cornerChildren.map((sub) => {
                      const subChildren = allCategories.filter((c) => c.parentId === sub.id);
                      const hasChildren = subChildren.length > 0;
                      const isExpanded = expandedSubs[sub.id];
                      const isChecked = selectedCategoryIds.includes(sub.id);
                      return (
                        <div key={sub.id} className="border-b border-admin-border last:border-0">
                          <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCategorySelect(sub.id)}
                              className="w-4 h-4 rounded border-admin-input-border text-admin-accent focus:ring-admin-accent"
                            />
                            <span className="flex-1 text-sm text-admin-text font-medium">{getName(sub)}</span>
                            {hasChildren && (
                              <button type="button" onClick={() => setExpandedSubs((prev) => ({ ...prev, [sub.id]: !prev[sub.id] }))} className="p-1 text-admin-muted hover:text-admin-text">
                                <FiChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </div>
                          {hasChildren && isExpanded && (
                            <div className="ps-8 pb-2 space-y-0.5">
                              {subChildren.map((l3) => {
                                const l3Checked = selectedCategoryIds.includes(l3.id);
                                return (
                                  <div key={l3.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 rounded">
                                    <input
                                      type="checkbox"
                                      checked={l3Checked}
                                      onChange={() => toggleCategorySelect(l3.id)}
                                      className="w-3.5 h-3.5 rounded border-admin-input-border text-admin-accent focus:ring-admin-accent"
                                    />
                                    <span className="text-sm text-admin-muted">{getName(l3)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {selectedCategoryIds.length > 0 && (
                    <p className="text-xs text-admin-muted mt-2">{selectedCategoryIds.length} {selectedCategoryIds.length === 1 ? 'category' : 'categories'} selected</p>
                  )}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">Product Details</h3>
              <div className="grid sm:grid-cols-2 gap-4 3xl:gap-6">
                <div>
                  <label className={labelClass}>Title (English) *</label>
                  <input name="title" value={form.title} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Title (Arabic)</label>
                  <input name="titleAr" value={form.titleAr} onChange={handleChange} dir="rtl" className={inputClass} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 3xl:gap-6">
                <div>
                  <label className={labelClass}>Description (English)</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={inputClass + ' resize-none'} />
                </div>
                <div>
                  <label className={labelClass}>Description (Arabic)</label>
                  <textarea name="descriptionAr" value={form.descriptionAr} onChange={handleChange} rows={4} dir="rtl" className={inputClass + ' resize-none'} />
                </div>
              </div>
            </div>

            {/* Product Details — fields shown based on category detailFields config */}
            {form.parentCategoryId && (
              <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
                <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">
                  {isBooks ? 'Book Details' : 'Product Specifications'}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4 3xl:gap-6">
                  {show('publisher') && (
                    <div>
                      <label className={labelClass}>Publisher (English)</label>
                      <AutocompleteInput name="publisher" value={form.publisher} onChange={handleChange} suggestions={suggestedPublishers} className={inputClass} />
                    </div>
                  )}
                  {show('publisher') && (
                    <div>
                      <label className={labelClass}>Publisher (Arabic)</label>
                      <input name="publisherAr" value={form.publisherAr} onChange={handleChange} dir="rtl" className={inputClass} />
                    </div>
                  )}
                  {show('isbn') && (
                    <div>
                      <label className={labelClass}>ISBN</label>
                      <input name="isbn" value={form.isbn} onChange={handleChange} className={inputClass} />
                    </div>
                  )}
                  <div>
                    <label className={labelClass}>Barcode</label>
                    <input name="sku" value={form.sku} onChange={handleChange} placeholder="e.g. 978316148410" className={inputClass} />
                  </div>
                  {show('pages') && (
                    <div>
                      <label className={labelClass}>Pages</label>
                      <input name="pages" type="number" min="0" value={form.pages} onChange={handleChange} className={inputClass} />
                    </div>
                  )}
                  {show('language') && (
                    <div>
                      <label className={labelClass}>Language</label>
                      <select name="language" value={form.language} onChange={handleChange} className={inputClass}>
                        <option value="en">English</option>
                        <option value="ar">Arabic</option>
                      </select>
                    </div>
                  )}
                  {show('publishedDate') && (
                    <div>
                      <label className={labelClass}>Published Date</label>
                      <input name="publishedDate" type="date" value={form.publishedDate} onChange={handleChange} className={inputClass} />
                    </div>
                  )}
                  {show('brand') && (
                    <div>
                      <label className={labelClass}>Brand</label>
                      <AutocompleteInput name="brand" value={form.brand} onChange={handleChange} suggestions={suggestedBrands} className={inputClass} />
                    </div>
                  )}
                  {show('color') && (
                    <div>
                      <label className={labelClass}>Color</label>
                      <input name="color" value={form.color} onChange={handleChange} className={inputClass} />
                    </div>
                  )}
                  {show('material') && (
                    <div>
                      <label className={labelClass}>Material</label>
                      <input name="material" value={form.material} onChange={handleChange} className={inputClass} />
                    </div>
                  )}
                  {show('dimensions') && (
                    <div>
                      <label className={labelClass}>Dimensions</label>
                      <input name="dimensions" value={form.dimensions} onChange={handleChange} placeholder="e.g. 20x15x5 cm" className={inputClass} />
                    </div>
                  )}
                  {show('ageRange') && (
                    <div>
                      <label className={labelClass}>Age Range</label>
                      <input name="ageRange" value={form.ageRange} onChange={handleChange} placeholder="e.g. 3-6 years" className={inputClass} />
                    </div>
                  )}
                </div>
                {/* Author fields — always shown when category is selected */}
                <div className="grid sm:grid-cols-2 gap-4 3xl:gap-6 pt-2">
                  <div>
                    <label className={labelClass}>Author (English)</label>
                    <AutocompleteInput name="author" value={form.author} onChange={handleChange} suggestions={suggestedAuthors} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Author (Arabic)</label>
                    <input name="authorAr" value={form.authorAr} onChange={handleChange} dir="rtl" className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {/* Pricing & Inventory */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">Pricing & Inventory</h3>
              {form.isComingSoon && <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">Coming Soon — pricing and stock fields are optional</p>}
              <div className="grid sm:grid-cols-3 gap-4 3xl:gap-6">
                <div>
                  <label className={labelClass}>Price (QAR) *</label>
                  <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Compare at Price</label>
                  <input name="compareAtPrice" type="number" step="0.01" min="0" value={form.compareAtPrice} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Stock *</label>
                  <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-8 py-3 3xl:px-10 3xl:py-3.5 bg-admin-accent text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm 3xl:text-base">
                {saving ? t('common.loading') : t('books.addBook')}
              </button>
              <Link to="/books" className="px-8 py-3 3xl:px-10 3xl:py-3.5 text-center border border-admin-border text-admin-muted rounded-xl hover:bg-gray-50 transition-colors text-sm 3xl:text-base font-medium">
                {t('common.cancel')}
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 3xl:space-y-8">
            {/* Cover Image */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider mb-4">Cover Image</h3>
              <div
                onClick={() => fileRef.current?.click()}
                className="relative w-full aspect-[3/4] border-2 border-dashed border-admin-border rounded-xl cursor-pointer hover:border-admin-accent transition-colors overflow-hidden flex items-center justify-center"
              >
                {coverPreview ? (
                  <>
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); setCoverFile(null); setCoverPreview(null); }} className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80">
                      <FiX size={14} />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <FiUpload className="w-8 h-8 text-admin-muted mx-auto mb-2" />
                    <p className="text-sm text-admin-muted">Click to upload</p>
                    <p className="text-xs text-admin-muted mt-1">JPG, PNG, WebP</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleCover} className="hidden" />
            </div>

            {/* Additional Images */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider mb-4">Additional Images</h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeAdditionalImage(i)} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80">
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 3 && (
                  <button type="button" onClick={() => imagesRef.current?.click()} className="aspect-square border-2 border-dashed border-admin-border rounded-lg flex flex-col items-center justify-center hover:border-admin-accent transition-colors cursor-pointer">
                    <FiUpload className="w-5 h-5 text-admin-muted mb-1" />
                    <span className="text-[10px] text-admin-muted">Add</span>
                  </button>
                )}
              </div>
              <input ref={imagesRef} type="file" accept="image/*" multiple onChange={handleAdditionalImages} className="hidden" />
              <p className="text-[11px] text-admin-muted">Upload multiple product images</p>
            </div>


            {/* Out of Stock */}
            <div className={`bg-admin-card rounded-xl border ${form.isOutOfStock ? 'border-red-300' : 'border-admin-border'} p-6 3xl:p-8 shadow-sm`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="isOutOfStock" checked={form.isOutOfStock} onChange={handleChange} className="w-4 h-4 rounded border-red-300 text-red-500 focus:ring-red-400" />
                <span className={`text-sm font-semibold ${form.isOutOfStock ? 'text-red-600' : 'text-admin-text'}`}>Out of Stock</span>
              </label>
            </div>

            {/* Section Flags */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">Show in Sections</h3>
              {[
                { name: 'isComingSoon', label: 'Coming Soon' },
                { name: 'isFeatured', label: 'Featured' },
                { name: 'isBestseller', label: 'Bestseller' },
                { name: 'isNewArrival', label: 'New Arrival' },
                { name: 'isTrending', label: "Everyone's Talking About" },
              ].map((opt) => {
                const disabled = form.isComingSoon && opt.name !== 'isComingSoon';
                return (
                  <label key={opt.name} className={`flex items-center gap-3 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input type="checkbox" name={opt.name} checked={form[opt.name]} onChange={handleChange} disabled={disabled} className="w-4 h-4 rounded border-admin-border text-admin-accent focus:ring-admin-accent disabled:opacity-50" />
                    <span className="text-sm text-admin-text font-medium">{opt.label}</span>
                  </label>
                );
              })}
            </div>

            {/* Tags */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">Tags</h3>
              <div>
                <label className={labelClass}>Tags (comma separated)</label>
                <input name="tags" value={form.tags} onChange={handleChange} placeholder="fiction, bestseller, classic" className={inputClass} />
              </div>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
