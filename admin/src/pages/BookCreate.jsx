import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
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
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', titleAr: '', author: '', authorAr: '', isbn: '',
    description: '', descriptionAr: '', price: '', compareAtPrice: '',
    publisher: '', publisherAr: '', language: 'en', pages: '',
    stock: '0', parentCategoryId: '', categoryId: '', tags: '',
    brand: '', material: '', color: '', dimensions: '', ageRange: '',
    isFeatured: false, isBestseller: false, isNewArrival: false, isTrending: false, isComingSoon: false,
  });

  // Fetch all categories (with children)
  useEffect(() => {
    api.get('/admin/categories').then((res) => {
      const all = res.data.data || res.data;
      setAllCategories(all);
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
  const subCategories = useMemo(() => {
    if (!form.parentCategoryId) return [];
    return allCategories.filter((c) => c.parentId === form.parentCategoryId);
  }, [form.parentCategoryId, allCategories]);

  // Determine which corner is selected
  const selectedParent = parentCategories.find((c) => c.id === form.parentCategoryId);
  const cornerSlug = selectedParent?.slug?.toLowerCase() || '';
  const isBooks = cornerSlug === 'books';

  const getName = (cat) => language === 'ar' && cat.nameAr ? cat.nameAr : cat.name;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'isComingSoon' && checked) {
      setForm((prev) => ({ ...prev, isComingSoon: true, isFeatured: false, isBestseller: false, isNewArrival: false, isTrending: false }));
    } else if (name === 'parentCategoryId') {
      setForm((prev) => ({ ...prev, parentCategoryId: value, categoryId: '' }));
    } else {
      setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

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
      // Use sub-category if selected, otherwise parent
      if (payload.categoryId) {
        // keep it
      } else if (payload.parentCategoryId) {
        payload.categoryId = payload.parentCategoryId;
      }
      delete payload.parentCategoryId;

      if (!payload.categoryId) delete payload.categoryId;
      if (!payload.compareAtPrice) delete payload.compareAtPrice;
      if (!payload.isbn) delete payload.isbn;
      // Clean empty optional fields
      ['brand', 'material', 'color', 'dimensions', 'ageRange'].forEach((f) => {
        if (!payload[f]) delete payload[f];
      });

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

  const inputClass = 'w-full px-3 py-2.5 bg-white border border-admin-input-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent';
  const labelClass = 'block text-sm font-medium text-admin-text mb-1.5';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/books" className="p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100 transition-colors">
          <FiArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
        </Link>
        <h2 className="text-2xl font-bold text-admin-text">{t('books.addBook')}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Details */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider">Product Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Title (English) *</label>
                  <input name="title" value={form.title} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Title (Arabic)</label>
                  <input name="titleAr" value={form.titleAr} onChange={handleChange} dir="rtl" className={inputClass} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
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

            {/* Book-specific fields */}
            {isBooks && (
              <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider">Book Details</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Author (English) *</label>
                    <input name="author" value={form.author} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Author (Arabic)</label>
                    <input name="authorAr" value={form.authorAr} onChange={handleChange} dir="rtl" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>ISBN</label>
                    <input name="isbn" value={form.isbn} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Pages</label>
                    <input name="pages" type="number" min="0" value={form.pages} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Publisher (English)</label>
                    <input name="publisher" value={form.publisher} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Publisher (Arabic)</label>
                    <input name="publisherAr" value={form.publisherAr} onChange={handleChange} dir="rtl" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Language</label>
                  <select name="language" value={form.language} onChange={handleChange} className={inputClass}>
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
              </div>
            )}

            {/* Non-book fields (Stationary, Gifts, Toys, Electronics, etc.) */}
            {!isBooks && form.parentCategoryId && (
              <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider">Product Specifications</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Brand</label>
                    <input name="brand" value={form.brand} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Material</label>
                    <input name="material" value={form.material} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Color</label>
                    <input name="color" value={form.color} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Dimensions</label>
                    <input name="dimensions" value={form.dimensions} onChange={handleChange} placeholder="e.g. 20x15x5 cm" className={inputClass} />
                  </div>
                  {(cornerSlug === 'toys' || cornerSlug === 'school-project') && (
                    <div>
                      <label className={labelClass}>Age Range</label>
                      <input name="ageRange" value={form.ageRange} onChange={handleChange} placeholder="e.g. 3-6 years" className={inputClass} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pricing & Inventory */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider">Pricing & Inventory</h3>
              {form.isComingSoon && <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">Coming Soon — pricing and stock fields are optional</p>}
              <div className="grid sm:grid-cols-3 gap-4">
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

            {/* Tags */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider">Tags</h3>
              <div>
                <label className={labelClass}>Tags (comma separated)</label>
                <input name="tags" value={form.tags} onChange={handleChange} placeholder="fiction, bestseller, classic" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Cover Image */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
              <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider mb-4">Cover Image</h3>
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
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
              <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider mb-4">Additional Images</h3>
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

            {/* Category */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider">Category</h3>
              <div>
                <label className={labelClass}>Corner</label>
                <select name="parentCategoryId" value={form.parentCategoryId} onChange={handleChange} className={inputClass}>
                  <option value="">— Select Corner —</option>
                  {parentCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{getName(cat)}</option>
                  ))}
                </select>
              </div>
              {subCategories.length > 0 && (
                <div>
                  <label className={labelClass}>Sub-category</label>
                  <select name="categoryId" value={form.categoryId} onChange={handleChange} className={inputClass}>
                    <option value="">— All {getName(selectedParent)} —</option>
                    {subCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{getName(cat)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Section Flags */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider">Show in Sections</h3>
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

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button type="submit" disabled={saving} className="w-full py-3 bg-admin-accent text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50">
                {saving ? t('common.loading') : t('books.addBook')}
              </button>
              <Link to="/books" className="w-full py-3 text-center border border-admin-border text-admin-muted rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium">
                {t('common.cancel')}
              </Link>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
