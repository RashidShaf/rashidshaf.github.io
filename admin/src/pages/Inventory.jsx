import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { FiAlertTriangle, FiPackage, FiChevronLeft, FiChevronRight, FiChevronUp, FiPlus, FiX, FiBook, FiDollarSign, FiLayers, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';

export default function Inventory() {
  const { t, language } = useLanguageStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [limit, setLimit] = useState(parseInt(searchParams.get('limit')) || 10);
  const [loading, setLoading] = useState(true);
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restocking, setRestocking] = useState(false);
  const [summary, setSummary] = useState(null);
  const [invSearch, setInvSearch] = useState(searchParams.get('q') || '');
  const [alertMinimized, setAlertMinimized] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTab, setSelectedTab] = useState(searchParams.get('tab') || '');
  const [selectedSub, setSelectedSub] = useState(searchParams.get('sub') || '');

  useEffect(() => {
    api.get('/admin/reports/inventory').then((res) => setSummary(res.data.summary)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/admin/categories').then((res) => {
      const all = res.data.data || res.data;
      setAllCategories(all);
      setCategories(all.filter((c) => !c.parentId));
    }).catch(() => {});
  }, []);

  const subCategories = selectedTab ? allCategories.filter((c) => c.parentId === selectedTab) : [];
  const getTabName = (cat) => language === 'ar' && cat.nameAr ? cat.nameAr : cat.name;

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (invSearch) params.set('search', invSearch);
      if (selectedSub) params.set('category', selectedSub);
      else if (selectedTab) params.set('category', selectedTab);
      const [invRes, lowRes] = await Promise.all([
        api.get(`/admin/inventory?${params}`),
        api.get('/admin/inventory/low-stock'),
      ]);
      setInventory(invRes.data.data || invRes.data);
      setPagination(invRes.data.pagination || null);
      setLowStock(lowRes.data.data || lowRes.data);
      setSelectedIds([]);
    } catch (err) {
      toast.error(t('inventory.failedFetch'));
    } finally {
      setLoading(false);
      const savedScroll = sessionStorage.getItem('admin-inventory-scroll');
      if (savedScroll) {
        setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 50);
        sessionStorage.removeItem('admin-inventory-scroll');
      }
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [page, limit, selectedTab, selectedSub]);

  // Debounced URL sync for search + server fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchInventory();
      const p = new URLSearchParams();
      if (selectedTab) p.set('tab', selectedTab);
      if (selectedSub) p.set('sub', selectedSub);
      if (invSearch) p.set('q', invSearch);
      setSearchParams(p, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [invSearch]);

  const handleRestock = async (bookId) => {
    const qty = parseInt(restockQty);
    if (!qty || qty <= 0) {
      toast.error(t('inventory.enterValidQty'));
      return;
    }
    setRestocking(true);
    try {
      await api.post(`/admin/inventory/${bookId}/restock`, {
        quantity: qty,
      });
      toast.success(t('inventory.restocked'));
      setRestockId(null);
      setRestockQty('');
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.message || t('inventory.failedRestock'));
    } finally {
      setRestocking(false);
    }
  };

  const handleTabChange = (tabId) => {
    setSelectedTab(tabId);
    setSelectedSub('');
    setPage(1);
    const params = new URLSearchParams();
    if (tabId) params.set('tab', tabId);
    if (invSearch) params.set('q', invSearch);
    setSearchParams(params, { replace: true });
  };

  const handleSubChange = (subId) => {
    setSelectedSub(subId);
    setPage(1);
    const params = new URLSearchParams();
    if (selectedTab) params.set('tab', selectedTab);
    if (subId) params.set('sub', subId);
    if (invSearch) params.set('q', invSearch);
    setSearchParams(params, { replace: true });
  };

  const toggleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleSelectAll = async (items) => {
    const allIds = items.map((i) => i.id || i.bookId);
    const allSelected = allIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
    } else if (pagination && pagination.total > items.length) {
      try {
        const params = new URLSearchParams({ page: 1, limit: 1000 });
        if (invSearch) params.set('search', invSearch);
        if (selectedSub) params.set('category', selectedSub);
        else if (selectedTab) params.set('category', selectedTab);
        const res = await api.get(`/admin/inventory?${params}`);
        const data = res.data.data || res.data;
        setSelectedIds(data.map((b) => b.id || b.bookId));
      } catch {
        setSelectedIds((prev) => [...new Set([...prev, ...allIds])]);
      }
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...allIds])]);
    }
  };
  const isAllSelected = (items) => items.length > 0 && items.every((i) => selectedIds.includes(i.id || i.bookId));

  const handleBulkAction = async (action, extra = {}) => {
    try {
      await api.post('/admin/books/bulk-action', { ids: selectedIds, action, ...extra });
      toast.success(t('common.bulkSuccess'));
      setSelectedIds([]);
      fetchInventory();
    } catch (err) {
      toast.error(t('common.saveFailed'));
    }
  };

  const handleToggleOutOfStock = async (bookId, currentValue) => {
    try {
      await api.put(`/admin/books/${bookId}`, { isOutOfStock: !currentValue });
      toast.success(currentValue ? t('inventory.markedInStock') : t('inventory.markedOutOfStock'));
      fetchInventory();
    } catch (err) {
      toast.error(t('inventory.failedUpdate'));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 3xl:gap-6 mb-6 3xl:mb-8">
          {[
            { icon: FiBook, label: t('inventory.totalBooks'), value: summary.totalStock !== undefined ? (pagination?.total || inventory.length || '-') : '-', bg: 'bg-blue-600' },
            { icon: FiLayers, label: t('inventory.totalStock'), value: summary.totalStock ?? 0, bg: 'bg-emerald-600' },
            { icon: FiAlertTriangle, label: t('inventory.lowStock'), value: summary.lowStockCount ?? 0, bg: 'bg-amber-500' },
            { icon: FiDollarSign, label: t('inventory.totalValue'), value: `QAR ${parseFloat(summary.totalValue ?? 0).toFixed(0)}`, bg: 'bg-violet-600' },
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
      )}

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 3xl:p-6 mb-6 3xl:mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiAlertTriangle className="text-red-500" size={18} />
              <h3 className="text-sm font-semibold text-red-700">
                {t('inventory.lowStock')} ({lowStock.length})
              </h3>
            </div>
            <button
              onClick={() => setAlertMinimized(!alertMinimized)}
              className="p-1.5 3xl:p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            >
              <FiChevronUp size={16} className={`transition-transform ${alertMinimized ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {!alertMinimized && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
              {lowStock.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-admin-text truncate">{language === 'ar' && item.titleAr ? item.titleAr : (item.title || item.book?.title)}</p>
                    <p className="text-xs text-admin-muted">{item.author || item.book?.author}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600 ml-3">{item.stock ?? item.currentStock} {t('common.left')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Sub-category Filters */}
      {subCategories.length > 0 && (
        <div className="mb-4 bg-admin-card border border-admin-border rounded-xl px-4 py-3 3xl:px-5 3xl:py-4">
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
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 mb-4 bg-admin-card border border-admin-border rounded-lg px-3 py-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input type="text" value={invSearch} onChange={(e) => setInvSearch(e.target.value)} placeholder={t('common.searchInventory')} className="w-full ps-10 pe-4 py-2 3xl:py-2.5 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" />
        </div>
        <div className="flex-1" />
        <button onClick={fetchInventory} className="flex items-center gap-1.5 px-3 py-2 3xl:px-4 3xl:py-2.5 text-admin-muted hover:text-admin-accent hover:bg-gray-100 rounded-lg transition-colors text-sm 3xl:text-base font-medium">
          <FiRefreshCw size={14} /> {t('common.refresh')}
        </button>
      </div>


      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 mb-3 bg-admin-accent/5 border border-admin-accent/20 rounded-lg px-4 py-2.5 3xl:px-6 3xl:py-3">
          <span className="text-sm 3xl:text-lg font-medium text-admin-accent">{selectedIds.length} {t('common.selected')}</span>
          <div className="flex-1" />
          <button onClick={() => handleBulkAction('markInStock')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">{t('common.bulkMarkInStock')}</button>
          <button onClick={() => handleBulkAction('markOutOfStock')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">{t('common.bulkMarkOutOfStock')}</button>
          <button onClick={() => setSelectedIds([])} className="text-sm 3xl:text-base text-admin-muted hover:text-admin-text">&#10005;</button>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm 3xl:text-base">
            <thead className="bg-gray-50 border-b border-admin-border">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={isAllSelected(inventory)} onChange={() => toggleSelectAll(inventory)} className="w-4 h-4 3xl:w-5 3xl:h-5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent" />
                </th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('books.bookTitle')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">
                  {t('inventory.currentStock')}
                </th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.value')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.sales')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.availability')}</th>
                <th className="text-end px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-admin-muted">
                    {t('common.noResults')}
                  </td>
                </tr>
              ) : (
                inventory.map((item) => {
                  const bookId = item.id || item.bookId;
                  const stock = item.stock ?? item.currentStock ?? 0;
                  const isLow = stock <= 5;

                  return (
                    <tr
                      key={bookId}
                      className={`border-b border-admin-border hover:bg-gray-50 transition-colors ${selectedIds.includes(bookId) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.includes(bookId)} onChange={() => toggleSelect(bookId)} className="w-4 h-4 3xl:w-5 3xl:h-5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent" />
                      </td>
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                        <p className="font-medium text-admin-text">
                          {language === 'ar' && item.titleAr ? item.titleAr : (item.title || item.book?.title)}
                        </p>
                        <p className="text-xs text-admin-muted">
                          {item.author || item.book?.author}
                        </p>
                      </td>
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                        <span
                          className={`font-semibold ${
                            isLow ? 'text-red-500' : 'text-admin-text'
                          }`}
                        >
                          {stock}
                        </span>
                        {isLow && (
                          <span className="ml-2 text-xs text-red-400">{t('common.low')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-text">
                        QAR {(stock * parseFloat(item.price || 0)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted">
                        {item.salesCount ?? item.totalSold ?? '-'}
                      </td>
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                        <button
                          onClick={() => handleToggleOutOfStock(bookId, item.isOutOfStock)}
                          className={`px-2 py-0.5 3xl:px-3 3xl:py-1 text-[10px] 3xl:text-sm font-semibold rounded-full cursor-pointer transition-colors ${
                            item.isOutOfStock ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {item.isOutOfStock ? t('books.outOfStock') : t('common.inStock')}
                        </button>
                      </td>
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-end">
                        {restockId === bookId ? (
                          <div className="flex items-center gap-3 justify-end">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-admin-muted">{t('common.qty')}:</span>
                              <input
                                type="number"
                                min="1"
                                value={restockQty}
                                onChange={(e) => setRestockQty(e.target.value)}
                                placeholder="0"
                                className="w-20 px-3 py-2 bg-white border border-admin-input-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent text-center"
                                autoFocus
                              />
                            </div>
                            <button
                              onClick={() => handleRestock(bookId)}
                              disabled={restocking || !restockQty}
                              className="px-4 py-2 bg-admin-success text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition-colors disabled:opacity-40"
                            >
                              {restocking ? '...' : t('inventory.restock')}
                            </button>
                            <button
                              onClick={() => { setRestockId(null); setRestockQty(''); }}
                              className="p-1.5 3xl:p-2 text-admin-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <FiX size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRestockId(bookId)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors"
                          >
                            <FiPackage size={13} />
                            {t('inventory.restock')}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between px-4 py-3 3xl:px-6 3xl:py-4 border-t border-admin-border">
            <div className="flex items-center gap-3">
              <span className="text-xs 3xl:text-sm text-admin-muted">
                {t('common.showing')} {inventory.length} {t('common.of')} {pagination.total}
              </span>
              <select
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setLimit(newLimit);
                  setPage(1);
                  const params = new URLSearchParams();
                  if (selectedTab) params.set('tab', selectedTab);
                  if (selectedSub) params.set('sub', selectedSub);
                  if (invSearch) params.set('q', invSearch);
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
            {pagination.totalPages > 1 && (
            <div className="flex gap-1">
              <button
                disabled={!pagination.hasPrev}
                onClick={() => {
                  const newPage = page - 1;
                  setPage(newPage);
                  const params = new URLSearchParams();
                  if (selectedTab) params.set('tab', selectedTab);
                  if (selectedSub) params.set('sub', selectedSub);
                  if (invSearch) params.set('q', invSearch);
                  if (newPage > 1) params.set('page', String(newPage));
                  if (limit !== 10) params.set('limit', String(limit));
                  setSearchParams(params, { replace: true });
                }}
                className="p-1.5 rounded border border-admin-border text-admin-muted disabled:opacity-30 hover:bg-gray-50"
              >
                <FiChevronLeft size={16} />
              </button>
              <button
                disabled={!pagination.hasNext}
                onClick={() => {
                  const newPage = page + 1;
                  setPage(newPage);
                  const params = new URLSearchParams();
                  if (selectedTab) params.set('tab', selectedTab);
                  if (selectedSub) params.set('sub', selectedSub);
                  if (invSearch) params.set('q', invSearch);
                  params.set('page', String(newPage));
                  if (limit !== 10) params.set('limit', String(limit));
                  setSearchParams(params, { replace: true });
                }}
                className="p-1.5 rounded border border-admin-border text-admin-muted disabled:opacity-30 hover:bg-gray-50"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
