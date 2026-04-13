import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiChevronLeft, FiChevronRight, FiBook, FiStar, FiAlertTriangle, FiRefreshCw, FiFilter } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';

export default function Books() {
  const { t, language } = useLanguageStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [limit, setLimit] = useState(parseInt(searchParams.get('limit')) || 10);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, featured: 0, lowStock: 0 });
  const [deleteId, setDeleteId] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTab, setSelectedTab] = useState(searchParams.get('tab') || '');
  const [selectedSub, setSelectedSub] = useState(searchParams.get('sub') || '');
  const [selectedL3, setSelectedL3] = useState(searchParams.get('l3') || '');
  const [selectedL4, setSelectedL4] = useState(searchParams.get('l4') || '');
  const [imageFilter, setImageFilter] = useState(searchParams.get('img') || '');
  const [descFilter, setDescFilter] = useState(searchParams.get('desc') || '');
  const [issueFilter, setIssueFilter] = useState(searchParams.get('issue') || '');
  const [openFilterMenu, setOpenFilterMenu] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkConfirmAction, setBulkConfirmAction] = useState(null);
  const [bulkCatOpen, setBulkCatOpen] = useState(false);
  const [bulkSelectedL1, setBulkSelectedL1] = useState('');
  const [bulkSelectedCats, setBulkSelectedCats] = useState([]);
  const [bulkSectionOpen, setBulkSectionOpen] = useState(false);
  const [bulkSections, setBulkSections] = useState({});

  useEffect(() => {
    api.get('/admin/categories').then((res) => {
      const all = res.data.data || res.data;
      setAllCategories(all);
      setCategories(all.filter((c) => !c.parentId));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard/stats').catch(() => ({ data: {} })),
      api.get('/admin/inventory/low-stock').catch(() => ({ data: [] })),
    ]).then(([statsRes, lowRes]) => {
      setStats({
        total: statsRes.data.totalBooks || 0,
        featured: 0,
        lowStock: Array.isArray(lowRes.data) ? lowRes.data.length : 0,
      });
    });
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('search', search);
      if (selectedL4) params.set('category', selectedL4);
      else if (selectedL3) params.set('category', selectedL3);
      else if (selectedSub) params.set('category', selectedSub);
      else if (selectedTab) params.set('category', selectedTab);
      // Quality filters
      if (imageFilter === 'hasImage') params.set('hasImage', 'true');
      if (imageFilter === 'noImage') params.set('hasImage', 'false');
      if (descFilter === 'noDesc') params.set('hasDesc', 'false');
      if (descFilter === 'noDescAr') params.set('hasDescAr', 'false');
      if (issueFilter === 'duplicateBarcode') params.set('duplicateBarcode', 'true');
      if (issueFilter === 'similarNames') params.set('similarNames', 'true');
      const res = await api.get(`/admin/books?${params}`);
      setBooks(res.data.data);
      setPagination(res.data.pagination);
      setSelectedIds([]);
    } catch (err) {
      // silently handle error
    } finally {
      setLoading(false);
      const savedScroll = sessionStorage.getItem('admin-books-scroll');
      if (savedScroll) {
        setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 50);
        sessionStorage.removeItem('admin-books-scroll');
      }
    }
  };

  const saveScroll = () => sessionStorage.setItem('admin-books-scroll', window.scrollY.toString());

  const toggleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleSelectAll = (items) => {
    const allIds = items.map((i) => i.id);
    setSelectedIds((prev) => allIds.every((id) => prev.includes(id)) ? prev.filter((id) => !allIds.includes(id)) : [...new Set([...prev, ...allIds])]);
  };
  const isAllSelected = (items) => items.length > 0 && items.every((i) => selectedIds.includes(i.id));

  const handleBulkAction = async (action, extra = {}) => {
    try {
      await api.post('/admin/books/bulk-action', { ids: selectedIds, action, ...extra });
      toast.success(t('common.bulkSuccess'));
      setSelectedIds([]);
      setBulkConfirmAction(null);
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.saveFailed'));
      setBulkConfirmAction(null);
    }
  };

  useEffect(() => { fetchBooks(); }, [page, limit, selectedTab, selectedSub, selectedL3, selectedL4, imageFilter, descFilter, issueFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchBooks();
      const params = new URLSearchParams();
      if (selectedTab) params.set('tab', selectedTab);
      if (selectedSub) params.set('sub', selectedSub);
      if (selectedL3) params.set('l3', selectedL3);
      if (selectedL4) params.set('l4', selectedL4);
      if (imageFilter) params.set('img', imageFilter);
      if (descFilter) params.set('desc', descFilter);
      if (issueFilter) params.set('issue', issueFilter);
      if (search) params.set('q', search);
      setSearchParams(params, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleTabChange = (tabId) => {
    setSelectedTab(tabId);
    setSelectedSub('');
    setSelectedL3('');
    setSelectedL4('');
    setImageFilter('');
    setDescFilter('');
    setIssueFilter('');
    setPage(1);
    const params = new URLSearchParams();
    if (tabId) params.set('tab', tabId);
    if (search) params.set('q', search);
    setSearchParams(params, { replace: true });
  };

  const handleSubChange = (subId) => {
    setSelectedSub(subId);
    setSelectedL3('');
    setSelectedL4('');
    setPage(1);
    const params = new URLSearchParams();
    if (selectedTab) params.set('tab', selectedTab);
    if (subId) params.set('sub', subId);
    if (imageFilter) params.set('img', imageFilter);
      if (descFilter) params.set('desc', descFilter);
      if (issueFilter) params.set('issue', issueFilter);
    if (search) params.set('q', search);
    setSearchParams(params, { replace: true });
  };

  const handleL3Change = (l3Id) => {
    setSelectedL3(l3Id);
    setSelectedL4('');
    setPage(1);
    const params = new URLSearchParams();
    if (selectedTab) params.set('tab', selectedTab);
    if (selectedSub) params.set('sub', selectedSub);
    if (l3Id) params.set('l3', l3Id);
    if (imageFilter) params.set('img', imageFilter);
      if (descFilter) params.set('desc', descFilter);
      if (issueFilter) params.set('issue', issueFilter);
    if (search) params.set('q', search);
    setSearchParams(params, { replace: true });
  };

  const handleL4Change = (l4Id) => {
    setSelectedL4(l4Id);
    setPage(1);
    const params = new URLSearchParams();
    if (selectedTab) params.set('tab', selectedTab);
    if (selectedSub) params.set('sub', selectedSub);
    if (selectedL3) params.set('l3', selectedL3);
    if (l4Id) params.set('l4', l4Id);
    if (imageFilter) params.set('img', imageFilter);
      if (descFilter) params.set('desc', descFilter);
      if (issueFilter) params.set('issue', issueFilter);
    if (search) params.set('q', search);
    setSearchParams(params, { replace: true });
  };

  // Get sub-categories for selected parent tab
  const subCategories = selectedTab ? allCategories.filter((c) => c.parentId === selectedTab) : [];
  // Get L3 categories for selected L2
  const l3Categories = selectedSub ? allCategories.filter((c) => c.parentId === selectedSub) : [];
  // Get L4 categories for selected L3
  const l4Categories = selectedL3 ? allCategories.filter((c) => c.parentId === selectedL3) : [];

  const getTabName = (cat) => language === 'ar' && cat.nameAr ? cat.nameAr : cat.name;

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/books/${deleteId}`);
      toast.success(t('books.deleted'));
      setDeleteId(null);
      fetchBooks();
    } catch (err) {
      toast.error(t('books.failedDelete'));
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (book) => {
    try {
      await api.put(`/admin/books/${book.id}`, { isActive: !book.isActive });
      toast.success(book.isActive ? t('books.deactivated') : t('books.activated'));
      fetchBooks();
    } catch (err) {
      toast.error(t('books.failedUpdate'));
    }
  };

  const handleToggleOutOfStock = async (book) => {
    try {
      await api.put(`/admin/books/${book.id}`, { isOutOfStock: !book.isOutOfStock });
      toast.success(book.isOutOfStock ? t('inventory.markedInStock') : t('inventory.markedOutOfStock'));
      fetchBooks();
    } catch (err) {
      toast.error(t('books.failedUpdate'));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 3xl:gap-6 mb-6 3xl:mb-8">
        {[
          { icon: FiBook, label: t('dashboard.totalBooks'), value: stats.total, bg: 'bg-blue-600' },
          { icon: FiStar, label: t('books.active'), value: pagination?.total || stats.total, bg: 'bg-amber-500' },
          { icon: FiAlertTriangle, label: t('inventory.lowStock'), value: stats.lowStock, bg: 'bg-red-600' },
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

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => handleTabChange('')}
          className={`px-4 py-2 3xl:px-5 3xl:py-2.5 rounded-lg text-sm 3xl:text-base font-medium whitespace-nowrap transition-colors ${
            selectedTab === '' ? 'bg-admin-accent text-white' : 'bg-admin-card border border-admin-border text-admin-muted hover:text-admin-text hover:bg-gray-50'
          }`}
        >
          {t('common.all')}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleTabChange(cat.id)}
            className={`px-4 py-2 3xl:px-5 3xl:py-2.5 rounded-lg text-sm 3xl:text-base font-medium whitespace-nowrap transition-colors ${
              selectedTab === cat.id ? 'bg-admin-accent text-white' : 'bg-admin-card border border-admin-border text-admin-muted hover:text-admin-text hover:bg-gray-50'
            }`}
          >
            {getTabName(cat)}
          </button>
        ))}
      </div>

      {/* Sub-category Filters (L2 + L3) */}
      {subCategories.length > 0 && (
        <div className="mb-4 bg-admin-card border border-admin-border rounded-xl px-4 py-3 3xl:px-5 3xl:py-4">
          {/* Level 2 */}
          <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => handleSubChange('')}
              className={`px-4 py-2 3xl:px-5 3xl:py-2.5 rounded-lg text-sm 3xl:text-base font-medium whitespace-nowrap transition-colors ${
                selectedSub === '' ? 'bg-admin-accent text-white' : 'bg-admin-card border border-admin-border text-admin-muted hover:text-admin-text hover:bg-gray-50'
              }`}
            >
              {t('common.all')} {getTabName(categories.find((c) => c.id === selectedTab) || {})}
            </button>
            {subCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleSubChange(cat.id)}
                className={`px-4 py-2 3xl:px-5 3xl:py-2.5 rounded-lg text-sm 3xl:text-base font-medium whitespace-nowrap transition-colors ${
                  selectedSub === cat.id ? 'bg-admin-accent text-white' : 'bg-admin-card border border-admin-border text-admin-muted hover:text-admin-text hover:bg-gray-50'
                }`}
              >
                {getTabName(cat)}
              </button>
            ))}
          </div>
          {/* Level 3 */}
          {l3Categories.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-admin-border overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => handleL3Change('')}
                className={`px-4 py-2 3xl:px-5 3xl:py-2.5 rounded-lg text-sm 3xl:text-base font-medium whitespace-nowrap transition-colors ${
                  selectedL3 === '' ? 'bg-admin-accent text-white' : 'bg-admin-card border border-admin-border text-admin-muted hover:text-admin-text hover:bg-gray-50'
                }`}
              >
                {t('common.all')} {getTabName(subCategories.find((c) => c.id === selectedSub) || {})}
              </button>
              {l3Categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleL3Change(cat.id)}
                  className={`px-4 py-2 3xl:px-5 3xl:py-2.5 rounded-lg text-sm 3xl:text-base font-medium whitespace-nowrap transition-colors ${
                    selectedL3 === cat.id ? 'bg-admin-accent text-white' : 'bg-admin-card border border-admin-border text-admin-muted hover:text-admin-text hover:bg-gray-50'
                  }`}
                >
                  {getTabName(cat)}
                </button>
              ))}
            </div>
          )}
          {/* Level 4 */}
          {l4Categories.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-admin-border/50 overflow-x-auto ps-2" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => handleL4Change('')}
                className={`px-3 py-1.5 3xl:px-4 3xl:py-2 rounded-lg text-xs 3xl:text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedL4 === '' ? 'bg-admin-accent text-white' : 'bg-admin-card border border-admin-border text-admin-muted hover:text-admin-text hover:bg-gray-50'
                }`}
              >
                {t('common.all')} {getTabName(l3Categories.find((c) => c.id === selectedL3) || {})}
              </button>
              {l4Categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleL4Change(cat.id)}
                  className={`px-3 py-1.5 3xl:px-4 3xl:py-2 rounded-lg text-xs 3xl:text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedL4 === cat.id ? 'bg-admin-accent text-white' : 'bg-admin-card border border-admin-border text-admin-muted hover:text-admin-text hover:bg-gray-50'
                  }`}
                >
                  {getTabName(cat)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search + Refresh + Add Product */}
      <div className="flex items-center gap-3 mb-4 bg-admin-card border border-admin-border rounded-lg px-3 py-2">
        <div className="relative flex-1 max-w-xl">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} className="w-full pl-10 pr-4 py-2 3xl:py-2.5 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" />
        </div>
        <div className="flex-1" />
        <button onClick={fetchBooks} className="flex items-center gap-1.5 px-3 py-2 3xl:px-4 3xl:py-2.5 text-admin-muted hover:text-admin-accent hover:bg-gray-100 rounded-lg transition-colors text-sm 3xl:text-base font-medium">
          <FiRefreshCw size={14} /> {t('common.refresh')}
        </button>
        {/* Quality Filters — 3 dropdowns */}
        {[
          { id: 'img', value: imageFilter, setter: setImageFilter, label: t('categories.image'), options: [
            { key: '', label: t('common.all') },
            { key: 'hasImage', label: t('books.hasImage') },
            { key: 'noImage', label: t('books.noImage') },
          ]},
          { id: 'desc', value: descFilter, setter: setDescFilter, label: t('books.descEn').replace(' *', ''), options: [
            { key: '', label: t('common.all') },
            { key: 'noDesc', label: t('books.noDesc') },
            { key: 'noDescAr', label: t('books.noDescAr') },
          ]},
          { id: 'issue', value: issueFilter, setter: setIssueFilter, label: t('common.status'), options: [
            { key: '', label: t('common.all') },
            { key: 'duplicateBarcode', label: t('books.duplicateBarcode') },
            { key: 'similarNames', label: t('books.similarNames') },
          ]},
        ].map((filter) => (
          <div key={filter.id} className="relative">
            <button
              onClick={() => setOpenFilterMenu(openFilterMenu === filter.id ? null : filter.id)}
              className={`flex items-center gap-1.5 px-3 py-2 3xl:px-4 3xl:py-2.5 border rounded-lg text-xs 3xl:text-sm font-medium transition-colors whitespace-nowrap ${
                filter.value ? 'border-admin-accent text-admin-accent bg-blue-50' : 'border-admin-input-border text-admin-muted hover:text-admin-accent hover:bg-gray-100'
              }`}
            >
              <FiFilter size={12} />
              {filter.value ? filter.options.find((o) => o.key === filter.value)?.label || filter.label : filter.label}
            </button>
            {openFilterMenu === filter.id && (
              <div className="absolute top-full mt-1 right-0 bg-white border border-admin-border rounded-lg shadow-xl z-50 min-w-[200px] py-1">
                {filter.options.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      filter.setter(opt.key);
                      setOpenFilterMenu(null);
                      setPage(1);
                      const params = new URLSearchParams();
                      if (selectedTab) params.set('tab', selectedTab);
                      if (selectedSub) params.set('sub', selectedSub);
                      if (selectedL3) params.set('l3', selectedL3);
                      if (selectedL4) params.set('l4', selectedL4);
                      const newImg = filter.id === 'img' ? opt.key : imageFilter;
                      const newDesc = filter.id === 'desc' ? opt.key : descFilter;
                      const newIssue = filter.id === 'issue' ? opt.key : issueFilter;
                      if (newImg) params.set('img', newImg);
                      if (newDesc) params.set('desc', newDesc);
                      if (newIssue) params.set('issue', newIssue);
                      if (search) params.set('q', search);
                      setSearchParams(params, { replace: true });
                    }}
                    className={`w-full text-start px-4 py-2 text-sm transition-colors ${
                      filter.value === opt.key ? 'bg-admin-accent text-white font-medium' : 'text-admin-text hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <Link
          to={selectedTab ? `/books/create?category=${selectedTab}` : '/books/create'}
          className="flex items-center gap-2 px-4 py-2 3xl:px-5 3xl:py-2.5 bg-admin-accent text-white rounded-lg text-sm 3xl:text-base font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"
        >
          <FiPlus size={16} /> {t('books.addBook')}
        </Link>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 mb-3 bg-admin-accent/5 border border-admin-accent/20 rounded-lg px-4 py-2.5 3xl:px-6 3xl:py-3">
          <span className="text-sm 3xl:text-lg font-medium text-admin-accent">{selectedIds.length} {t('common.selected')}</span>
          <div className="flex-1" />
          <button onClick={() => setBulkConfirmAction('delete')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">{t('common.bulkDelete')}</button>
          <button onClick={() => handleBulkAction('activate')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">{t('common.bulkActivate')}</button>
          <button onClick={() => handleBulkAction('deactivate')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">{t('common.bulkDeactivate')}</button>
          {/* Move to Category dropdown */}
          <div className="relative">
            <button onClick={() => { setBulkCatOpen(!bulkCatOpen); setBulkSectionOpen(false); }} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors whitespace-nowrap">
              {t('books.moveCategory')}
            </button>
            {bulkCatOpen && (() => {
              const l1Cats = allCategories.filter(c => !c.parentId);
              return (
                <div className="absolute top-full mt-1 right-0 bg-white border border-admin-border rounded-lg shadow-xl z-50 w-[320px] 3xl:w-[400px]">
                  <div className="max-h-72 overflow-y-auto p-2" style={{ scrollbarWidth: 'thin' }}>
                    {l1Cats.map(l1 => {
                      const isL1Selected = bulkSelectedL1 === l1.id;
                      const l2Children = isL1Selected ? allCategories.filter(c => c.parentId === l1.id) : [];
                      return (
                        <div key={l1.id}>
                          <label className={`flex items-center gap-2 px-2 py-1.5 text-sm 3xl:text-base font-semibold rounded cursor-pointer ${isL1Selected ? 'bg-admin-accent/10 text-admin-accent' : 'text-admin-text hover:bg-gray-50'}`}>
                            <input type="radio" name="bulkL1" checked={isL1Selected} onChange={() => { setBulkSelectedL1(l1.id); setBulkSelectedCats([]); }} className="w-3.5 h-3.5 text-admin-accent" />
                            {getTabName(l1)}
                          </label>
                          {/* L2 under selected L1 */}
                          {l2Children.map(l2 => {
                            const l2Selected = bulkSelectedCats.includes(l2.id);
                            const l3Cats = allCategories.filter(c => c.parentId === l2.id);
                            return (
                              <div key={l2.id}>
                                <label className={`flex items-center gap-2 px-2 py-1 ps-6 text-sm 3xl:text-base rounded cursor-pointer ${l2Selected ? 'text-admin-accent font-medium' : 'text-admin-text hover:bg-gray-50'}`}>
                                  <input type="checkbox" checked={l2Selected} onChange={() => setBulkSelectedCats(prev => prev.includes(l2.id) ? prev.filter(id => id !== l2.id) : [...prev, l2.id])} className="w-3.5 h-3.5 rounded border-gray-300 text-admin-accent" />
                                  {getTabName(l2)}
                                </label>
                                {/* L3 under selected L2 */}
                                {l2Selected && l3Cats.map(l3 => {
                                  const l3Selected = bulkSelectedCats.includes(l3.id);
                                  const l4Cats = allCategories.filter(c => c.parentId === l3.id);
                                  return (
                                    <div key={l3.id}>
                                      <label className={`flex items-center gap-2 px-2 py-1 ps-10 text-xs 3xl:text-sm rounded cursor-pointer ${l3Selected ? 'text-admin-accent font-medium' : 'text-admin-muted hover:bg-gray-50'}`}>
                                        <input type="checkbox" checked={l3Selected} onChange={() => setBulkSelectedCats(prev => prev.includes(l3.id) ? prev.filter(id => id !== l3.id) : [...prev, l3.id])} className="w-3 h-3 rounded border-gray-300 text-admin-accent" />
                                        {getTabName(l3)}
                                      </label>
                                      {/* L4 under selected L3 */}
                                      {l3Selected && l4Cats.map(l4 => (
                                        <label key={l4.id} className={`flex items-center gap-2 px-2 py-1 ps-14 text-xs 3xl:text-sm rounded cursor-pointer ${bulkSelectedCats.includes(l4.id) ? 'text-admin-accent font-medium' : 'text-admin-muted/70 hover:bg-gray-50'}`}>
                                          <input type="checkbox" checked={bulkSelectedCats.includes(l4.id)} onChange={() => setBulkSelectedCats(prev => prev.includes(l4.id) ? prev.filter(id => id !== l4.id) : [...prev, l4.id])} className="w-3 h-3 rounded border-gray-300 text-admin-accent" />
                                          {getTabName(l4)}
                                        </label>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  {/* Selected categories chips */}
                  {bulkSelectedCats.length > 0 && (
                    <div className="px-2 py-1.5 border-t border-admin-border flex flex-wrap gap-1.5">
                      {bulkSelectedCats.map(id => {
                        const cat = allCategories.find(c => c.id === id);
                        if (!cat) return null;
                        return (
                          <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs 3xl:text-sm bg-admin-accent/10 text-admin-accent rounded-full">
                            {getTabName(cat)}
                            <button type="button" onClick={() => setBulkSelectedCats(prev => prev.filter(i => i !== id))} className="hover:text-red-500">×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="p-2 border-t border-admin-border flex items-center justify-between">
                    <span className="text-xs 3xl:text-sm text-admin-muted">{bulkSelectedCats.length} {t('common.selected')}</span>
                    <button disabled={bulkSelectedCats.length === 0} onClick={() => { handleBulkAction('moveCategory', { categoryId: bulkSelectedCats[0], additionalCategoryIds: bulkSelectedCats.slice(1) }); setBulkCatOpen(false); setBulkSelectedCats([]); setBulkSelectedL1(''); setBulkCatSearch(''); }} className="px-4 py-1.5 3xl:px-5 3xl:py-2 text-sm 3xl:text-base bg-admin-accent text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                      {t('common.apply')}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
          {/* Set Section dropdown */}
          <div className="relative">
            <button onClick={() => { setBulkSectionOpen(!bulkSectionOpen); setBulkCatOpen(false); }} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors whitespace-nowrap">
              {t('books.setSection')}
            </button>
            {bulkSectionOpen && (
              <div className="absolute top-full mt-1 right-0 bg-white border border-admin-border rounded-lg shadow-xl z-50 w-[220px] 3xl:w-[280px] p-3 space-y-2">
                {[
                  { key: 'isFeatured', label: t('books.featured') },
                  { key: 'isBestseller', label: t('books.bestseller') },
                  { key: 'isNewArrival', label: t('books.newArrival') },
                  { key: 'isTrending', label: t('books.trending') },
                  { key: 'isComingSoon', label: t('books.comingSoon') },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm text-admin-text cursor-pointer">
                    <input type="checkbox" checked={!!bulkSections[opt.key]} onChange={() => setBulkSections(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))} className="w-4 h-4 rounded border-gray-300 text-admin-accent" />
                    {opt.label}
                  </label>
                ))}
                <button onClick={() => { handleBulkAction('setSection', bulkSections); setBulkSectionOpen(false); setBulkSections({}); }} className="w-full mt-2 px-4 py-1.5 text-sm bg-admin-accent text-white rounded-lg hover:bg-blue-600">
                  {t('common.apply')}
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setSelectedIds([])} className="text-sm 3xl:text-base text-admin-muted hover:text-admin-text">&#10005;</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm 3xl:text-base">
            <thead className="bg-gray-50 border-b border-admin-border">
              <tr>
                <th className="px-4 py-3 3xl:px-5 3xl:py-4 w-10 3xl:w-12">
                  <input type="checkbox" checked={isAllSelected(books)} onChange={() => toggleSelectAll(books)} className="w-4 h-4 3xl:w-5 3xl:h-5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent" />
                </th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted w-12">#</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('books.bookTitle')}</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('books.category')}</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('books.price')}</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('books.stock')}</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('books.active')}</th>
                <th className="text-right px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : books.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-admin-muted">{t('common.noResults')}</td></tr>
              ) : (
                books.map((book, index) => (
                  <tr key={book.id} className={`border-b border-admin-border hover:bg-gray-50 transition-colors ${selectedIds.includes(book.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <input type="checkbox" checked={selectedIds.includes(book.id)} onChange={() => toggleSelect(book.id)} className="w-4 h-4 3xl:w-5 3xl:h-5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent" />
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs 3xl:text-sm">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <div className="flex items-center gap-3 3xl:gap-4">
                        <div className="w-8 h-10 3xl:w-10 3xl:h-12 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                          {book.coverImage ? <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/${book.coverImage}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] 3xl:text-xs font-bold text-admin-muted">{book.title.charAt(0)}</div>}
                        </div>
                        <span className="font-medium text-admin-text truncate max-w-[200px] 3xl:max-w-[300px]">{book.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs 3xl:text-sm">
                      <div className="flex items-center gap-1.5">
                        <span>{book.category ? (language === 'ar' && book.category.nameAr ? book.category.nameAr : book.category.name) : '—'}</span>
                        {(() => {
                          const extra = (book.bookCategories || []).filter((bc) => bc.category.id !== book.categoryId);
                          return extra.length > 0 ? (
                            <span
                              className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-admin-accent/10 text-admin-accent text-[10px] font-semibold leading-none cursor-default"
                              title={extra.map((bc) => language === 'ar' && bc.category.nameAr ? bc.category.nameAr : bc.category.name).join(', ')}
                            >
                              +{extra.length}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-text">QAR {parseFloat(book.price).toFixed(2)}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <span className={`font-medium ${book.stock <= 5 ? 'text-red-500' : 'text-admin-text'}`}>{book.stock}</span>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <button
                        onClick={() => handleToggleActive(book)}
                        className={`px-2.5 py-0.5 3xl:px-3 3xl:py-1 text-xs 3xl:text-sm font-medium rounded-full cursor-pointer transition-colors ${
                          book.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                      >
                        {book.isActive ? t('common.active') : t('common.inactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleOutOfStock(book)}
                          className={`px-2 py-0.5 3xl:px-2.5 3xl:py-1 text-[10px] 3xl:text-xs font-semibold rounded-full cursor-pointer transition-colors ${
                            book.isOutOfStock ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {book.isOutOfStock ? t('books.outOfStock') : t('common.inStock')}
                        </button>
                        <Link to={`/books/${book.id}/edit`} onClick={saveScroll} className="p-1.5 3xl:p-2 text-admin-muted hover:text-admin-accent transition-colors"><FiEdit2 size={15} className="3xl:w-[18px] 3xl:h-[18px]" /></Link>
                        <button onClick={() => setDeleteId(book.id)} className="p-1.5 3xl:p-2 text-admin-muted hover:text-red-500 transition-colors"><FiTrash2 size={15} className="3xl:w-[18px] 3xl:h-[18px]" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 3xl:px-6 3xl:py-4 border-t border-admin-border">
          <div className="flex items-center gap-3">
            <span className="text-xs 3xl:text-sm text-admin-muted">{t('common.showing')} {books.length} {t('common.of')} {pagination?.total || books.length}</span>
            <select
              value={limit}
              onChange={(e) => {
                const newLimit = Number(e.target.value);
                setLimit(newLimit);
                setPage(1);
                const params = new URLSearchParams();
                if (selectedTab) params.set('tab', selectedTab);
                if (selectedSub) params.set('sub', selectedSub);
                if (selectedL3) params.set('l3', selectedL3);
                if (selectedL4) params.set('l4', selectedL4);
                if (imageFilter) params.set('img', imageFilter);
      if (descFilter) params.set('desc', descFilter);
      if (issueFilter) params.set('issue', issueFilter);
                if (search) params.set('q', search);
                params.set('page', '1');
                if (newLimit !== 10) params.set('limit', String(newLimit));
                setSearchParams(params, { replace: true });
              }}
              className="px-2 py-1 bg-admin-bg border border-admin-input-border rounded text-xs text-admin-text focus:outline-none focus:border-admin-accent cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>All</option>
            </select>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex gap-1">
              <button disabled={!pagination.hasPrev} onClick={() => {
                const newPage = page - 1;
                setPage(newPage);
                const params = new URLSearchParams();
                if (selectedTab) params.set('tab', selectedTab);
                if (selectedSub) params.set('sub', selectedSub);
                if (selectedL3) params.set('l3', selectedL3);
                if (selectedL4) params.set('l4', selectedL4);
                if (imageFilter) params.set('img', imageFilter);
      if (descFilter) params.set('desc', descFilter);
      if (issueFilter) params.set('issue', issueFilter);
                if (search) params.set('q', search);
                if (newPage > 1) params.set('page', String(newPage));
                if (limit !== 10) params.set('limit', String(limit));
                setSearchParams(params, { replace: true });
              }} className="p-1.5 rounded border border-admin-border text-admin-muted disabled:opacity-30 hover:bg-gray-50"><FiChevronLeft size={16} /></button>
              <button disabled={!pagination.hasNext} onClick={() => {
                const newPage = page + 1;
                setPage(newPage);
                const params = new URLSearchParams();
                if (selectedTab) params.set('tab', selectedTab);
                if (selectedSub) params.set('sub', selectedSub);
                if (selectedL3) params.set('l3', selectedL3);
                if (selectedL4) params.set('l4', selectedL4);
                if (imageFilter) params.set('img', imageFilter);
      if (descFilter) params.set('desc', descFilter);
      if (issueFilter) params.set('issue', issueFilter);
                if (search) params.set('q', search);
                params.set('page', String(newPage));
                if (limit !== 10) params.set('limit', String(limit));
                setSearchParams(params, { replace: true });
              }} className="p-1.5 rounded border border-admin-border text-admin-muted disabled:opacity-30 hover:bg-gray-50"><FiChevronRight size={16} /></button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deleteId}
        title={t('books.deleteProduct')}
        message={t('books.deleteProductConfirm')}
        confirmText={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmModal
        open={bulkConfirmAction === 'delete'}
        title={t('common.bulkDelete')}
        message={t('common.bulkConfirm').replace('{count}', selectedIds.length)}
        confirmText={t('common.delete')}
        onConfirm={() => handleBulkAction('delete')}
        onCancel={() => setBulkConfirmAction(null)}
      />
    </motion.div>
  );
}
