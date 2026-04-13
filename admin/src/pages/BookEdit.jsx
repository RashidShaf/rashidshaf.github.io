import React, { useState, useEffect, useRef, useMemo } from 'react';

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
  const [suggestedAuthorsAr, setSuggestedAuthorsAr] = useState([]);
  const [suggestedPublishers, setSuggestedPublishers] = useState([]);
  const [suggestedPublishersAr, setSuggestedPublishersAr] = useState([]);
  const [suggestedBrands, setSuggestedBrands] = useState([]);
  const [suggestedBrandsAr, setSuggestedBrandsAr] = useState([]);
  const defaultColors = ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Pink', 'Purple', 'Orange', 'Brown', 'Grey'];
  const defaultColorsAr = ['أحمر', 'أزرق', 'أخضر', 'أسود', 'أبيض', 'أصفر', 'وردي', 'بنفسجي', 'برتقالي', 'بني', 'رمادي'];
  const defaultMaterials = ['Wood', 'Plastic', 'Metal', 'Paper', 'Fabric', 'Leather', 'Glass', 'Rubber', 'Silicone'];
  const defaultMaterialsAr = ['خشب', 'بلاستيك', 'معدن', 'ورق', 'قماش', 'جلد', 'زجاج', 'مطاط', 'سيليكون'];
  const [suggestedColors, setSuggestedColors] = useState(defaultColors);
  const [suggestedColorsAr, setSuggestedColorsAr] = useState(defaultColorsAr);
  const [suggestedMaterials, setSuggestedMaterials] = useState(defaultMaterials);
  const [suggestedMaterialsAr, setSuggestedMaterialsAr] = useState(defaultMaterialsAr);
  const [suggestedCustomFields, setSuggestedCustomFields] = useState({});
  const [form, setForm] = useState({
    title: '', titleAr: '', author: '', authorAr: '', isbn: '', sku: '',
    description: '', descriptionAr: '', price: '', purchasePrice: '', compareAtPrice: '',
    publisher: '', publisherAr: '', language: 'en', pages: '',
    stock: '0', parentCategoryId: '', tags: '',
    publishedDate: '', weight: '',
    brand: '', brandAr: '', material: '', materialAr: '', color: '', colorAr: '', dimensions: '', ageRange: '',
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
        const fd = filtersRes.data;
        setSuggestedAuthors((fd.authors || []).map((a) => typeof a === 'string' ? a : a.value));
        setSuggestedAuthorsAr((fd.authors || []).map((a) => typeof a === 'string' ? null : a.valueAr).filter(Boolean));
        setSuggestedPublishers((fd.publishers || []).map((p) => typeof p === 'string' ? p : p.value));
        setSuggestedPublishersAr((fd.publishers || []).map((p) => typeof p === 'string' ? null : p.valueAr).filter(Boolean));
        setSuggestedBrands((fd.brands || []).map((b) => typeof b === 'string' ? b : b.value));
        setSuggestedBrandsAr((fd.brands || []).map((b) => typeof b === 'string' ? null : b.valueAr).filter(Boolean));
        setSuggestedColors([...new Set([...defaultColors, ...(fd.colors || []).map((c) => typeof c === 'string' ? c : c.value)])]);
        setSuggestedColorsAr([...new Set([...defaultColorsAr, ...(fd.colors || []).map((c) => typeof c === 'string' ? null : c.valueAr).filter(Boolean)])]);
        setSuggestedMaterials([...new Set([...defaultMaterials, ...(fd.materials || []).map((m) => typeof m === 'string' ? m : m.value)])]);
        setSuggestedMaterialsAr([...new Set([...defaultMaterialsAr, ...(fd.materials || []).map((m) => typeof m === 'string' ? null : m.valueAr).filter(Boolean)])]);
        if (fd.customFieldValues) setSuggestedCustomFields(fd.customFieldValues);
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
          sku: book.sku || '',
          description: book.description || '',
          descriptionAr: book.descriptionAr || '',
          price: book.price ? parseFloat(book.price).toString() : '',
          purchasePrice: book.purchasePrice ? parseFloat(book.purchasePrice).toString() : '',
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
          brandAr: book.brandAr || '',
          material: book.material || '',
          materialAr: book.materialAr || '',
          color: book.color || '',
          colorAr: book.colorAr || '',
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
        if (book.customFields) {
          try { setCustomFieldValues(JSON.parse(book.customFields)); } catch {}
        }
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
        toast.error(t('books.failedLoadProduct'));
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

  // Dynamic detail fields based on category config
  const visibleFields = useMemo(() => {
    if (!selectedParent?.detailFields) return null;
    try { const parsed = JSON.parse(selectedParent.detailFields); return Array.isArray(parsed) ? parsed : parsed.detail || null; } catch { return null; }
  }, [selectedParent]);
  const show = (key) => !visibleFields || visibleFields.includes(key);

  const categoryCustomFields = useMemo(() => {
    if (!selectedParent?.customFields) return [];
    try { return JSON.parse(selectedParent.customFields); } catch { return []; }
  }, [selectedParent]);
  const [customFieldValues, setCustomFieldValues] = useState({});

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
      toast.success(t('books.imageRemoved'));
    } catch { toast.error(t('books.failedRemoveImage')); }
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
    if (!form.title) { toast.error(t('books.titleRequired')); return; }
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
      if (!payload.purchasePrice) delete payload.purchasePrice;
      if (!payload.compareAtPrice) delete payload.compareAtPrice;
      if (!payload.isbn) delete payload.isbn;
      if (!payload.sku) delete payload.sku;
      ['brand', 'brandAr', 'material', 'materialAr', 'color', 'colorAr', 'dimensions', 'ageRange'].forEach((f) => {
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

      if (Object.keys(customFieldValues).length > 0) {
        payload.customFields = JSON.stringify(customFieldValues);
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

      toast.success(t('books.productUpdated'));
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || t('books.failedUpdate'));
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
    <div>
      <div className="flex items-center gap-3 mb-6 3xl:mb-8">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100 transition-colors">
          <FiArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
        </button>
        <h2 className="text-2xl 3xl:text-3xl font-bold text-admin-text">{t('books.editBook')}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6 3xl:gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6 3xl:space-y-8">
            {/* Category — Corner dropdown + checkbox tree */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">{t('books.category')}</h3>
              <div>
                <label className={labelClass}>{t('books.corner')}</label>
                <select name="parentCategoryId" value={form.parentCategoryId} onChange={handleChange} className={inputClass}>
                  <option value="">{t('books.selectCorner')}</option>
                  {parentCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{getName(cat)}</option>
                  ))}
                </select>
              </div>

              {cornerChildren.length > 0 && (
                <div>
                  <label className={labelClass}>{t('books.selectCategories')}</label>
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
                                const l4Children = allCategories.filter((c) => c.parentId === l3.id);
                                const l3Expanded = expandedSubs[l3.id];
                                return (
                                  <div key={l3.id}>
                                    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 rounded">
                                      <input
                                        type="checkbox"
                                        checked={l3Checked}
                                        onChange={() => toggleCategorySelect(l3.id)}
                                        className="w-3.5 h-3.5 rounded border-admin-input-border text-admin-accent focus:ring-admin-accent"
                                      />
                                      <span className="flex-1 text-sm text-admin-muted">{getName(l3)}</span>
                                      {l4Children.length > 0 && (
                                        <button type="button" onClick={() => setExpandedSubs((prev) => ({ ...prev, [l3.id]: !prev[l3.id] }))} className="p-0.5 text-admin-muted hover:text-admin-text">
                                          <FiChevronDown size={12} className={`transition-transform ${l3Expanded ? 'rotate-180' : ''}`} />
                                        </button>
                                      )}
                                    </div>
                                    {l4Children.length > 0 && l3Expanded && (
                                      <div className="ps-6 space-y-0.5">
                                        {l4Children.map((l4) => (
                                          <div key={l4.id} className="flex items-center gap-2 px-3 py-1 hover:bg-gray-50 rounded">
                                            <input
                                              type="checkbox"
                                              checked={selectedCategoryIds.includes(l4.id)}
                                              onChange={() => toggleCategorySelect(l4.id)}
                                              className="w-3 h-3 rounded border-admin-input-border text-admin-accent focus:ring-admin-accent"
                                            />
                                            <span className="text-xs text-admin-muted">{getName(l4)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
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
                    <p className="text-xs text-admin-muted mt-2">{selectedCategoryIds.length} {selectedCategoryIds.length === 1 ? t('books.category_one') : t('books.category_other')} {t('common.selected')}</p>
                  )}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">{t('books.productDetails')}</h3>
              <div className="grid sm:grid-cols-2 gap-4 3xl:gap-6">
                <div>
                  <label className={labelClass}>{t('books.titleEn')}</label>
                  <input name="title" value={form.title} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('books.titleAr')}</label>
                  <input name="titleAr" value={form.titleAr} onChange={handleChange} dir="rtl" className={inputClass} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 3xl:gap-6">
                <div>
                  <label className={labelClass}>{t('books.descEn')}</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={inputClass + ' resize-none'} />
                </div>
                <div>
                  <label className={labelClass}>{t('books.descAr')}</label>
                  <textarea name="descriptionAr" value={form.descriptionAr} onChange={handleChange} rows={4} dir="rtl" className={inputClass + ' resize-none'} />
                </div>
              </div>
            </div>

            {/* Product Details — fields shown based on category detailFields config */}
            {form.parentCategoryId && (
              <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
                <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">
                  {isBooks ? t('books.bookDetails') : t('books.productSpecs')}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4 3xl:gap-6">
                  {show('author') && (
                    <>
                      <div>
                        <label className={labelClass}>{t('books.authorEn')}</label>
                        <AutocompleteInput name="author" value={form.author} onChange={handleChange} suggestions={suggestedAuthors} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>{t('books.authorAr')}</label>
                        <AutocompleteInput name="authorAr" value={form.authorAr} onChange={handleChange} suggestions={suggestedAuthorsAr} dir="rtl" className={inputClass} />
                      </div>
                    </>
                  )}
                  {show('publisher') && (
                    <>
                      <div>
                        <label className={labelClass}>{t('books.publisherEn')}</label>
                        <AutocompleteInput name="publisher" value={form.publisher} onChange={handleChange} suggestions={suggestedPublishers} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>{t('books.publisherAr')}</label>
                        <AutocompleteInput name="publisherAr" value={form.publisherAr} onChange={handleChange} suggestions={suggestedPublishersAr} dir="rtl" className={inputClass} />
                      </div>
                    </>
                  )}
                  {show('isbn') && (
                    <div>
                      <label className={labelClass}>{t('books.isbn')}</label>
                      <input name="isbn" value={form.isbn} onChange={handleChange} className={inputClass} />
                    </div>
                  )}
                  <div>
                    <label className={labelClass}>{t('books.barcode')}</label>
                    <input name="sku" value={form.sku} onChange={handleChange} placeholder={t('books.barcodePlaceholder')} className={inputClass} />
                  </div>
                  {show('pages') && (
                    <div>
                      <label className={labelClass}>{t('books.pages')}</label>
                      <input name="pages" type="number" min="0" value={form.pages} onChange={handleChange} className={inputClass} />
                    </div>
                  )}
                  {show('language') && (
                    <div>
                      <label className={labelClass}>{t('books.language')}</label>
                      <select name="language" value={form.language} onChange={handleChange} className={inputClass}>
                        <option value="en">{t('books.langEnglish')}</option>
                        <option value="ar">{t('books.langArabic')}</option>
                      </select>
                    </div>
                  )}
                  {show('publishedDate') && (
                    <div>
                      <label className={labelClass}>{t('books.publishedDate')}</label>
                      <input name="publishedDate" type="date" value={form.publishedDate} onChange={handleChange} className={inputClass} />
                    </div>
                  )}
                  {show('brand') && (
                    <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4 3xl:gap-6">
                      <div>
                        <label className={labelClass}>{t('books.brand')}</label>
                        <AutocompleteInput name="brand" value={form.brand} onChange={handleChange} suggestions={suggestedBrands} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>{t('books.brandAr')}</label>
                        <AutocompleteInput name="brandAr" value={form.brandAr} onChange={handleChange} suggestions={suggestedBrandsAr} dir="rtl" className={inputClass} />
                      </div>
                    </div>
                  )}
                  {show('color') && (
                    <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4 3xl:gap-6">
                      <div>
                        <label className={labelClass}>{t('books.color')}</label>
                        <AutocompleteInput name="color" value={form.color} onChange={handleChange} suggestions={suggestedColors} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>{t('books.colorAr')}</label>
                        <AutocompleteInput name="colorAr" value={form.colorAr} onChange={handleChange} suggestions={suggestedColorsAr} dir="rtl" className={inputClass} />
                      </div>
                    </div>
                  )}
                  {show('material') && (
                    <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4 3xl:gap-6">
                      <div>
                        <label className={labelClass}>{t('books.material')}</label>
                        <AutocompleteInput name="material" value={form.material} onChange={handleChange} suggestions={suggestedMaterials} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>{t('books.materialAr')}</label>
                        <AutocompleteInput name="materialAr" value={form.materialAr} onChange={handleChange} suggestions={suggestedMaterialsAr} dir="rtl" className={inputClass} />
                      </div>
                    </div>
                  )}
                  {show('dimensions') && (
                    <div>
                      <label className={labelClass}>{t('books.dimensions')}</label>
                      <input name="dimensions" value={form.dimensions} onChange={handleChange} placeholder={t('books.dimPlaceholder')} className={inputClass} />
                    </div>
                  )}
                  {show('ageRange') && (
                    <div>
                      <label className={labelClass}>{t('books.ageRange')}</label>
                      <input name="ageRange" value={form.ageRange} onChange={handleChange} placeholder={t('books.agePlaceholder')} className={inputClass} />
                    </div>
                  )}
                  {categoryCustomFields.map((cf) => {
                    const cfSuggestions = suggestedCustomFields[cf.key] || [];
                    return (
                      <div key={cf.key} className="sm:col-span-2 grid sm:grid-cols-2 gap-4 3xl:gap-6">
                        <div>
                          <label className={labelClass}>{language === 'ar' && cf.nameAr ? cf.nameAr : cf.name}</label>
                          <AutocompleteInput
                            name={`cf_${cf.key}`}
                            value={customFieldValues[cf.key]?.value || ''}
                            onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [cf.key]: { ...prev[cf.key], value: e.target.value } }))}
                            suggestions={cfSuggestions.map((s) => s.value).filter(Boolean)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{language === 'ar' && cf.nameAr ? cf.nameAr : cf.name} ({t('books.langArabic')})</label>
                          <AutocompleteInput
                            name={`cf_${cf.key}_ar`}
                            value={customFieldValues[cf.key]?.valueAr || ''}
                            onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [cf.key]: { ...prev[cf.key], valueAr: e.target.value } }))}
                            suggestions={cfSuggestions.map((s) => s.valueAr).filter(Boolean)}
                            dir="rtl"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pricing & Inventory */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">{t('books.pricingInventory')}</h3>
              {form.isComingSoon && <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">{t('books.comingSoonNote')}</p>}
              <div className="grid sm:grid-cols-3 gap-4 3xl:gap-6">
                <div>
                  <label className={labelClass}>{t('books.priceQAR')}</label>
                  <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('books.purchasePrice')}</label>
                  <input name="purchasePrice" type="number" step="0.01" min="0" value={form.purchasePrice} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('books.compareAtPrice')}</label>
                  <input name="compareAtPrice" type="number" step="0.01" min="0" value={form.compareAtPrice} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('books.stock')}</label>
                  <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-8 py-3 3xl:px-10 3xl:py-3.5 bg-admin-accent text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm 3xl:text-base">
                {saving ? t('common.loading') : t('common.save')}
              </button>
              <button onClick={() => navigate(-1)} className="px-8 py-3 3xl:px-10 3xl:py-3.5 text-center border border-admin-border text-admin-muted rounded-xl hover:bg-gray-50 transition-colors text-sm 3xl:text-base font-medium">
                {t('common.cancel')}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 3xl:space-y-8">
            {/* Cover Image */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider mb-4">{t('books.coverImage')}</h3>
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
                    <p className="text-sm text-admin-muted">{t('common.clickToUpload')}</p>
                    <p className="text-xs text-admin-muted mt-1">{t('common.fileFormats')}</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleCover} className="hidden" />
            </div>

            {/* Additional Images */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider mb-4">{t('books.additionalImages')}</h3>
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
                    <span className="text-[10px] text-admin-muted">{t('common.add')}</span>
                  </button>
                )}
              </div>
              <input ref={imagesRef} type="file" accept="image/*" multiple onChange={handleAddImages} className="hidden" />
              <p className="text-[11px] text-admin-muted">{t('books.maxImages')}</p>
            </div>


            {/* Out of Stock */}
            <div className={`bg-admin-card rounded-xl border ${form.isOutOfStock ? 'border-red-300' : 'border-admin-border'} p-6 3xl:p-8 shadow-sm`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="isOutOfStock" checked={form.isOutOfStock} onChange={handleChange} className="w-4 h-4 rounded border-red-300 text-red-500 focus:ring-red-400" />
                <span className={`text-sm font-semibold ${form.isOutOfStock ? 'text-red-600' : 'text-admin-text'}`}>{t('books.outOfStock')}</span>
              </label>
            </div>

            {/* Section Flags */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">{t('books.showInSections')}</h3>
              {[
                { name: 'isComingSoon', label: t('books.comingSoon') },
                { name: 'isFeatured', label: t('books.featured') },
                { name: 'isBestseller', label: t('books.bestseller') },
                { name: 'isNewArrival', label: t('books.newArrival') },
                { name: 'isTrending', label: t('books.trending') },
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
                  <span className="text-sm text-admin-text font-medium">{t('books.active')}</span>
                </label>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">{t('books.tags')}</h3>
              <div>
                <label className={labelClass}>{t('books.tagsLabel')}</label>
                <input name="tags" value={form.tags} onChange={handleChange} placeholder={t('books.tagsPlaceholder')} className={inputClass} />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
