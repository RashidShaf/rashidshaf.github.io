import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiTrash2, FiX, FiUpload, FiImage } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');

export default function Categories() {
  const t = useLanguageStore((s) => s.t);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', nameAr: '', description: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data || res.data);
    } catch (err) {
      toast.error('Failed to fetch categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setForm({ name: '', nameAr: '', description: '' });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      if (form.nameAr) formData.append('nameAr', form.nameAr);
      if (form.description) formData.append('description', form.description);
      if (imageFile) formData.append('image', imageFile);

      await api.post('/admin/categories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Category created');
      resetForm();
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create category');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-admin-text">{t('nav.categories')}</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-admin-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <FiPlus size={16} />
          {t('common.create')}
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-admin-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">Image</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">Name (EN)</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">Name (AR)</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">Books</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">{t('common.status')}</th>
                <th className="text-right px-4 py-3 font-medium text-admin-muted">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-admin-muted">
                    {t('common.noResults')}
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="border-b border-admin-border hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {cat.image ? (
                          <img src={`${API_BASE}/${cat.image}`} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <FiImage size={16} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-admin-text">{cat.name}</td>
                    <td className="px-4 py-3 text-admin-muted" dir="rtl">
                      {cat.nameAr || cat.name_ar || '-'}
                    </td>
                    <td className="px-4 py-3 text-admin-muted">
                      {cat.bookCount ?? cat._count?.books ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
                          cat.isActive !== false
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {cat.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-1.5 text-admin-muted hover:text-red-500 transition-colors"
                        title={t('common.delete')}
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowModal(false); resetForm(); }}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-admin-card rounded-xl border border-admin-border shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-admin-border">
                  <h3 className="text-lg font-semibold text-admin-text">Create Category</h3>
                  <button
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="p-1 text-admin-muted hover:text-admin-text transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <form onSubmit={handleCreate} className="p-6 space-y-4">
                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1.5">
                      Category Image
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-full h-32 border-2 border-dashed border-admin-border rounded-lg cursor-pointer hover:border-admin-accent transition-colors flex items-center justify-center overflow-hidden"
                    >
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                            className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80"
                          >
                            <FiX size={14} />
                          </button>
                        </>
                      ) : (
                        <div className="text-center">
                          <FiUpload className="w-6 h-6 text-admin-muted mx-auto mb-1" />
                          <p className="text-xs text-admin-muted">Click to upload image</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1.5">
                      Name (English)
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2.5 bg-admin-card border border-admin-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent"
                      placeholder="e.g. Fiction"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1.5">
                      Name (Arabic)
                    </label>
                    <input
                      type="text"
                      value={form.nameAr}
                      onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                      className="w-full px-3 py-2.5 bg-admin-card border border-admin-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent"
                      placeholder="e.g. خيال"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2.5 bg-admin-card border border-admin-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent resize-none"
                      placeholder="Brief description..."
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowModal(false); resetForm(); }}
                      className="flex-1 px-4 py-2.5 border border-admin-border rounded-lg text-sm font-medium text-admin-muted hover:bg-gray-50 transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex-1 px-4 py-2.5 bg-admin-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {creating ? t('common.loading') : t('common.create')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
