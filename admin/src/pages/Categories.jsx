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
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [catSearch, setCatSearch] = useState(searchParams.get('q') || '');
  const [selectedParent, setSelectedParent] = useState(searchParams.get('tab') || '');
  const [selectedLevel2, setSelectedLevel2] = useState(searchParams.get('sub') || '');
  const [selectedLevel3, setSelectedLevel3] = useState(searchParams.get('sub2') || '');
  const [expandedRows, setExpandedRows] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkConfirmAction, setBulkConfirmAction] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/categories');
      setCategories(res.data.data || res.data);
      setSelectedIds([]);
    } catch (err) {
      toast.error(t('categories.failedFetch'));
    } finally {
      setLoading(false);
      const savedScroll = sessionStorage.getItem('admin-categories-scroll');
      if (savedScroll) {
        setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 50);
        sessionStorage.removeItem('admin-categories-scroll');
      }
    }
  };

  const saveScroll = () => sessionStorage.setItem('admin-categories-scroll', window.scrollY.toString());

  const toggleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleSelectAll = (items) => {
    const allIds = items.map((i) => i.id);
    setSelectedIds((prev) => allIds.every((id) => prev.includes(id)) ? prev.filter((id) => !allIds.includes(id)) : [...new Set([...prev, ...allIds])]);
  };
  const isAllSelected = (items) => items.length > 0 && items.every((i) => selectedIds.includes(i.id));

  const handleBulkAction = async (action, extra = {}) => {
    try {
      await api.post('/admin/categories/bulk-action', { ids: selectedIds, action, ...extra });
      toast.success(t('common.bulkSuccess'));
      setSelectedIds([]);
      setBulkConfirmAction(null);
      fetchCategories();
    } catch (err) {
      toast.error(t('common.saveFailed'));
      setBulkConfirmAction(null);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  // Auto-select first parent if none selected
  useEffect(() => {
    if (!selectedParent && categories.length > 0) {
      setSelectedParent('top');
    }
  }, [categories]);

  // Debounced URL sync for search
  useEffect(() => {
    const timer = setTimeout(() => {
      const p = new URLSearchParams(searchParams);
      if (catSearch) p.set('q', catSearch); else p.delete('q');
      setSearchParams(p, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [catSearch]);

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
      toast.error(t('categories.failedReorder'));
    }
  };

  const parentCategories = categories.filter((c) => !c.parentId);

  const getDepth = (cat) => {
    let depth = 1;
    let current = cat;
    while (current.parentId) {
      depth++;
      current = categories.find((c) => c.id === current.parentId);
      if (!current) break;
    }
    return depth;
  };

  // Only show Level 2 sub-tabs if selectedParent is actually a Level 1 category
  const isLevel1Selected = selectedParent && selectedParent !== 'top' && parentCategories.some((c) => c.id === selectedParent);
  const level2Categories = isLevel1Selected
    ? categories.filter((c) => c.parentId === selectedParent)
    : [];
  const level3Categories = selectedLevel2
    ? categories.filter((c) => c.parentId === selectedLevel2)
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

    if (selectedLevel3) {
      return result.filter((c) => c.parentId === selectedLevel3);
    }

    if (selectedLevel2) {
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
    if (selectedLevel3) return selectedLevel3;
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
          onClick={() => { setSelectedParent('top'); setSelectedLevel2(''); setSelectedLevel3(''); setSearchParams({ tab: 'top' }, { replace: true }); }}
          className={`px-5 py-2.5 3xl:px-6 3xl:py-3 rounded-xl text-sm 3xl:text-base font-semibold whitespace-nowrap transition-all ${selectedParent === 'top' ? 'bg-admin-accent text-white shadow-md' : 'bg-admin-card border border-admin-border text-admin-muted hover:text-admin-text hover:shadow-sm'}`}
        >
          {t('categories.topLevel')}
        </button>
        {parentCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setSelectedParent(cat.id); setSelectedLevel2(''); setSelectedLevel3(''); setSearchParams({ tab: cat.id }, { replace: true }); }}
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
            onClick={() => { setSelectedLevel2(''); setSelectedLevel3(''); setSearchParams({ tab: selectedParent }, { replace: true }); }}
            className={`px-4 py-2 3xl:px-5 3xl:py-2.5 rounded-lg text-sm 3xl:text-base font-medium whitespace-nowrap transition-all ${!selectedLevel2 ? 'bg-admin-accent text-white shadow-md' : 'bg-white border border-admin-border text-admin-muted hover:text-admin-text hover:shadow-sm'}`}
          >
            All {getName(parentCategories.find((c) => c.id === selectedParent) || {})}
          </button>
          {level2Categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedLevel2(cat.id); setSelectedLevel3(''); setSearchParams({ tab: selectedParent, sub: cat.id }, { replace: true }); }}
              className={`px-4 py-2 3xl:px-5 3xl:py-2.5 rounded-lg text-sm 3xl:text-base font-medium whitespace-nowrap transition-all ${selectedLevel2 === cat.id ? 'bg-admin-accent text-white shadow-md' : 'bg-white border border-admin-border text-admin-muted hover:text-admin-text hover:shadow-sm'}`}
            >
              {getName(cat)}
            </button>
          ))}
        </div>
      )}

      {/* Level 3 Sub-tabs */}
      {level3Categories.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 ps-4" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => { setSelectedLevel3(''); setSearchParams({ tab: selectedParent, sub: selectedLevel2 }, { replace: true }); }}
            className={`px-4 py-1.5 3xl:px-5 3xl:py-2 rounded-lg text-xs 3xl:text-sm font-medium whitespace-nowrap transition-all ${!selectedLevel3 ? 'bg-admin-accent text-white shadow-md' : 'bg-white border border-admin-border text-admin-muted hover:text-admin-text hover:shadow-sm'}`}
          >
            All {getName(level2Categories.find((c) => c.id === selectedLevel2) || {})}
          </button>
          {level3Categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedLevel3(cat.id); setSearchParams({ tab: selectedParent, sub: selectedLevel2, sub2: cat.id }, { replace: true }); }}
              className={`px-4 py-1.5 3xl:px-5 3xl:py-2 rounded-lg text-xs 3xl:text-sm font-medium whitespace-nowrap transition-all ${selectedLevel3 === cat.id ? 'bg-admin-accent text-white shadow-md' : 'bg-white border border-admin-border text-admin-muted hover:text-admin-text hover:shadow-sm'}`}
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

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 mb-3 bg-admin-accent/5 border border-admin-accent/20 rounded-lg px-4 py-2.5 3xl:px-6 3xl:py-3">
          <span className="text-sm 3xl:text-lg font-medium text-admin-accent">{selectedIds.length} {t('common.selected')}</span>
          <div className="flex-1" />
          <button onClick={() => setBulkConfirmAction('delete')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">{t('common.bulkDelete')}</button>
          <button onClick={() => handleBulkAction('activate')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">{t('common.bulkActivate')}</button>
          <button onClick={() => handleBulkAction('deactivate')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">{t('common.bulkDeactivate')}</button>
          <button onClick={() => setSelectedIds([])} className="text-sm 3xl:text-base text-admin-muted hover:text-admin-text">&#10005;</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm 3xl:text-base">
            <thead className="bg-gray-50 border-b border-admin-border">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={isAllSelected(sortedFilteredCategories)} onChange={() => toggleSelectAll(sortedFilteredCategories)} className="w-4 h-4 3xl:w-5 3xl:h-5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent" />
                </th>
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
                  <tr key={i}><td colSpan={9} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : sortedFilteredCategories.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-admin-muted">{t('common.noResults')}</td></tr>
              ) : (
                sortedFilteredCategories.map((cat) => {
                  const isParent = !cat.parentId;
                  const isBooks = isParent && cat.slug === 'books';
                  const depth = getDepth(cat);
                  const childCats = categories.filter((c) => c.parentId === cat.id);
                  const hasChildren = childCats.length > 0 && !selectedLevel2 && !selectedLevel3;
                  const isExpanded = expandedRows[cat.id];

                  const renderRow = (rowCat, rowDepth, isChild = false) => (
                    <tr
                      key={rowCat.id}
                      onClick={() => { if (hasChildren && !isChild) setExpandedRows((prev) => ({ ...prev, [cat.id]: !prev[cat.id] })); }}
                      className={`border-b border-admin-border hover:bg-gray-50 transition-colors ${isChild ? 'bg-gray-50/50' : ''} ${hasChildren && !isChild ? 'cursor-pointer' : ''} ${selectedIds.includes(rowCat.id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.includes(rowCat.id)} onChange={() => toggleSelect(rowCat.id)} className="w-4 h-4 3xl:w-5 3xl:h-5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent" />
                      </td>
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
                          <span className="inline-block px-2.5 py-0.5 3xl:px-3 3xl:py-1 text-xs 3xl:text-sm font-medium rounded-full bg-green-100 text-green-700">{t('common.active')}</span>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleToggleActive(rowCat); }} className={`inline-block px-2.5 py-0.5 3xl:px-3 3xl:py-1 text-xs 3xl:text-sm font-medium rounded-full cursor-pointer transition-colors ${rowCat.isActive !== false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                            {rowCat.isActive !== false ? t('common.active') : t('common.inactive')}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {hasChildren && !isChild && (
                            <button onClick={() => setExpandedRows((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))} className="p-1.5 3xl:p-2 text-admin-muted hover:text-admin-accent transition-colors" title={t('common.expand')}>
                              <FiChevronDown size={15} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                          <button onClick={() => handleReorder(rowCat, 'up')} className="p-1.5 3xl:p-2 text-admin-muted hover:text-admin-accent transition-colors" title="Move up">
                            <FiArrowUp size={15} />
                          </button>
                          <button onClick={() => handleReorder(rowCat, 'down')} className="p-1.5 3xl:p-2 text-admin-muted hover:text-admin-accent transition-colors" title="Move down">
                            <FiArrowDown size={15} />
                          </button>
                          <Link to={`/categories/${rowCat.id}/edit`} onClick={saveScroll} className="p-1.5 3xl:p-2 text-admin-muted hover:text-admin-accent transition-colors" title={t('common.edit')}>
                            <FiEdit2 size={15} />
                          </Link>
                          {rowCat.parentId && (
                            <button onClick={() => setDeleteId(rowCat.id)} className="p-1.5 3xl:p-2 text-admin-muted hover:text-red-500 transition-colors" title={t('common.delete')}>
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
                      {hasChildren && isExpanded && childCats.map((child) => renderRow(child, getDepth(child), true))}
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

      <ConfirmModal
        open={bulkConfirmAction === 'delete'}
        title={t('common.bulkDelete')}
        message={t('common.bulkConfirm').replace('{count}', selectedIds.length)}
        confirmText={t('common.delete')}
        onConfirm={() => {
          const deletableIds = selectedIds.filter(id => {
            const cat = categories.find(c => c.id === id);
            return cat && cat.parentId;
          });
          if (deletableIds.length === 0) {
            toast.error(t('common.topLevelNoDelete'));
            setBulkConfirmAction(null);
            return;
          }
          // Use deletableIds instead of selectedIds for the API call
          api.post('/admin/categories/bulk-action', { ids: deletableIds, action: 'delete' })
            .then(() => {
              toast.success(t('common.bulkSuccess'));
              setSelectedIds([]);
              setBulkConfirmAction(null);
              fetchCategories();
            })
            .catch(() => {
              toast.error(t('common.saveFailed'));
              setBulkConfirmAction(null);
            });
        }}
        onCancel={() => setBulkConfirmAction(null)}
      />
    </motion.div>
  );
}
