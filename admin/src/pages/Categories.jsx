import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { FiPlus, FiTrash2, FiImage, FiEdit2, FiLayers, FiCheckCircle, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');

export default function Categories() {
  const { t, language } = useLanguageStore();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [catSearch, setCatSearch] = useState('');
  const [selectedParent, setSelectedParent] = useState(searchParams.get('tab') || '');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/categories');
      setCategories(res.data.data || res.data);
    } catch (err) {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleToggleActive = async (cat) => {
    // Protect Books category from being deactivated
    if (!cat.parentId && cat.slug === 'books') {
      toast.error('Books category cannot be deactivated');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('isActive', cat.isActive === false ? 'true' : 'false');
      await api.put(`/admin/categories/${cat.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(cat.isActive === false ? 'Category activated' : 'Category deactivated');
      fetchCategories();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/categories/${deleteId}`);
      toast.success('Category deleted');
      setDeleteId(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
      setDeleteId(null);
    }
  };

  const parentCategories = categories.filter((c) => !c.parentId);

  const filteredCategories = categories.filter((c) => {
    if (catSearch && !(c.name?.toLowerCase().includes(catSearch.toLowerCase()) || c.nameAr?.includes(catSearch) || c.name_ar?.includes(catSearch))) return false;
    if (selectedParent === 'top') return !c.parentId;
    if (selectedParent) return c.parentId === selectedParent;
    return !!c.parentId;
  });

  const totalCategories = categories.length;
  const activeCategories = categories.filter((c) => c.isActive !== false).length;
  const isTopLevel = selectedParent === 'top';

  // For top-level: compute total items = direct books + all children's books
  const getTotalItems = (cat) => {
    const direct = cat._count?.books || 0;
    const childrenBooks = (cat.children || []).reduce((sum, child) => sum + (child._count?.books || 0), 0);
    return direct + childrenBooks;
  };

  const getName = (cat) => language === 'ar' && cat.nameAr ? cat.nameAr : cat.name;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: FiLayers, label: 'Total Categories', value: totalCategories, bg: 'bg-blue-600' },
          { icon: FiCheckCircle, label: 'Active', value: activeCategories, bg: 'bg-emerald-600' },
        ].map((card, i) => (
          <div key={i} className="bg-admin-card rounded-xl border border-admin-border p-5 h-[140px] flex flex-col items-center justify-center text-center shadow-sm hover:shadow-lg transition-shadow">
            <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-extrabold text-admin-text tracking-tight leading-none">{card.value}</p>
            <p className="text-xs font-medium text-admin-muted mt-1.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Parent Corner Pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => setSelectedParent('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${!selectedParent ? 'bg-admin-accent text-white' : 'bg-admin-card border border-admin-border text-admin-muted hover:text-admin-text'}`}
        >
          All
        </button>
        <button
          onClick={() => setSelectedParent('top')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedParent === 'top' ? 'bg-admin-accent text-white' : 'bg-admin-card border border-admin-border text-admin-muted hover:text-admin-text'}`}
        >
          Top Level
        </button>
        {parentCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedParent(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedParent === cat.id ? 'bg-admin-accent text-white' : 'bg-admin-card border border-admin-border text-admin-muted hover:text-admin-text'}`}
          >
            {getName(cat)}
          </button>
        ))}
      </div>

      {/* Search + Create */}
      <div className="flex items-center gap-3 mb-4 bg-admin-card border border-admin-border rounded-lg px-3 py-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input type="text" value={catSearch} onChange={(e) => setCatSearch(e.target.value)} placeholder="Search categories..." className="w-full pl-10 pr-4 py-2 bg-admin-bg border border-admin-input-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent" />
        </div>
        <div className="flex-1" />
        <button onClick={fetchCategories} className="flex items-center gap-1.5 px-3 py-2 text-admin-muted hover:text-admin-accent hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium">
          <FiRefreshCw size={14} /> Refresh
        </button>
        {selectedParent && selectedParent !== 'top' && (
          <Link to={`/categories/create${selectedParent ? `?parent=${selectedParent}` : ''}`} className="flex items-center gap-2 px-4 py-2 bg-admin-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors whitespace-nowrap">
            <FiPlus size={16} /> {t('common.create')}
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-admin-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">Image</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">Name (EN)</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">Name (AR)</th>
                {!isTopLevel && <th className="text-left px-4 py-3 font-medium text-admin-muted">Parent</th>}
                {isTopLevel && <th className="text-left px-4 py-3 font-medium text-admin-muted">Sub-categories</th>}
                <th className="text-left px-4 py-3 font-medium text-admin-muted">{isTopLevel ? 'Total Items' : 'Items'}</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">{t('common.status')}</th>
                <th className="text-right px-4 py-3 font-medium text-admin-muted">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : filteredCategories.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-admin-muted">{t('common.noResults')}</td></tr>
              ) : (
                filteredCategories.map((cat) => {
                  const isParent = !cat.parentId;
                  const isBooks = isParent && cat.slug === 'books';

                  return (
                    <tr key={cat.id} className="border-b border-admin-border hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {cat.image ? <img src={`${API_BASE}/${cat.image}`} alt={cat.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><FiImage size={16} /></div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-admin-text">
                        {!isParent && <span className="text-admin-muted me-1">└</span>}
                        {cat.name}
                      </td>
                      <td className="px-4 py-3 text-admin-muted" dir="rtl">{cat.nameAr || cat.name_ar || '-'}</td>
                      {!isTopLevel && (
                        <td className="px-4 py-3 text-admin-muted text-xs">
                          {cat.parentId ? categories.find((c) => c.id === cat.parentId)?.name || '-' : '—'}
                        </td>
                      )}
                      {isTopLevel && (
                        <td className="px-4 py-3 text-admin-muted font-medium">{cat._count?.children || 0}</td>
                      )}
                      <td className="px-4 py-3 text-admin-muted">
                        {isParent ? getTotalItems(cat) : (cat._count?.books ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        {isBooks ? (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(cat)}
                            className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                              cat.isActive !== false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {cat.isActive !== false ? 'Active' : 'Inactive'}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isParent ? (
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/categories/${cat.id}/edit`} className="p-1.5 text-admin-muted hover:text-admin-accent transition-colors" title={t('common.edit')}>
                              <FiEdit2 size={15} />
                            </Link>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/categories/${cat.id}/edit`} className="p-1.5 text-admin-muted hover:text-admin-accent transition-colors" title={t('common.edit')}>
                              <FiEdit2 size={15} />
                            </Link>
                            <button onClick={() => setDeleteId(cat.id)} className="p-1.5 text-admin-muted hover:text-red-500 transition-colors" title={t('common.delete')}>
                              <FiTrash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteId}
        title="Delete Category"
        message="This will permanently delete this category. This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
}
