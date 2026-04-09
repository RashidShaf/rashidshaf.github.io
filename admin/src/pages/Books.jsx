import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiChevronLeft, FiChevronRight, FiBook, FiStar, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';

export default function Books() {
  const { t, language } = useLanguageStore();
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, featured: 0, lowStock: 0 });
  const [deleteId, setDeleteId] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTab, setSelectedTab] = useState(searchParams.get('tab') || '');
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedL3, setSelectedL3] = useState('');
  const [selectedL4, setSelectedL4] = useState('');

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
      const res = await api.get(`/admin/books?${params}`);
      setBooks(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooks(); }, [page, limit, selectedTab, selectedSub, selectedL3, selectedL4]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchBooks(); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleTabChange = (tabId) => {
    setSelectedTab(tabId);
    setSelectedSub('');
    setSelectedL3('');
    setSelectedL4('');
    setPage(1);
  };

  const handleSubChange = (subId) => {
    setSelectedSub(subId);
    setSelectedL3('');
    setSelectedL4('');
    setPage(1);
  };

  const handleL3Change = (l3Id) => {
    setSelectedL3(l3Id);
    setSelectedL4('');
    setPage(1);
  };

  const handleL4Change = (l4Id) => {
    setSelectedL4(l4Id);
    setPage(1);
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
      toast.success('Book deleted');
      setDeleteId(null);
      fetchBooks();
    } catch (err) {
      toast.error('Failed to delete');
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (book) => {
    try {
      await api.put(`/admin/books/${book.id}`, { isActive: !book.isActive });
      toast.success(book.isActive ? 'Book deactivated' : 'Book activated');
      fetchBooks();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const handleToggleOutOfStock = async (book) => {
    try {
      await api.put(`/admin/books/${book.id}`, { isOutOfStock: !book.isOutOfStock });
      toast.success(book.isOutOfStock ? 'Marked as In Stock' : 'Marked as Out of Stock');
      fetchBooks();
    } catch (err) {
      toast.error('Failed to update');
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
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} className="w-full pl-10 pr-4 py-2 3xl:py-2.5 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" />
        </div>
        <div className="flex-1" />
        <button onClick={fetchBooks} className="flex items-center gap-1.5 px-3 py-2 3xl:px-4 3xl:py-2.5 text-admin-muted hover:text-admin-accent hover:bg-gray-100 rounded-lg transition-colors text-sm 3xl:text-base font-medium">
          <FiRefreshCw size={14} /> {t('common.refresh')}
        </button>
        <Link
          to={selectedTab ? `/books/create?category=${selectedTab}` : '/books/create'}
          className="flex items-center gap-2 px-4 py-2 3xl:px-5 3xl:py-2.5 bg-admin-accent text-white rounded-lg text-sm 3xl:text-base font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"
        >
          <FiPlus size={16} /> {t('books.addBook')}
        </Link>
      </div>

      {/* Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm 3xl:text-base">
            <thead className="bg-gray-50 border-b border-admin-border">
              <tr>
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
                  <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : books.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-admin-muted">{t('common.noResults')}</td></tr>
              ) : (
                books.map((book, index) => (
                  <tr key={book.id} className="border-b border-admin-border hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                          {book.coverImage ? <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/${book.coverImage}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-admin-muted">{book.title.charAt(0)}</div>}
                        </div>
                        <span className="font-medium text-admin-text truncate max-w-[200px]">{book.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs">
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
                        className={`px-2.5 py-0.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${
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
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-full cursor-pointer transition-colors ${
                            book.isOutOfStock ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {book.isOutOfStock ? t('books.outOfStock') : t('common.inStock')}
                        </button>
                        <Link to={`/books/${book.id}/edit`} className="p-1.5 text-admin-muted hover:text-admin-accent transition-colors"><FiEdit2 size={15} /></Link>
                        <button onClick={() => setDeleteId(book.id)} className="p-1.5 text-admin-muted hover:text-red-500 transition-colors"><FiTrash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-admin-border">
          <div className="flex items-center gap-3">
            <span className="text-xs text-admin-muted">{t('common.showing')} {books.length} {t('common.of')} {pagination?.total || books.length}</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
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
              <button disabled={!pagination.hasPrev} onClick={() => setPage(page - 1)} className="p-1.5 rounded border border-admin-border text-admin-muted disabled:opacity-30 hover:bg-gray-50"><FiChevronLeft size={16} /></button>
              <button disabled={!pagination.hasNext} onClick={() => setPage(page + 1)} className="p-1.5 rounded border border-admin-border text-admin-muted disabled:opacity-30 hover:bg-gray-50"><FiChevronRight size={16} /></button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deleteId}
        title={t('books.deleteProduct')}
        message={t('books.deleteProductConfirm')}
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
}
