import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiX, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import AutocompleteInput from '../components/AutocompleteInput';
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
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [expandedSubs, setExpandedSubs] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suggestedAuthors, setSuggestedAuthors] = useState([]);
  const [suggestedPublishers, setSuggestedPublishers] = useState([]);
  const [suggestedBrands, setSuggestedBrands] = useState([]);
  const [form, setForm] = useState({
    title: '', titleAr: '', author: '', authorAr: '', isbn: '',
    description: '', descriptionAr: '', price: '', compareAtPrice: '',
    publisher: '', publisherAr: '', language: 'en', pages: '',
    stock: '0', parentCategoryId: '', tags: '',
    publishedDate: '', weight: '',
    brand: '', material: '', color: '', dimensions: '', ageRange: '',
    isFeatured: false, isBestseller: false, isNewArrival: false, isTrending: false, isComingSoon: false, isOutOfStock: false, isActive: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookRes, catRes, filtersRes] = await Promise.all([
          api.get(`/admin/books/${id}`),
          api.get('/admin/categories'),
          api.get('/books/filters'),
        ]);
        setSuggestedAuthors(filtersRes.data.authors || []);
        setSuggestedPublishers(filtersRes.data.publishers || []);
        setSuggestedBrands(filtersRes.data.brands || []);
        const book = bookRes.data;
        const cats = catRes.data.data || catRes.data;
        setAllCategories(cats);

        // Determine corner (Level 1)
        const bookCat = cats.find((c) => c.id === book.categoryId);
        let cornerId = '';
        if (bookCat) {
          if (!bookCat.parentId) {
            cornerId = bookCat.id;
          } else {
            const parent = cats.find((c) => c.id === bookCat.parentId);
            if (parent && !parent.parentId) {
              cornerId = parent.id;
            } else if (parent && parent.parentId) {
              cornerId = parent.parentId;
            }
          }
        }

        // Collect all selected categories (primary + additional)
        const allSelectedIds = [book.categoryId];
        if (book.bookCategories) {
          book.bookCategories.forEach((bc) => {
            if (!allSelectedIds.includes(bc.category.id)) {
              allSelectedIds.push(bc.category.id);
            }
          });
        }

        const formData = {
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
          parentCategoryId: cornerId,
          tags: Array.isArray(book.tags) ? book.tags.join(', ') : '',
          publishedDate: book.publishedDate ? new Date(book.publishedDate).toISOString().split('T')[0] : '',
          weight: book.weight ? parseFloat(book.weight).toString() : '',
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
          isOutOfStock: book.isOutOfStock || false,
          isActive: book.isActive !== false,
        };

        setForm(formData);
        setSelectedCategoryIds(allSelectedIds);

        // Auto-expand Level 2 parents of selected Level 3 categories
        const toExpand = {};
        allSelectedIds.forEach((selId) => {
          const cat = cats.find((c) => c.id === selId);
          if (cat && cat.parentId) {
            const parentCat = cats.find((c) => c.id === cat.parentId);
            if (parentCat && parentCat.parentId) {
              toExpand[parentCat.id] = true; // Level 3's Level 2 parent
            }
          }
        });
        setExpandedSubs(toExpand);

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

  // Level 2 categories for selected corner
  const cornerChildren = useMemo(() => {
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

  const primaryCategoryId = selectedCategoryIds[0] || '';

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
        } else {
          payload.additionalCategoryIds = [];
        }
      } else if (form.parentCategoryId) {
        payload.categoryId = form.parentCategoryId;
        payload.additionalCategoryIds = [];
      } else {
        payload.additionalCategoryIds = [];
      }

      if (!payload.categoryId) delete payload.categoryId;
      if (!payload.compareAtPrice) delete payload.compareAtPrice;
      if (!payload.isbn) delete payload.isbn;
      ['brand', 'material', 'color', 'dimensions', 'ageRange'].forEach((f) => {
        if (!payload[f]) payload[f] = null;
      });
      if (payload.weight) {
        payload.weight = parseFloat(payload.weight);
      } else {
        payload.weight = null;
      }
      if (payload.publishedDate) {
        payload.publishedDate = new Date(payload.publishedDate).toISOString();
      } else {
        payload.publishedDate = null;
      }

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

  const inputClass = 'w-full px-3 py-2.5 3xl:px-4 3xl:py-3 bg-white border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent';
  const labelClass = 'block text-sm 3xl:text-base font-medium text-admin-text mb-1.5';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-admin-accent/30 border-t-admin-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center gap-3 mb-6 3xl:mb-8">
        <Link to="/books" className="p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100 transition-colors">
          <FiArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
        </Link>
        <h2 className="text-2xl 3xl:text-3xl font-bold text-admin-text">{t('books.editBook')}</h2>
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

            {/* Book-specific fields */}
            {isBooks && (
              <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
                <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">Book Details</h3>
                <div className="grid sm:grid-cols-2 gap-4 3xl:gap-6">
                  <div>
                    <label className={labelClass}>Author (English)</label>
                    <AutocompleteInput name="author" value={form.author} onChange={handleChange} suggestions={suggestedAuthors} className={inputClass} />
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
                <div className="grid sm:grid-cols-2 gap-4 3xl:gap-6">
                  <div>
                    <label className={labelClass}>Publisher (English)</label>
                    <AutocompleteInput name="publisher" value={form.publisher} onChange={handleChange} suggestions={suggestedPublishers} className={inputClass} />
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
                <div>
                  <label className={labelClass}>Published Date</label>
                  <input name="publishedDate" type="date" value={form.publishedDate} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            )}

            {/* Non-book fields */}
            {!isBooks && form.parentCategoryId && (
              <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
                <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">Product Specifications</h3>
                <div className="grid sm:grid-cols-2 gap-4 3xl:gap-6">
                  <div>
                    <label className={labelClass}>Brand</label>
                    <AutocompleteInput name="brand" value={form.brand} onChange={handleChange} suggestions={suggestedBrands} className={inputClass} />
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
                  <div>
                    <label className={labelClass}>Weight (g)</label>
                    <input name="weight" type="number" step="0.01" min="0" value={form.weight} onChange={handleChange} placeholder="e.g. 500" className={inputClass} />
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
                  <label className={labelClass}>Stock</label>
                  <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-8 py-3 3xl:px-10 3xl:py-3.5 bg-admin-accent text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm 3xl:text-base">
                {saving ? t('common.loading') : t('common.save')}
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
              <div className="border-t border-admin-border pt-3 mt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="w-4 h-4 rounded border-admin-border text-admin-accent focus:ring-admin-accent" />
                  <span className="text-sm text-admin-text font-medium">Active</span>
                </label>
              </div>
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
