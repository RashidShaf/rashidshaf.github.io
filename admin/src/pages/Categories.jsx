import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { FiPlus, FiTrash2, FiImage, FiEdit2, FiLayers, FiCheckCircle, FiSearch, FiRefreshCw, FiChevronDown, FiArrowUp, FiArrowDown } from 'react-icons/fi';
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
  const [selectedLevel2, setSelectedLevel2] = useState(searchParams.get('sub') || '');
  const [expandedRows, setExpandedRows] = useState({});

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/categories');
      setCategories(res.data.data || res.data);
    } catch (err) {
      toast.error(t('categories.failedFetch'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  // Auto-select first parent if none selected
  useEffect(() => {
    if (!selectedParent && categories.length > 0) {
      setSelectedParent('top');
    }
  }, [categories]);

  const handleToggleActive = async (cat) => {
    if (!cat.parentId && cat.slug === 'books') {
      toast.error(t('categories.activateError'));
      return;
    }
    try {
      const fd = new FormData();
      fd.append('isActive', cat.isActive === false ? 'true' : 'false');
      await api.put(`/admin/categories/${cat.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(cat.isActive === false ? t('categories.activated') : t('categories.deactivated'));
      fetchCategories();
    } catch (err) {
      toast.error(t('categories.failedUpdate'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/categories/${deleteId}`);
      toast.success(t('categories.deleted'));
      setDeleteId(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || t('categories.failedDelete'));
      setDeleteId(null);
    }
  };

  const handleReorder = async (cat, direction) => {
    const siblings = categories.filter((c) => c.parentId === cat.parentId).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    const idx = siblings.findIndex((c) => c.id === cat.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const reordered = [...siblings];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    try {
      await api.put('/admin/categories/reorder', { orderedIds: reordered.map((c) => c.id) });
      fetchCategories();
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const parentCategories = categories.filter((c) => !c.parentId);

  const getDepth = (cat) => {
    if (!cat.parentId) return 1;
    const parent = categories.find((c) => c.id === cat.parentId);
    if (!parent || !parent.parentId) return 2;
    return 3;
  };

  // Only show Level 2 sub-tabs if selectedParent is actually a Level 1 category
  const isLevel1Selected = selectedParent && selectedParent !== 'top' && parentCategories.some((c) => c.id === selectedParent);
  const level2Categories = isLevel1Selected
    ? categories.filter((c) => c.parentId === selectedParent)
    : [];

  // Determine what to show in the table
  const getFilteredCategories = () => {
    let result = categories;

    // Search filter
    if (catSearch) {
      result = result.filter((c) => c.name?.toLowerCase().includes(catSearch.toLowerCase()) || c.nameAr?.includes(catSearch) || c.name_ar?.includes(catSearch));
    }

    if (selectedParent === 'top') {
      return result.filter((c) => !c.parentId);
    }

    if (selectedLevel2) {
      // Show Level 3 children of selected Level 2
      return result.filter((c) => c.parentId === selectedLevel2);
    }

    if (selectedParent) {
      // Show Level 2 children only — Level 3 shown via expand/collapse in table rows
      return result.filter((c) => c.parentId === selectedParent);
    }

    // "All" tab: show Level 2 and Level 3
    return result.filter((c) => !!c.parentId);
  };

  const filteredCategories = getFilteredCategories();

  // Sort: Level 3 after their Level 2 parent (only needed for "All" tab)
  const sortedFilteredCategories = selectedParent || selectedLevel2
    ? filteredCategories
    : [...filteredCategories].sort((a, b) => {
        const getGroup = (cat) => {
          const depth = getDepth(cat);
          if (depth <= 2) return cat.id;
          return cat.parentId;
        };
        const ga = getGroup(a);
        const gb = getGroup(b);
        if (ga === gb) return getDepth(a) - getDepth(b);
        const ia = filteredCategories.findIndex((c) => c.id === ga);
        const ib = filteredCategories.findIndex((c) => c.id === gb);
        return ia - ib;
      });

  const totalCategories = categories.length;
  const activeCategories = categories.filter((c) => c.isActive !== false).length;
  const isTopLevel = selectedParent === 'top';

  const getTotalItems = (cat) => {
    const direct = cat._count?.books || 0;
    const childrenBooks = (cat.children || []).reduce((sum, child) => sum + (child._count?.books || 0), 0);
    return direct + childrenBooks;
  };

  const getName = (cat) => language === 'ar' && cat.nameAr ? cat.nameAr : cat.name;

  // Determine what the Create button's parent should be
  const getCreateParent = () => {
    if (selectedLevel2) return selectedLevel2;
    if (selectedParent && selectedParent !== 'top') return selectedParent;
    return '';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 3xl:gap-6 mb-6 3xl:mb-8">
        {[
          { icon: FiLayers, label: t('categories.totalCategories'), value: totalCategories, bg: 'bg-blue-600' },
          { icon: FiCheckCircle, label: t('common.active'), value: activeCategories, bg: 'bg-emerald-600' },
        ].map((card, i) => (
          <div key={i} className="bg-admin-card rounded-xl border border-admin-border p-5 3xl:p-7 h-[140px] 3xl:h-[170px] flex flex-col items-center justify-center text-center shadow-sm hover:shadow-lg transition-shadow">
            <div className={`w-11 h-11 3xl:w-14 3xl:h-14 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl 3xl:text-3xl font-extrabold text-admin-text tracking-tight leading-none">{card.value}</p>
            <p className="text-xs 3xl:text-sm font-medium text-admin-muted mt-1.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Level 1 Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => { setSelectedParent('top'); setSelectedLevel2(''); }}
          className={`px-5 py-2.5 3xl:px-6 3xl:py-3 rounded-xl text-sm 3xl:text-base font-semibold whitespace-nowrap transition-all ${selectedParent === 'top' ? 'bg-admin-accent text-white shadow-md' : 'bg-admin-card border border-admin-border text-admin-muted hover:text-admin-text hover:shadow-sm'}`}
        >
          Top Level
        </button>
        {parentCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setSelectedParent(cat.id); setSelectedLevel2(''); }}
            className={`px-5 py-2.5 3xl:px-6 3xl:py-3 rounded-xl text-sm 3xl:text-base font-semibold whitespace-nowrap transition-all ${selectedParent === cat.id ? 'bg-admin-accent text-white shadow-md' : 'bg-admin-card border border-admin-border text-admin-muted hover:text-admin-text hover:shadow-sm'}`}
          >
            {getName(cat)}
          </button>
        ))}
      </div>

      {/* Level 2 Sub-tabs */}
      {level2Categories.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 ps-2" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setSelectedLevel2('')}
            className={`px-4 py-2 3xl:px-5 3xl:py-2.5 rounded-lg text-sm 3xl:text-base font-medium whitespace-nowrap transition-all ${!selectedLevel2 ? 'bg-admin-accent text-white shadow-md' : 'bg-white border border-admin-border text-admin-muted hover:text-admin-text hover:shadow-sm'}`}
          >
            All {getName(parentCategories.find((c) => c.id === selectedParent) || {})}
          </button>
          {level2Categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedLevel2(cat.id)}
              className={`px-4 py-2 3xl:px-5 3xl:py-2.5 rounded-lg text-sm 3xl:text-base font-medium whitespace-nowrap transition-all ${selectedLevel2 === cat.id ? 'bg-admin-accent text-white shadow-md' : 'bg-white border border-admin-border text-admin-muted hover:text-admin-text hover:shadow-sm'}`}
            >
              {getName(cat)}
            </button>
          ))}
        </div>
      )}

      {/* Search + Create */}
      <div className="flex items-center gap-3 mb-4 bg-admin-card border border-admin-border rounded-lg px-3 py-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input type="text" value={catSearch} onChange={(e) => setCatSearch(e.target.value)} placeholder={t('common.searchCategories')} className="w-full pl-10 pr-4 py-2 3xl:py-2.5 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" />
        </div>
        <div className="flex-1" />
        <button onClick={fetchCategories} className="flex items-center gap-1.5 px-3 py-2 3xl:px-4 3xl:py-2.5 text-admin-muted hover:text-admin-accent hover:bg-gray-100 rounded-lg transition-colors text-sm 3xl:text-base font-medium">
          <FiRefreshCw size={14} /> {t('common.refresh')}
        </button>
        {selectedParent !== 'top' && (
          <Link
            to={`/categories/create${getCreateParent() ? `?parent=${getCreateParent()}` : ''}`}
            className="flex items-center gap-2 px-4 py-2 3xl:px-5 3xl:py-2.5 bg-admin-accent text-white rounded-lg text-sm 3xl:text-base font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"
          >
            <FiPlus size={16} /> {t('common.create')}
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm 3xl:text-base">
            <thead className="bg-gray-50 border-b border-admin-border">
              <tr>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">Image</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">Name (EN)</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">Name (AR)</th>
                {!isTopLevel && !selectedLevel2 && selectedParent && <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">Sub-categories</th>}
                {!isTopLevel && <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">Parent</th>}
                {isTopLevel && <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">Sub-categories</th>}
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{isTopLevel ? 'Total Items' : 'Items'}</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.status')}</th>
                <th className="text-right px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : sortedFilteredCategories.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-admin-muted">{t('common.noResults')}</td></tr>
              ) : (
                sortedFilteredCategories.map((cat) => {
                  const isParent = !cat.parentId;
                  const isBooks = isParent && cat.slug === 'books';
                  const depth = getDepth(cat);
                  const level3Children = categories.filter((c) => c.parentId === cat.id);
                  const hasLevel3 = depth === 2 && level3Children.length > 0 && !selectedLevel2;
                  const isExpanded = expandedRows[cat.id];

                  const renderRow = (rowCat, rowDepth, isChild = false) => (
                    <tr
                      key={rowCat.id}
                      onClick={() => { if (hasLevel3 && !isChild) setExpandedRows((prev) => ({ ...prev, [cat.id]: !prev[cat.id] })); }}
                      className={`border-b border-admin-border hover:bg-gray-50 transition-colors ${isChild ? 'bg-gray-50/50' : ''} ${hasLevel3 && !isChild ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                        <div className={`${isChild ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg overflow-hidden bg-gray-100 flex-shrink-0`}>
                          {rowCat.image ? <img src={`${API_BASE}/${rowCat.image}`} alt={rowCat.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><FiImage size={isChild ? 12 : 16} /></div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-text">
                        {isChild && <span className="text-admin-muted me-1 ms-4">└</span>}
                        <span className={isChild ? 'text-admin-muted' : ''}>{rowCat.name}</span>
                      </td>
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted" dir="rtl">{rowCat.nameAr || rowCat.name_ar || '-'}</td>
                      {!isTopLevel && !selectedLevel2 && selectedParent && (
                        <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted font-medium">
                          {isChild ? '-' : categories.filter((c) => c.parentId === rowCat.id).length}
                        </td>
                      )}
                      {!isTopLevel && (
                        <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs">
                          {rowCat.parentId ? categories.find((c) => c.id === rowCat.parentId)?.name || '-' : '—'}
                        </td>
                      )}
                      {isTopLevel && (
                        <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted font-medium">{rowCat._count?.children || 0}</td>
                      )}
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted">
                        {!rowCat.parentId ? getTotalItems(rowCat) : (rowCat._count?.books ?? 0)}
                      </td>
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                        {(isBooks && !isChild) ? (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">{t('common.active')}</span>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleToggleActive(rowCat); }} className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${rowCat.isActive !== false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                            {rowCat.isActive !== false ? t('common.active') : t('common.inactive')}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {hasLevel3 && !isChild && (
                            <button onClick={() => setExpandedRows((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))} className="p-1.5 text-admin-muted hover:text-admin-accent transition-colors" title={t('common.expand')}>
                              <FiChevronDown size={15} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                          <button onClick={() => handleReorder(rowCat, 'up')} className="p-1.5 text-admin-muted hover:text-admin-accent transition-colors" title="Move up">
                            <FiArrowUp size={15} />
                          </button>
                          <button onClick={() => handleReorder(rowCat, 'down')} className="p-1.5 text-admin-muted hover:text-admin-accent transition-colors" title="Move down">
                            <FiArrowDown size={15} />
                          </button>
                          <Link to={`/categories/${rowCat.id}/edit`} className="p-1.5 text-admin-muted hover:text-admin-accent transition-colors" title={t('common.edit')}>
                            <FiEdit2 size={15} />
                          </Link>
                          {rowCat.parentId && (
                            <button onClick={() => setDeleteId(rowCat.id)} className="p-1.5 text-admin-muted hover:text-red-500 transition-colors" title={t('common.delete')}>
                              <FiTrash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );

                  return (
                    <React.Fragment key={cat.id}>
                      {renderRow(cat, depth)}
                      {hasLevel3 && isExpanded && level3Children.map((child) => renderRow(child, 3, true))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteId}
        title={t('categories.deleteCategory')}
        message={t('categories.deleteCategoryConfirm')}
        confirmText={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
}
