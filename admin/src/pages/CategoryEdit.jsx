import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');

export default function CategoryEdit() {
  const { id } = useParams();
  const t = useLanguageStore((s) => s.t);
  const isRTL = useLanguageStore((s) => s.isRTL);
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTopLevel, setIsTopLevel] = useState(false);
  const [backUrl, setBackUrl] = useState('/categories?tab=top');
  const [form, setForm] = useState({ name: '', nameAr: '', parentId: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await api.get('/admin/categories');
        const allCats = catRes.data.data || catRes.data;
        setCategories(allCats.filter((c) => c.id !== id));

        const cat = allCats.find((c) => c.id === id);
        if (cat) {
          setIsTopLevel(!cat.parentId);
          setForm({
            name: cat.name || '',
            nameAr: cat.nameAr || cat.name_ar || '',
            parentId: cat.parentId || '',
          });
          if (cat.image) setImagePreview(`${API_BASE}/${cat.image}`);
          // Compute back URL based on hierarchy
          if (!cat.parentId) {
            setBackUrl('/categories?tab=top');
          } else {
            const parent = allCats.find((c) => c.id === cat.parentId);
            if (parent && parent.parentId) {
              // Level 3: go to Level 1 tab with Level 2 sub-tab
              setBackUrl(`/categories?tab=${parent.parentId}&sub=${cat.parentId}`);
            } else {
              // Level 2: go to Level 1 tab
              setBackUrl(`/categories?tab=${cat.parentId}`);
            }
          }
        } else {
          toast.error('Category not found');
          navigate('/categories');
        }
      } catch {
        toast.error('Failed to load');
        navigate('/categories');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      if (form.nameAr) fd.append('nameAr', form.nameAr);
      if (!isTopLevel) fd.append('parentId', form.parentId || '');
      if (imageFile) fd.append('image', imageFile);

      await api.put(`/admin/categories/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Category updated');
      // Navigate back to the correct tab
      const allCats = categories;
      const parent = form.parentId ? allCats.find((c) => c.id === form.parentId) : null;
      if (!form.parentId) {
        navigate('/categories?tab=top');
      } else if (parent && parent.parentId) {
        // Level 3: go to Level 1 tab with Level 2 sub-tab
        navigate(`/categories?tab=${parent.parentId}&sub=${form.parentId}`);
      } else {
        navigate(`/categories?tab=${form.parentId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 bg-white border border-admin-input-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent';
  const labelClass = 'block text-sm font-medium text-admin-text mb-1.5';

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-admin-accent/30 border-t-admin-accent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center gap-3 mb-6">
        <Link to={backUrl} className="p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100 transition-colors">
          <FiArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
        </Link>
        <h2 className="text-2xl font-bold text-admin-text">
          {isTopLevel ? 'Edit Corner' : 'Edit Sub-Category'}
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Parent Category — at top (only for sub-categories) */}
            {!isTopLevel && (
              <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider">Parent Category</h3>
                <div>
                  <label className={labelClass}>Select Parent</label>
                  <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} required className={inputClass}>
                    {categories.filter((c) => !c.parentId).map((topCat) => {
                      const children = categories.filter((c) => c.parentId === topCat.id && c.id !== id);
                      return (
                        <optgroup key={topCat.id} label={topCat.name}>
                          <option value={topCat.id}>{topCat.name}</option>
                          {children.map((child) => (
                            <option key={child.id} value={child.id}>&nbsp;&nbsp;└ {child.name}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}

            <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider">Category Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Name (English) *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Name (Arabic)</label>
                  <input type="text" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} dir="rtl" className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Image */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
              <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider mb-4">Image</h3>
              <div
                onClick={() => fileRef.current?.click()}
                className="relative w-full h-40 border-2 border-dashed border-admin-border rounded-xl cursor-pointer hover:border-admin-accent transition-colors flex items-center justify-center overflow-hidden"
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80">
                      <FiX size={14} />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <FiUpload className="w-6 h-6 text-admin-muted mx-auto mb-1" />
                    <p className="text-xs text-admin-muted">Click to upload</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </div>


            <div className="flex flex-col gap-3">
              <button type="submit" disabled={saving} className="w-full py-3 bg-admin-accent text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50">
                {saving ? t('common.loading') : t('common.save')}
              </button>
              <Link to={backUrl} className="w-full py-3 text-center border border-admin-border text-admin-muted rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium">
                {t('common.cancel')}
              </Link>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
