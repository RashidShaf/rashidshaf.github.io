import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

export default function CategoryCreate() {
  const t = useLanguageStore((s) => s.t);
  const isRTL = useLanguageStore((s) => s.isRTL);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentFromUrl = searchParams.get('parent') || '';
  const fileRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', nameAr: '', parentId: parentFromUrl });
  const [parentName, setParentName] = useState('');

  useEffect(() => {
    api.get('/admin/categories').then((res) => {
      const allCats = (res.data.data || res.data);
      setCategories(allCats);
      if (parentFromUrl) {
        const parent = allCats.find((c) => c.id === parentFromUrl);
        if (parent) setParentName(parent.name);
      }
    }).catch(() => {});
  }, []);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.parentId) { toast.error('Please select a parent category'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      if (form.nameAr) fd.append('nameAr', form.nameAr);
      if (form.parentId) fd.append('parentId', form.parentId);
      if (imageFile) fd.append('image', imageFile);

      await api.post('/admin/categories', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Category created');
      // Navigate back: find the Level 1 ancestor for the tab
      const parent = categories.find((c) => c.id === form.parentId);
      if (parent && parent.parentId) {
        // Parent is Level 2 — go to Level 1 tab with Level 2 sub-tab
        navigate(`/categories?tab=${parent.parentId}&sub=${form.parentId}`);
      } else {
        navigate(`/categories?tab=${form.parentId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 3xl:px-4 3xl:py-3 bg-white border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent';
  const labelClass = 'block text-sm 3xl:text-base font-medium text-admin-text mb-1.5';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center gap-3 mb-6 3xl:mb-8">
        <Link to="/categories" className="p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100 transition-colors">
          <FiArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
        </Link>
        <h2 className="text-2xl 3xl:text-3xl font-bold text-admin-text">
          {parentName ? `Create Sub-Category in ${parentName}` : 'Create Sub-Category'}
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6 3xl:gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6 3xl:space-y-8">
            {/* Parent Category — at top */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">Parent Category</h3>
              <div>
                <label className={labelClass}>Select Parent</label>
                <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} required className={inputClass}>
                  <option value="">— Select Parent —</option>
                  {(() => {
                    if (parentFromUrl) {
                      const preselected = categories.find((c) => c.id === parentFromUrl);
                      if (preselected) {
                        // If Level 1: show it + its Level 2 children
                        if (!preselected.parentId) {
                          const children = categories.filter((c) => c.parentId === preselected.id);
                          return (
                            <optgroup key={preselected.id} label={preselected.name}>
                              <option value={preselected.id}>{preselected.name}</option>
                              {children.map((child) => (
                                <option key={child.id} value={child.id}>&nbsp;&nbsp;└ {child.name}</option>
                              ))}
                            </optgroup>
                          );
                        }
                        // If Level 2: show its Level 1 parent group with this pre-selected
                        const level1Parent = categories.find((c) => c.id === preselected.parentId);
                        if (level1Parent) {
                          const siblings = categories.filter((c) => c.parentId === level1Parent.id);
                          return (
                            <optgroup key={level1Parent.id} label={level1Parent.name}>
                              <option value={level1Parent.id}>{level1Parent.name}</option>
                              {siblings.map((child) => (
                                <option key={child.id} value={child.id}>&nbsp;&nbsp;└ {child.name}</option>
                              ))}
                            </optgroup>
                          );
                        }
                      }
                    }
                    // Default: show all
                    return categories.filter((c) => !c.parentId).map((topCat) => {
                      const children = categories.filter((c) => c.parentId === topCat.id);
                      return (
                        <optgroup key={topCat.id} label={topCat.name}>
                          <option value={topCat.id}>{topCat.name}</option>
                          {children.map((child) => (
                            <option key={child.id} value={child.id}>&nbsp;&nbsp;└ {child.name}</option>
                          ))}
                        </optgroup>
                      );
                    });
                  })()}
                </select>
              </div>
            </div>

            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">Category Details</h3>
              <div className="grid sm:grid-cols-2 gap-4 3xl:gap-6">
                <div>
                  <label className={labelClass}>Name (English) *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} placeholder="e.g. Books Corner" />
                </div>
                <div>
                  <label className={labelClass}>Name (Arabic)</label>
                  <input type="text" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} dir="rtl" className={inputClass} placeholder="e.g. ركن الكتب" />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 3xl:space-y-8">
            {/* Image */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider mb-4">Image</h3>
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


            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button type="submit" disabled={saving} className="w-full py-3 3xl:py-3.5 bg-admin-accent text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm 3xl:text-base">
                {saving ? t('common.loading') : t('common.create')}
              </button>
              <Link to="/categories" className="w-full py-3 3xl:py-3.5 text-center border border-admin-border text-admin-muted rounded-xl hover:bg-gray-50 transition-colors text-sm 3xl:text-base font-medium">
                {t('common.cancel')}
              </Link>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
