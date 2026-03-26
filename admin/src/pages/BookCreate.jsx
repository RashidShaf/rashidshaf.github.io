import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');

export default function BookCreate() {
  const t = useLanguageStore((s) => s.t);
  const isRTL = useLanguageStore((s) => s.isRTL);
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', titleAr: '', author: '', authorAr: '', isbn: '',
    description: '', descriptionAr: '', price: '', compareAtPrice: '',
    publisher: '', publisherAr: '', language: 'en', pages: '',
    stock: '0', categoryId: '', tags: '', isFeatured: false,
  });

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data.data || res.data)).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleCover = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.author || !form.price) {
      toast.error('Title, Author, and Price are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.categoryId) delete payload.categoryId;
      if (!payload.compareAtPrice) delete payload.compareAtPrice;
      if (!payload.isbn) delete payload.isbn;

      const res = await api.post('/admin/books', payload);
      const bookId = res.data.id;

      // Upload cover if selected
      if (coverFile && bookId) {
        const fd = new FormData();
        fd.append('cover', coverFile);
        await api.post(`/admin/books/${bookId}/cover`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('Book created');
      navigate('/books');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create book');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 bg-white border border-admin-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent';
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
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider">Book Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Title (English) *</label>
                  <input name="title" value={form.title} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Title (Arabic)</label>
                  <input name="titleAr" value={form.titleAr} onChange={handleChange} dir="rtl" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Author (English) *</label>
                  <input name="author" value={form.author} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Author (Arabic)</label>
                  <input name="authorAr" value={form.authorAr} onChange={handleChange} dir="rtl" className={inputClass} />
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

            <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider">Pricing & Inventory</h3>
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
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>ISBN</label>
                  <input name="isbn" value={form.isbn} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Pages</label>
                  <input name="pages" type="number" min="0" value={form.pages} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Language</label>
                  <select name="language" value={form.language} onChange={handleChange} className={inputClass}>
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider">Publisher & Tags</h3>
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
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setCoverFile(null); setCoverPreview(null); }}
                      className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80"
                    >
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

            {/* Category & Options */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider">Options</h3>
              <div>
                <label className={labelClass}>Category</label>
                <select name="categoryId" value={form.categoryId} onChange={handleChange} className={inputClass}>
                  <option value="">— Select —</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} className="w-4 h-4 rounded border-admin-border text-admin-accent focus:ring-admin-accent" />
                <span className="text-sm text-admin-text font-medium">Featured Book</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-admin-accent text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
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
