import { useState, useEffect, useRef } from 'react';
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
  const [stats, setStats] = useState({ total: null, active: null, lowStock: null });
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
  const [bulkPubOpen, setBulkPubOpen] = useState(false);
  const [bulkPublisher, setBulkPublisher] = useState('');
  const [bulkPublisherAr, setBulkPublisherAr] = useState('');
  const [bulkAuthorOpen, setBulkAuthorOpen] = useState(false);
  const [bulkAuthor, setBulkAuthor] = useState('');
  const [bulkAuthorAr, setBulkAuthorAr] = useState('');
  const [bulkBrandOpen, setBulkBrandOpen] = useState(false);
  const [bulkBrand, setBulkBrand] = useState('');
  const [bulkBrandAr, setBulkBrandAr] = useState('');
  const [bulkColorOpen, setBulkColorOpen] = useState(false);
  const [bulkColor, setBulkColor] = useState('');
  const [bulkColorAr, setBulkColorAr] = useState('');
  const [bulkMaterialOpen, setBulkMaterialOpen] = useState(false);
  const [bulkMaterial, setBulkMaterial] = useState('');
  const [bulkMaterialAr, setBulkMaterialAr] = useState('');
  const [bulkCFOpen, setBulkCFOpen] = useState(null);
  const [bulkCFValue, setBulkCFValue] = useState('');
  const [bulkCFValueAr, setBulkCFValueAr] = useState('');

  useEffect(() => {
    api.get('/admin/categories').then((res) => {
      const all = res.data.data || res.data;
      setAllCategories(all);
      setCategories(all.filter((c) => !c.parentId));
    }).catch(() => {});
  }, []);

  const [suggestedBrands, setSuggestedBrands] = useState([]);
  const [suggestedBrandsAr, setSuggestedBrandsAr] = useState([]);
  const [suggestedColors, setSuggestedColors] = useState([]);
  const [suggestedColorsAr, setSuggestedColorsAr] = useState([]);
  const [suggestedMaterials, setSuggestedMaterials] = useState([]);
  const [suggestedMaterialsAr, setSuggestedMaterialsAr] = useState([]);
  const [suggestedCustomFields, setSuggestedCustomFields] = useState({});
  const [suggestedPublishers, setSuggestedPublishers] = useState([]);
  const [suggestedPublishersAr, setSuggestedPublishersAr] = useState([]);
  const [suggestedAuthors, setSuggestedAuthors] = useState([]);
  const [suggestedAuthorsAr, setSuggestedAuthorsAr] = useState([]);

  useEffect(() => {
    api.get('/books/filters').then((res) => {
      setSuggestedPublishers([...new Set((res.data.publishers || []).map((p) => typeof p === 'string' ? p : p.value).filter(Boolean))]);
      setSuggestedPublishersAr([...new Set((res.data.publishers || []).map((p) => typeof p === 'string' ? null : p.valueAr).filter(Boolean))]);
      setSuggestedAuthors([...new Set((res.data.authors || []).map((a) => typeof a === 'string' ? a : a.value).filter(Boolean))]);
      setSuggestedAuthorsAr([...new Set((res.data.authors || []).map((a) => typeof a === 'string' ? null : a.valueAr).filter(Boolean))]);
      setSuggestedBrands([...new Set((res.data.brands || []).map((b) => typeof b === 'string' ? b : b.value).filter(Boolean))]);
      setSuggestedBrandsAr([...new Set((res.data.brands || []).map((b) => typeof b === 'string' ? null : b.valueAr).filter(Boolean))]);
      setSuggestedColors([...new Set((res.data.colors || []).map((c) => typeof c === 'string' ? c : c.value).filter(Boolean))]);
      setSuggestedColorsAr([...new Set((res.data.colors || []).map((c) => typeof c === 'string' ? null : c.valueAr).filter(Boolean))]);
      setSuggestedMaterials([...new Set((res.data.materials || []).map((m) => typeof m === 'string' ? m : m.value).filter(Boolean))]);
      setSuggestedMaterialsAr([...new Set((res.data.materials || []).map((m) => typeof m === 'string' ? null : m.valueAr).filter(Boolean))]);
      setSuggestedCustomFields(res.data.customFieldValues || {});
    }).catch(() => {});
  }, []);

  const fetchAbortRef = useRef(null);

  const fetchBooks = async () => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit, withStats: '1' });
      if (search) params.set('search', search);
      if (selectedL4) params.set('category', selectedL4);
      else if (selectedL3) params.set('category', selectedL3);
      else if (selectedSub) params.set('category', selectedSub);
      else if (selectedTab) params.set('category', selectedTab);
      if (imageFilter === 'hasImage') params.set('hasImage', 'true');
      if (imageFilter === 'noImage') params.set('hasImage', 'false');
      if (descFilter === 'noDesc') params.set('hasDesc', 'false');
      if (descFilter === 'noDescAr') params.set('hasDescAr', 'false');
      if (issueFilter === 'duplicateBarcode') params.set('duplicateBarcode', 'true');
      if (issueFilter === 'similarNames') params.set('similarNames', 'true');

      const res = await api.get(`/admin/books?${params}`, { signal: controller.signal });
      setBooks(res.data.data);
      setPagination(res.data.pagination);
      if (res.data.stats) {
        setStats(res.data.stats);
      } else {
        setStats({ total: null, active: null, lowStock: null });
        toast.error(t('books.failedLoadStats'), { toastId: 'books-stats-fail' });
      }
    } catch (err) {
      if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') return;
      toast.error(t('books.failedFetch'), { toastId: 'books-list-fail' });
    } finally {
      if (fetchAbortRef.current === controller) {
        setLoading(false);
        const savedScroll = sessionStorage.getItem('admin-books-scroll');
        if (savedScroll) {
          setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 50);
          sessionStorage.removeItem('admin-books-scroll');
        }
      }
    }
  };

  const saveScroll = () => sessionStorage.setItem('admin-books-scroll', window.scrollY.toString());

  const toggleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleSelectAll = async (items) => {
    const allIds = items.map((i) => i.id);
    const allSelected = allIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
    } else if (pagination && pagination.total > items.length) {
      // Fetch ALL matching IDs with current filters
      try {
        const params = new URLSearchParams({ page: 1, limit: 1000 });
        if (search) params.set('search', search);
        if (selectedL4) params.set('category', selectedL4);
        else if (selectedL3) params.set('category', selectedL3);
        else if (selectedSub) params.set('category', selectedSub);
        else if (selectedTab) params.set('category', selectedTab);
        if (imageFilter === 'hasImage') params.set('hasImage', 'true');
        if (imageFilter === 'noImage') params.set('hasImage', 'false');
        if (descFilter === 'noDesc') params.set('hasDesc', 'false');
        if (descFilter === 'noDescAr') params.set('hasDescAr', 'false');
        if (issueFilter === 'duplicateBarcode') params.set('duplicateBarcode', 'true');
        if (issueFilter === 'similarNames') params.set('similarNames', 'true');
        const res = await api.get(`/admin/books?${params}`);
        setSelectedIds(res.data.data.map((b) => b.id));
      } catch {
        setSelectedIds((prev) => [...new Set([...prev, ...allIds])]);
      }
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...allIds])]);
    }
  };
  const isAllSelected = (items) => items.length > 0 && items.every((i) => selectedIds.includes(i.id));

  const handleBulkAction = async (action, extra = {}) => {
    try {
      await api.post('/admin/books/bulk-action', { ids: selectedIds, action, ...extra });
      toast.success(t('common.bulkSuccess'));
      if (action === 'delete') setSelectedIds([]);
      setBulkConfirmAction(null);
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.saveFailed'));
      setBulkConfirmAction(null);
    }
  };

  useEffect(() => { fetchBooks(); }, [page, limit, selectedTab, selectedSub, selectedL3, selectedL4, imageFilter, descFilter, issueFilter]);

  const firstSearchRun = useRef(true);
  useEffect(() => {
    if (firstSearchRun.current) { firstSearchRun.current = false; return; }
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
    setSelectedIds([]);
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

  // Check if a field is enabled for the selected top-level category
  const selectedParentCat = selectedTab ? categories.find((c) => c.id === selectedTab) : null;
  const parentDetailFields = (() => {
    if (!selectedParentCat?.detailFields) return null;
    try {
      const parsed = JSON.parse(selectedParentCat.detailFields);
      if (Array.isArray(parsed)) return parsed;
      return parsed.filters || parsed.detail || null;
    } catch { return null; }
  })();
  const showBulkField = (key) => selectedTab && (!parentDetailFields || parentDetailFields.includes(key));
  const parentCustomFields = (() => {
    if (!selectedParentCat?.customFields) return [];
    try { return JSON.parse(selectedParentCat.customFields); } catch { return []; }
  })();

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
          { icon: FiBook, label: t('dashboard.totalBooks'), value: stats.total ?? '—', bg: 'bg-blue-600' },
          { icon: FiStar, label: t('books.active'), value: stats.active ?? '—', bg: 'bg-amber-500' },
          { icon: FiAlertTriangle, label: t('inventory.lowStock'), value: stats.lowStock ?? '—', bg: 'bg-red-600' },
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
          <FiSearch className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} className="w-full ps-10 pe-4 py-2 3xl:py-2.5 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" />
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
              <div className="absolute top-full mt-1 end-0 bg-white border border-admin-border rounded-lg shadow-xl z-50 min-w-[200px] py-1">
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
        <div className="flex flex-wrap items-center gap-3 mb-3 bg-admin-accent/5 border border-admin-accent/20 rounded-lg px-4 py-2.5 3xl:px-6 3xl:py-3">
          <span className="text-sm 3xl:text-lg font-medium text-admin-accent">{selectedIds.length} {t('common.selected')}</span>
          <div className="flex-1 min-w-0" />
          <button onClick={() => setBulkConfirmAction('delete')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">{t('common.bulkDelete')}</button>
          <button onClick={() => handleBulkAction('activate')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg border border-admin-border text-admin-text hover:bg-gray-50 transition-colors">{t('common.bulkActivate')}</button>
          <button onClick={() => handleBulkAction('deactivate')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg border border-admin-border text-admin-muted hover:bg-gray-50 transition-colors">{t('common.bulkDeactivate')}</button>
          {/* Move to Category dropdown */}
          <div className="relative">
            <button onClick={() => { setBulkCatOpen(!bulkCatOpen); setBulkSectionOpen(false); setBulkPubOpen(false); setBulkAuthorOpen(false); setBulkBrandOpen(false); setBulkColorOpen(false); setBulkMaterialOpen(false); setBulkCFOpen(null); }} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg border border-admin-border text-admin-text hover:bg-gray-50 transition-colors whitespace-nowrap">
              {t('books.moveCategory')}
            </button>
            {bulkCatOpen && (() => {
              const l1Cats = allCategories.filter(c => !c.parentId);
              return (
                <div className="absolute top-full mt-1 end-0 bg-white border border-admin-border rounded-lg shadow-xl z-50 w-[320px] 3xl:w-[400px]">
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
                    <span className="text-xs 3xl:text-sm text-admin-muted">{bulkSelectedCats.length + (bulkSelectedL1 ? 1 : 0)} {t('common.selected')}</span>
                    <button disabled={bulkSelectedCats.length === 0 && !bulkSelectedL1} onClick={() => {
                      // If admin picked only the L1 radio (no sub-category checkboxes), move to just the L1.
                      // Otherwise the deepest category becomes primary, rest go into additional.
                      const picks = bulkSelectedCats.length > 0 ? bulkSelectedCats : [bulkSelectedL1];
                      const getDepth = (id) => { let d = 0; let c = allCategories.find(x => x.id === id); while (c?.parentId) { d++; c = allCategories.find(x => x.id === c.parentId); } return d; };
                      const sorted = [...picks].sort((a, b) => getDepth(b) - getDepth(a));
                      handleBulkAction('moveCategory', { categoryId: sorted[0], additionalCategoryIds: sorted.slice(1) });
                      setBulkCatOpen(false); setBulkSelectedCats([]); setBulkSelectedL1('');
                    }} className="px-4 py-1.5 3xl:px-5 3xl:py-2 text-sm 3xl:text-base bg-admin-accent text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                      {t('common.apply')}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
          {/* Set Section dropdown */}
          <div className="relative">
            <button onClick={() => { setBulkSectionOpen(!bulkSectionOpen); setBulkCatOpen(false); setBulkPubOpen(false); setBulkAuthorOpen(false); setBulkBrandOpen(false); setBulkColorOpen(false); setBulkMaterialOpen(false); setBulkCFOpen(null); }} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg border border-admin-border text-admin-text hover:bg-gray-50 transition-colors whitespace-nowrap">
              {t('books.setSection')}
            </button>
            {bulkSectionOpen && (
              <div className="absolute top-full mt-1 end-0 bg-white border border-admin-border rounded-lg shadow-xl z-50 w-[220px] 3xl:w-[280px] p-3 space-y-2">
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
          {/* Set Publisher dropdown */}
          {showBulkField('publisher') && <div className="relative">
            <button onClick={() => { setBulkPubOpen(!bulkPubOpen); setBulkAuthorOpen(false); setBulkBrandOpen(false); setBulkColorOpen(false); setBulkMaterialOpen(false); setBulkCFOpen(null); setBulkCatOpen(false); setBulkSectionOpen(false); }} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg border border-admin-border text-admin-text hover:bg-gray-50 transition-colors whitespace-nowrap">
              {t('books.publisher')}
            </button>
            {bulkPubOpen && (
              <div className="absolute top-full mt-1 end-0 bg-white border border-admin-border rounded-lg shadow-xl z-50 w-[280px] 3xl:w-[340px] p-3">
                {/* EN input */}
                <div className="relative">
                  <input type="text" value={bulkPublisher} onChange={(e) => setBulkPublisher(e.target.value)} placeholder={t('books.publisherEn')} className="w-full px-3 py-1.5 text-sm border border-admin-input-border rounded-lg focus:outline-none focus:border-admin-accent peer" autoFocus />
                  {/* EN dropdown — between EN and AR inputs */}
                  <div className="hidden peer-focus:block mt-1 bg-white border border-admin-border rounded-lg shadow-lg max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {suggestedPublishers.filter(p => !bulkPublisher || p.toLowerCase().includes(bulkPublisher.toLowerCase())).map((p) => (
                      <button key={p} onMouseDown={(e) => e.preventDefault()} onClick={() => { setBulkPublisher(p); document.activeElement?.blur(); }} className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${bulkPublisher === p ? 'bg-admin-accent/10 text-admin-accent font-medium' : 'text-admin-text hover:bg-gray-50'}`}>{p}</button>
                    ))}
                  </div>
                </div>
                {/* AR input */}
                <div className="relative mt-2">
                  <input type="text" value={bulkPublisherAr} onChange={(e) => setBulkPublisherAr(e.target.value)} placeholder={t('books.publisherAr')} dir="rtl" className="w-full px-3 py-1.5 text-sm border border-admin-input-border rounded-lg focus:outline-none focus:border-admin-accent peer" />
                  {/* AR dropdown — under AR input, shows Arabic names */}
                  <div className="hidden peer-focus:block mt-1 bg-white border border-admin-border rounded-lg shadow-lg max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {suggestedPublishersAr.filter(p => !bulkPublisherAr || p.includes(bulkPublisherAr)).map((p) => (
                      <button key={p} onMouseDown={(e) => e.preventDefault()} onClick={() => { setBulkPublisherAr(p); document.activeElement?.blur(); }} className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${bulkPublisherAr === p ? 'bg-admin-accent/10 text-admin-accent font-medium' : 'text-admin-text hover:bg-gray-50'}`} dir="rtl">{p}</button>
                    ))}
                  </div>
                </div>
                <button disabled={!bulkPublisher.trim() && !bulkPublisherAr.trim()} onClick={() => { handleBulkAction('setPublisher', { publisher: bulkPublisher.trim(), publisherAr: bulkPublisherAr.trim() }); setBulkPubOpen(false); setBulkPublisher(''); setBulkPublisherAr(''); }} className="w-full mt-2 px-4 py-1.5 text-sm bg-admin-accent text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                  {t('common.apply')}
                </button>
              </div>
            )}
          </div>}
          {/* Set Author dropdown */}
          {showBulkField('author') && <div className="relative">
            <button onClick={() => { setBulkAuthorOpen(!bulkAuthorOpen); setBulkPubOpen(false); setBulkBrandOpen(false); setBulkColorOpen(false); setBulkMaterialOpen(false); setBulkCFOpen(null); setBulkCatOpen(false); setBulkSectionOpen(false); }} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg border border-admin-border text-admin-text hover:bg-gray-50 transition-colors whitespace-nowrap">
              {t('books.author')}
            </button>
            {bulkAuthorOpen && (
              <div className="absolute top-full mt-1 end-0 bg-white border border-admin-border rounded-lg shadow-xl z-50 w-[280px] 3xl:w-[340px] p-3">
                {/* EN input */}
                <div className="relative">
                  <input type="text" value={bulkAuthor} onChange={(e) => setBulkAuthor(e.target.value)} placeholder={t('books.authorEn')} className="w-full px-3 py-1.5 text-sm border border-admin-input-border rounded-lg focus:outline-none focus:border-admin-accent peer" autoFocus />
                  {/* EN dropdown — between EN and AR inputs */}
                  <div className="hidden peer-focus:block mt-1 bg-white border border-admin-border rounded-lg shadow-lg max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {suggestedAuthors.filter(a => !bulkAuthor || a.toLowerCase().includes(bulkAuthor.toLowerCase())).map((a) => (
                      <button key={a} onMouseDown={(e) => e.preventDefault()} onClick={() => { setBulkAuthor(a); document.activeElement?.blur(); }} className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${bulkAuthor === a ? 'bg-admin-accent/10 text-admin-accent font-medium' : 'text-admin-text hover:bg-gray-50'}`}>{a}</button>
                    ))}
                  </div>
                </div>
                {/* AR input */}
                <div className="relative mt-2">
                  <input type="text" value={bulkAuthorAr} onChange={(e) => setBulkAuthorAr(e.target.value)} placeholder={t('books.authorAr')} dir="rtl" className="w-full px-3 py-1.5 text-sm border border-admin-input-border rounded-lg focus:outline-none focus:border-admin-accent peer" />
                  {/* AR dropdown — under AR input, shows Arabic names */}
                  <div className="hidden peer-focus:block mt-1 bg-white border border-admin-border rounded-lg shadow-lg max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {suggestedAuthorsAr.filter(a => !bulkAuthorAr || a.includes(bulkAuthorAr)).map((a) => (
                      <button key={a} onMouseDown={(e) => e.preventDefault()} onClick={() => { setBulkAuthorAr(a); document.activeElement?.blur(); }} className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${bulkAuthorAr === a ? 'bg-admin-accent/10 text-admin-accent font-medium' : 'text-admin-text hover:bg-gray-50'}`} dir="rtl">{a}</button>
                    ))}
                  </div>
                </div>
                <button disabled={!bulkAuthor.trim() && !bulkAuthorAr.trim()} onClick={() => { handleBulkAction('setAuthor', { author: bulkAuthor.trim(), authorAr: bulkAuthorAr.trim() }); setBulkAuthorOpen(false); setBulkAuthor(''); setBulkAuthorAr(''); }} className="w-full mt-2 px-4 py-1.5 text-sm bg-admin-accent text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                  {t('common.apply')}
                </button>
              </div>
            )}
          </div>}
          {/* Set Brand dropdown */}
          {showBulkField('brand') && <div className="relative">
            <button onClick={() => { setBulkBrandOpen(!bulkBrandOpen); setBulkPubOpen(false); setBulkAuthorOpen(false); setBulkColorOpen(false); setBulkMaterialOpen(false); setBulkCFOpen(null); setBulkCatOpen(false); setBulkSectionOpen(false); }} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg border border-admin-border text-admin-text hover:bg-gray-50 transition-colors whitespace-nowrap">
              {t('books.brand')}
            </button>
            {bulkBrandOpen && (
              <div className="absolute top-full mt-1 end-0 bg-white border border-admin-border rounded-lg shadow-xl z-50 w-[280px] 3xl:w-[340px] p-3">
                <div className="relative">
                  <input type="text" value={bulkBrand} onChange={(e) => setBulkBrand(e.target.value)} placeholder={t('books.brand')} className="w-full px-3 py-1.5 text-sm border border-admin-input-border rounded-lg focus:outline-none focus:border-admin-accent peer" autoFocus />
                  <div className="hidden peer-focus:block mt-1 bg-white border border-admin-border rounded-lg shadow-lg max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {suggestedBrands.filter(b => !bulkBrand || b.toLowerCase().includes(bulkBrand.toLowerCase())).map((b) => (
                      <button key={b} onMouseDown={(e) => e.preventDefault()} onClick={() => { setBulkBrand(b); document.activeElement?.blur(); }} className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${bulkBrand === b ? 'bg-admin-accent/10 text-admin-accent font-medium' : 'text-admin-text hover:bg-gray-50'}`}>{b}</button>
                    ))}
                  </div>
                </div>
                <div className="relative mt-2">
                  <input type="text" value={bulkBrandAr} onChange={(e) => setBulkBrandAr(e.target.value)} placeholder={t('books.brandAr')} dir="rtl" className="w-full px-3 py-1.5 text-sm border border-admin-input-border rounded-lg focus:outline-none focus:border-admin-accent peer" />
                  <div className="hidden peer-focus:block mt-1 bg-white border border-admin-border rounded-lg shadow-lg max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {suggestedBrandsAr.filter(b => !bulkBrandAr || b.includes(bulkBrandAr)).map((b) => (
                      <button key={b} onMouseDown={(e) => e.preventDefault()} onClick={() => { setBulkBrandAr(b); document.activeElement?.blur(); }} className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${bulkBrandAr === b ? 'bg-admin-accent/10 text-admin-accent font-medium' : 'text-admin-text hover:bg-gray-50'}`} dir="rtl">{b}</button>
                    ))}
                  </div>
                </div>
                <button disabled={!bulkBrand.trim() && !bulkBrandAr.trim()} onClick={() => { handleBulkAction('setBrand', { brand: bulkBrand.trim(), brandAr: bulkBrandAr.trim() }); setBulkBrandOpen(false); setBulkBrand(''); setBulkBrandAr(''); }} className="w-full mt-2 px-4 py-1.5 text-sm bg-admin-accent text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                  {t('common.apply')}
                </button>
              </div>
            )}
          </div>}
          {/* Set Color dropdown */}
          {showBulkField('color') && <div className="relative">
            <button onClick={() => { setBulkColorOpen(!bulkColorOpen); setBulkPubOpen(false); setBulkAuthorOpen(false); setBulkBrandOpen(false); setBulkMaterialOpen(false); setBulkCFOpen(null); setBulkCatOpen(false); setBulkSectionOpen(false); }} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg border border-admin-border text-admin-text hover:bg-gray-50 transition-colors whitespace-nowrap">
              {t('books.color')}
            </button>
            {bulkColorOpen && (
              <div className="absolute top-full mt-1 end-0 bg-white border border-admin-border rounded-lg shadow-xl z-50 w-[280px] 3xl:w-[340px] p-3">
                <div className="relative">
                  <input type="text" value={bulkColor} onChange={(e) => setBulkColor(e.target.value)} placeholder={t('books.color')} className="w-full px-3 py-1.5 text-sm border border-admin-input-border rounded-lg focus:outline-none focus:border-admin-accent peer" autoFocus />
                  <div className="hidden peer-focus:block mt-1 bg-white border border-admin-border rounded-lg shadow-lg max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {suggestedColors.filter(c => !bulkColor || c.toLowerCase().includes(bulkColor.toLowerCase())).map((c) => (
                      <button key={c} onMouseDown={(e) => e.preventDefault()} onClick={() => { setBulkColor(c); document.activeElement?.blur(); }} className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${bulkColor === c ? 'bg-admin-accent/10 text-admin-accent font-medium' : 'text-admin-text hover:bg-gray-50'}`}>{c}</button>
                    ))}
                  </div>
                </div>
                <div className="relative mt-2">
                  <input type="text" value={bulkColorAr} onChange={(e) => setBulkColorAr(e.target.value)} placeholder={t('books.colorAr')} dir="rtl" className="w-full px-3 py-1.5 text-sm border border-admin-input-border rounded-lg focus:outline-none focus:border-admin-accent peer" />
                  <div className="hidden peer-focus:block mt-1 bg-white border border-admin-border rounded-lg shadow-lg max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {suggestedColorsAr.filter(c => !bulkColorAr || c.includes(bulkColorAr)).map((c) => (
                      <button key={c} onMouseDown={(e) => e.preventDefault()} onClick={() => { setBulkColorAr(c); document.activeElement?.blur(); }} className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${bulkColorAr === c ? 'bg-admin-accent/10 text-admin-accent font-medium' : 'text-admin-text hover:bg-gray-50'}`} dir="rtl">{c}</button>
                    ))}
                  </div>
                </div>
                <button disabled={!bulkColor.trim() && !bulkColorAr.trim()} onClick={() => { handleBulkAction('setColor', { color: bulkColor.trim(), colorAr: bulkColorAr.trim() }); setBulkColorOpen(false); setBulkColor(''); setBulkColorAr(''); }} className="w-full mt-2 px-4 py-1.5 text-sm bg-admin-accent text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                  {t('common.apply')}
                </button>
              </div>
            )}
          </div>}
          {/* Set Material dropdown */}
          {showBulkField('material') && <div className="relative">
            <button onClick={() => { setBulkMaterialOpen(!bulkMaterialOpen); setBulkPubOpen(false); setBulkAuthorOpen(false); setBulkBrandOpen(false); setBulkColorOpen(false); setBulkCFOpen(null); setBulkCatOpen(false); setBulkSectionOpen(false); }} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg border border-admin-border text-admin-text hover:bg-gray-50 transition-colors whitespace-nowrap">
              {t('books.material')}
            </button>
            {bulkMaterialOpen && (
              <div className="absolute top-full mt-1 end-0 bg-white border border-admin-border rounded-lg shadow-xl z-50 w-[280px] 3xl:w-[340px] p-3">
                <div className="relative">
                  <input type="text" value={bulkMaterial} onChange={(e) => setBulkMaterial(e.target.value)} placeholder={t('books.material')} className="w-full px-3 py-1.5 text-sm border border-admin-input-border rounded-lg focus:outline-none focus:border-admin-accent peer" autoFocus />
                  <div className="hidden peer-focus:block mt-1 bg-white border border-admin-border rounded-lg shadow-lg max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {suggestedMaterials.filter(m => !bulkMaterial || m.toLowerCase().includes(bulkMaterial.toLowerCase())).map((m) => (
                      <button key={m} onMouseDown={(e) => e.preventDefault()} onClick={() => { setBulkMaterial(m); document.activeElement?.blur(); }} className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${bulkMaterial === m ? 'bg-admin-accent/10 text-admin-accent font-medium' : 'text-admin-text hover:bg-gray-50'}`}>{m}</button>
                    ))}
                  </div>
                </div>
                <div className="relative mt-2">
                  <input type="text" value={bulkMaterialAr} onChange={(e) => setBulkMaterialAr(e.target.value)} placeholder={t('books.materialAr')} dir="rtl" className="w-full px-3 py-1.5 text-sm border border-admin-input-border rounded-lg focus:outline-none focus:border-admin-accent peer" />
                  <div className="hidden peer-focus:block mt-1 bg-white border border-admin-border rounded-lg shadow-lg max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {suggestedMaterialsAr.filter(m => !bulkMaterialAr || m.includes(bulkMaterialAr)).map((m) => (
                      <button key={m} onMouseDown={(e) => e.preventDefault()} onClick={() => { setBulkMaterialAr(m); document.activeElement?.blur(); }} className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${bulkMaterialAr === m ? 'bg-admin-accent/10 text-admin-accent font-medium' : 'text-admin-text hover:bg-gray-50'}`} dir="rtl">{m}</button>
                    ))}
                  </div>
                </div>
                <button disabled={!bulkMaterial.trim() && !bulkMaterialAr.trim()} onClick={() => { handleBulkAction('setMaterial', { material: bulkMaterial.trim(), materialAr: bulkMaterialAr.trim() }); setBulkMaterialOpen(false); setBulkMaterial(''); setBulkMaterialAr(''); }} className="w-full mt-2 px-4 py-1.5 text-sm bg-admin-accent text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                  {t('common.apply')}
                </button>
              </div>
            )}
          </div>}
          {/* Custom field bulk dropdowns */}
          {parentCustomFields.filter((cf) => showBulkField(`cf_${cf.key}`)).map((cf) => (
            <div key={cf.key} className="relative">
              <button onClick={() => { setBulkCFOpen(bulkCFOpen === cf.key ? null : cf.key); setBulkCFValue(''); setBulkCFValueAr(''); setBulkPubOpen(false); setBulkAuthorOpen(false); setBulkBrandOpen(false); setBulkColorOpen(false); setBulkMaterialOpen(false); setBulkCatOpen(false); setBulkSectionOpen(false); }} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg border border-admin-border text-admin-text hover:bg-gray-50 transition-colors whitespace-nowrap">
                {language === 'ar' && cf.nameAr ? cf.nameAr : cf.name}
              </button>
              {bulkCFOpen === cf.key && (
                <div className="absolute top-full mt-1 end-0 bg-white border border-admin-border rounded-lg shadow-xl z-50 w-[280px] 3xl:w-[340px] p-3">
                  <div className="relative">
                    <input type="text" value={bulkCFValue} onChange={(e) => setBulkCFValue(e.target.value)} placeholder={cf.name} className="w-full px-3 py-1.5 text-sm border border-admin-input-border rounded-lg focus:outline-none focus:border-admin-accent peer" autoFocus />
                    <div className="hidden peer-focus:block mt-1 bg-white border border-admin-border rounded-lg shadow-lg max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {(suggestedCustomFields[cf.key] || []).map((s) => s.value).filter(Boolean).filter(v => !bulkCFValue || v.toLowerCase().includes(bulkCFValue.toLowerCase())).map((v) => (
                        <button key={v} onMouseDown={(e) => e.preventDefault()} onClick={() => { setBulkCFValue(v); document.activeElement?.blur(); }} className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${bulkCFValue === v ? 'bg-admin-accent/10 text-admin-accent font-medium' : 'text-admin-text hover:bg-gray-50'}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div className="relative mt-2">
                    <input type="text" value={bulkCFValueAr} onChange={(e) => setBulkCFValueAr(e.target.value)} placeholder={cf.nameAr || `${cf.name} (${t('books.langArabic')})`} dir="rtl" className="w-full px-3 py-1.5 text-sm border border-admin-input-border rounded-lg focus:outline-none focus:border-admin-accent peer" />
                    <div className="hidden peer-focus:block mt-1 bg-white border border-admin-border rounded-lg shadow-lg max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {(suggestedCustomFields[cf.key] || []).map((s) => s.valueAr).filter(Boolean).filter(v => !bulkCFValueAr || v.includes(bulkCFValueAr)).map((v) => (
                        <button key={v} onMouseDown={(e) => e.preventDefault()} onClick={() => { setBulkCFValueAr(v); document.activeElement?.blur(); }} className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${bulkCFValueAr === v ? 'bg-admin-accent/10 text-admin-accent font-medium' : 'text-admin-text hover:bg-gray-50'}`} dir="rtl">{v}</button>
                      ))}
                    </div>
                  </div>
                  <button disabled={!bulkCFValue.trim() && !bulkCFValueAr.trim()} onClick={() => { handleBulkAction('setCustomField', { fieldKey: cf.key, value: bulkCFValue.trim(), valueAr: bulkCFValueAr.trim() }); setBulkCFOpen(null); setBulkCFValue(''); setBulkCFValueAr(''); }} className="w-full mt-2 px-4 py-1.5 text-sm bg-admin-accent text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                    {t('common.apply')}
                  </button>
                </div>
              )}
            </div>
          ))}
          <button onClick={() => { setSelectedIds([]); setBulkCatOpen(false); setBulkSectionOpen(false); setBulkPubOpen(false); setBulkAuthorOpen(false); setBulkBrandOpen(false); setBulkColorOpen(false); setBulkMaterialOpen(false); setBulkCFOpen(null); setBulkConfirmAction(null); }} className="text-sm 3xl:text-base text-admin-muted hover:text-admin-text">&#10005;</button>
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
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted w-12">#</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('books.bookTitle')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('books.category')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('books.price')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('books.stock')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('books.active')}</th>
                <th className="text-end px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.actions')}</th>
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
                          {book.coverImage ? <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/${book.coverImage}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] 3xl:text-xs font-bold text-admin-muted">{(language === 'ar' && book.titleAr ? book.titleAr : book.title).charAt(0)}</div>}
                        </div>
                        <span className="font-medium text-admin-text truncate max-w-[200px] 3xl:max-w-[300px]">{language === 'ar' && book.titleAr ? book.titleAr : book.title}</span>
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
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-end">
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
            <span className="text-xs 3xl:text-sm text-admin-muted">{t('common.showing')} {books.length} {t('common.of')} {pagination?.total ?? books.length}</span>
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
              <option value={100}>100</option>
              <option value={1000}>{t('common.all')}</option>
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
