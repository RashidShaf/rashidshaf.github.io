import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');

export default function BookEdit() {
  const { id } = useParams();
  const { t, language, isRTL } = useLanguageStore();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const imagesRef = useRef(null);

  const [allCategories, setAllCategories] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '', titleAr: '', author: '', authorAr: '', isbn: '',
    description: '', descriptionAr: '', price: '', compareAtPrice: '',
    publisher: '', publisherAr: '', language: 'en', pages: '',
    stock: '0', parentCategoryId: '', categoryId: '', tags: '',
    brand: '', material: '', color: '', dimensions: '', ageRange: '',
    isFeatured: false, isBestseller: false, isNewArrival: false, isTrending: false, isComingSoon: false, isActive: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookRes, catRes] = await Promise.all([
          api.get(`/admin/books/${id}`),
          api.get('/admin/categories'),
        ]);
        const book = bookRes.data;
        const cats = catRes.data.data || catRes.data;
        setAllCategories(cats);

        // Determine parent category
        let parentCatId = '';
        let subCatId = '';
        if (book.categoryId) {
          const bookCat = cats.find((c) => c.id === book.categoryId);
          if (bookCat) {
            if (bookCat.parentId) {
              parentCatId = bookCat.parentId;
              subCatId = bookCat.id;
            } else {
              parentCatId = bookCat.id;
              subCatId = '';
            }
          }
        }

        setForm({
          title: book.title || '',
          titleAr: book.titleAr || '',
          author: book.author || '',
          authorAr: book.authorAr || '',
          isbn: book.isbn || '',
          description: book.description || '',
          descriptionAr: book.descriptionAr || '',
          price: book.price ? parseFloat(book.price).toString() : '',
          compareAtPrice: book.compareAtPrice ? parseFloat(book.compareAtPrice).toString() : '',
          publisher: book.publisher || '',
          publisherAr: book.publisherAr || '',
          language: book.language || 'en',
          pages: book.pages ? book.pages.toString() : '',
          stock: book.stock != null ? book.stock.toString() : '0',
          parentCategoryId: parentCatId,
          categoryId: subCatId,
          tags: Array.isArray(book.tags) ? book.tags.join(', ') : '',
          brand: book.brand || '',
          material: book.material || '',
          color: book.color || '',
          dimensions: book.dimensions || '',
          ageRange: book.ageRange || '',
          isFeatured: book.isFeatured || false,
          isBestseller: book.isBestseller || false,
          isNewArrival: book.isNewArrival || false,
          isTrending: book.isTrending || false,
          isComingSoon: book.isComingSoon || false,
          isActive: book.isActive !== false,
        });

        if (book.coverImage) setCoverPreview(`${API_BASE}/${book.coverImage}`);
        if (book.images && book.images.length > 0) setExistingImages(book.images);
      } catch (err) {
        toast.error('Failed to load product');
        navigate('/books');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const parentCategories = useMemo(() => allCategories.filter((c) => !c.parentId), [allCategories]);
  const subCategories = useMemo(() => {
    if (!form.parentCategoryId) return [];
    return allCategories.filter((c) => c.parentId === form.parentCategoryId);
  }, [form.parentCategoryId, allCategories]);

  const selectedParent = parentCategories.find((c) => c.id === form.parentCategoryId);
  const cornerSlug = selectedParent?.slug?.toLowerCase() || '';
  const isBooks = cornerSlug === 'books';

  const getName = (cat) => language === 'ar' && cat.nameAr ? cat.nameAr : cat.name;

  const totalImages = existingImages.length + newImageFiles.length;

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = 3 - totalImages;
    if (remaining <= 0) return;
    const limited = files.slice(0, remaining);
    setNewImageFiles((prev) => [...prev, ...limited]);
    setNewImagePreviews((prev) => [...prev, ...limited.map((f) => URL.createObjectURL(f))]);
  };

  const removeExistingImage = async (imageUrl) => {
    try {
      await api.delete(`/admin/books/${id}/images`, { data: { imageUrl } });
      setExistingImages((prev) => prev.filter((img) => img !== imageUrl));
      toast.success('Image removed');
    } catch { toast.error('Failed to remove image'); }
  };

  const removeNewImage = (index) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

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
      if (payload.categoryId) {
        // keep sub-category
      } else if (payload.parentCategoryId) {
        payload.categoryId = payload.parentCategoryId;
      }
      delete payload.parentCategoryId;

      if (!payload.categoryId) delete payload.categoryId;
      if (!payload.compareAtPrice) delete payload.compareAtPrice;
      if (!payload.isbn) delete payload.isbn;
      ['brand', 'material', 'color', 'dimensions', 'ageRange'].forEach((f) => {
        if (!payload[f]) payload[f] = null;
      });

      await api.put(`/admin/books/${id}`, payload);

      if (coverFile) {
        const fd = new FormData();
        fd.append('cover', coverFile);
        await api.post(`/admin/books/${id}/cover`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (newImageFiles.length > 0) {
        const fd = new FormData();
        newImageFiles.forEach((f) => fd.append('images', f));
        await api.post(`/admin/books/${id}/images`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('Product updated');
      const tab = form.parentCategoryId || '';
      navigate(`/books${tab ? `?tab=${tab}` : ''}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 bg-white border border-admin-input-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent';
  const labelClass = 'block text-sm font-medium text-admin-text mb-1.5';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-admin-accent/30 border-t-admin-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/books" className="p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100 transition-colors">
          <FiArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
        </Link>
        <h2 className="text-2xl font-bold text-admin-text">{t('books.editBook')}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Category — at top for easy selection */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider">Category</h3>
              <div className="grid sm:grid-cols-2 gap-4">
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
                      <option value="">— All {selectedParent ? getName(selectedParent) : ''} —</option>
                      {subCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{getName(cat)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

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
                    <label className={labelClass}>Author (English)</label>
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

            {/* Non-book fields */}
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
                  <label className={labelClass}>Stock</label>
                  <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-8 py-3 bg-admin-accent text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50">
                {saving ? t('common.loading') : t('common.save')}
              </button>
              <Link to="/books" className="px-8 py-3 text-center border border-admin-border text-admin-muted rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium">
                {t('common.cancel')}
              </Link>
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
                {existingImages.map((img, i) => (
                  <div key={`existing-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img src={`${API_BASE}/${img}`} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeExistingImage(img)} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80">
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
                {newImagePreviews.map((preview, i) => (
                  <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeNewImage(i)} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80">
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
                {totalImages < 3 && (
                  <button type="button" onClick={() => imagesRef.current?.click()} className="aspect-square border-2 border-dashed border-admin-border rounded-lg flex flex-col items-center justify-center hover:border-admin-accent transition-colors cursor-pointer">
                    <FiUpload className="w-5 h-5 text-admin-muted mb-1" />
                    <span className="text-[10px] text-admin-muted">Add</span>
                  </button>
                )}
              </div>
              <input ref={imagesRef} type="file" accept="image/*" multiple onChange={handleAddImages} className="hidden" />
              <p className="text-[11px] text-admin-muted">Max 3 images</p>
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
              <div className="border-t border-admin-border pt-3 mt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="w-4 h-4 rounded border-admin-border text-admin-accent focus:ring-admin-accent" />
                  <span className="text-sm text-admin-text font-medium">Active</span>
                </label>
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
        </div>
      </form>
    </motion.div>
  );
}
