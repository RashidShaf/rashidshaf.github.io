import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch, FiChevronLeft, FiChevronRight, FiFilter, FiShoppingBag, FiDollarSign, FiClock, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const STATUSES = ['ALL', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function Orders() {
  const { t, language } = useLanguageStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [limit, setLimit] = useState(parseInt(searchParams.get('limit')) || 10);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [customerFilter, setCustomerFilter] = useState(searchParams.get('customer') || 'ALL');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalOrders: null, totalRevenue: null, pending: null, delivered: null });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatusValue, setBulkStatusValue] = useState('');
  const fetchAbortRef = useRef(null);

  const fetchOrders = async () => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit, withStats: '1' });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (customerFilter !== 'ALL') params.set('customerType', customerFilter);
      if (search) params.set('search', search);
      const res = await api.get(`/admin/orders?${params}`, { signal: controller.signal });
      setOrders(res.data.data || res.data);
      setPagination(res.data.pagination || null);
      setSelectedIds([]);
      if (res.data.stats) {
        setStats(res.data.stats);
      } else {
        setStats({ totalOrders: null, totalRevenue: null, pending: null, delivered: null });
        toast.error(t('orders.failedLoadStats'), { toastId: 'orders-stats-fail' });
      }
    } catch (err) {
      if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') return;
      toast.error(t('orders.failedFetch'), { toastId: 'orders-list-fail' });
    } finally {
      if (fetchAbortRef.current === controller) {
        setLoading(false);
        const savedScroll = sessionStorage.getItem('admin-orders-scroll');
        if (savedScroll) {
          setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 50);
          sessionStorage.removeItem('admin-orders-scroll');
        }
      }
    }
  };

  const saveScroll = () => sessionStorage.setItem('admin-orders-scroll', window.scrollY.toString());

  const toggleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleSelectAll = async (items) => {
    const allIds = items.map((i) => i.id);
    const allSelected = allIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
    } else if (pagination && pagination.total > items.length) {
      try {
        const params = new URLSearchParams({ page: 1, limit: 1000 });
        if (statusFilter !== 'ALL') params.set('status', statusFilter);
        if (customerFilter !== 'ALL') params.set('customerType', customerFilter);
        if (search) params.set('search', search);
        const res = await api.get(`/admin/orders?${params}`);
        const data = res.data.data || res.data;
        setSelectedIds(data.map((o) => o.id));
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
      await api.post('/admin/orders/bulk-action', { ids: selectedIds, action, ...extra });
      toast.success(t('common.bulkSuccess'));
      setSelectedIds([]);
      fetchOrders();
    } catch (err) {
      toast.error(t('common.saveFailed'));
    }
  };

  useEffect(() => { fetchOrders(); }, [page, limit, statusFilter, customerFilter]);

  // Live search with debounce
  const firstSearchRun = useRef(true);
  useEffect(() => {
    if (firstSearchRun.current) { firstSearchRun.current = false; return; }
    const timer = setTimeout(() => {
      setPage(1);
      fetchOrders();
      const p = new URLSearchParams(searchParams);
      if (search) p.set('q', search); else p.delete('q');
      setSearchParams(p, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleStatusChange = (e) => {
    const val = e.target.value;
    setStatusFilter(val);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (val && val !== 'ALL') params.set('status', val); else params.delete('status');
    setSearchParams(params, { replace: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 3xl:gap-6 mb-6 3xl:mb-8">
        {[
          { icon: FiShoppingBag, label: t('orders.totalOrders'), value: stats.totalOrders ?? '—', bg: 'bg-blue-600', color: 'text-white' },
          { icon: FiDollarSign, label: t('orders.revenue'), value: stats.totalRevenue == null ? '—' : `QAR ${parseFloat(stats.totalRevenue).toFixed(0)}`, bg: 'bg-emerald-600', color: 'text-white' },
          { icon: FiClock, label: t('orders.processing'), value: stats.pending ?? '—', bg: 'bg-amber-500', color: 'text-white' },
          { icon: FiCheckCircle, label: t('orders.delivered'), value: stats.delivered ?? '—', bg: 'bg-teal-600', color: 'text-white' },
        ].map((card, i) => (
          <div key={i} className="bg-admin-card rounded-xl border border-admin-border p-5 3xl:p-7 h-[140px] 3xl:h-[170px] flex flex-col items-center justify-center text-center shadow-sm hover:shadow-lg transition-shadow">
            <div className={`w-11 h-11 3xl:w-14 3xl:h-14 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-2xl 3xl:text-3xl font-extrabold text-admin-text tracking-tight leading-none">{card.value}</p>
            <p className="text-xs 3xl:text-sm font-medium text-admin-muted mt-1.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 mb-4 bg-admin-card border border-admin-border rounded-lg px-3 py-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.searchOrders')} className="w-full ps-10 pe-4 py-2 3xl:py-2.5 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" />
        </div>
        <div className="flex-1" />
        <button onClick={fetchOrders} className="flex items-center gap-1.5 px-3 py-2 3xl:px-4 3xl:py-2.5 text-admin-muted hover:text-admin-accent hover:bg-gray-100 rounded-lg transition-colors text-sm 3xl:text-base font-medium">
          <FiRefreshCw size={14} /> {t('common.refresh')}
        </button>
        <select
          value={customerFilter}
          onChange={(e) => { const val = e.target.value; setCustomerFilter(val); setPage(1); const p = new URLSearchParams(searchParams); if (val && val !== 'ALL') p.set('customer', val); else p.delete('customer'); setSearchParams(p, { replace: true }); }}
          className="px-3 py-2 3xl:py-2.5 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent appearance-none cursor-pointer min-w-[130px]"
        >
          <option value="ALL">{t('orders.allCustomers')}</option>
          <option value="customer">{t('orders.registered')}</option>
          <option value="guest">{t('orders.guests')}</option>
        </select>
        <div className="relative">
          <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="pl-10 pr-4 py-2 3xl:py-2.5 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent appearance-none cursor-pointer min-w-[160px]"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? t('common.all') : t(`orders.statuses.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 mb-3 bg-admin-accent/5 border border-admin-accent/20 rounded-lg px-4 py-2.5 3xl:px-6 3xl:py-3">
          <span className="text-sm 3xl:text-lg font-medium text-admin-accent">{selectedIds.length} {t('common.selected')}</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <select value={bulkStatusValue} onChange={(e) => setBulkStatusValue(e.target.value)} className="px-2 py-1.5 3xl:px-4 3xl:py-2.5 text-xs 3xl:text-base border border-admin-input-border rounded-lg bg-admin-bg text-admin-text focus:outline-none focus:border-admin-accent">
              <option value="">{t('common.bulkUpdateStatus')}</option>
              {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>{t(`orders.statuses.${s}`)}</option>
              ))}
            </select>
            {bulkStatusValue && (
              <button onClick={() => { handleBulkAction('updateStatus', { status: bulkStatusValue }); setBulkStatusValue(''); }} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">{t('common.save')}</button>
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
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={isAllSelected(orders)} onChange={() => toggleSelectAll(orders)} className="w-4 h-4 3xl:w-5 3xl:h-5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent" />
                </th>
                <th className="px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted w-10">#</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('orders.orderNumber')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('orders.customer')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('nav.products')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.items')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.total')} (QAR)</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.date')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="px-4 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-admin-muted">
                    {t('common.noResults')}
                  </td>
                </tr>
              ) : (
                orders.map((order, index) => (
                  <tr
                    key={order.id}
                    onClick={() => { saveScroll(); navigate(`/orders/${order.id}`); }}
                    className={`border-b border-admin-border hover:bg-gray-50 transition-colors cursor-pointer ${selectedIds.includes(order.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(order.id)} onChange={() => toggleSelect(order.id)} className="w-4 h-4 3xl:w-5 3xl:h-5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent" />
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-sm 3xl:text-base">{(page - 1) * 10 + index + 1}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-text">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted">
                      {order.user
                        ? `${order.user.firstName} ${order.user.lastName}`
                        : <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">{t('common.guest')}</span>
                      }
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs">
                      {order.items?.slice(0, 2).map((item) => language === 'ar' && item.book?.titleAr ? item.book.titleAr : (item.book?.title || item.title)).join(', ')}
                      {order.items?.length > 2 && ` +${order.items.length - 2}`}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted">
                      {order.items?.reduce((sum, i) => sum + i.quantity, 0) || 0}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-text">
                      QAR {parseFloat(order.total || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 3xl:px-3 3xl:py-1 text-xs 3xl:text-sm font-medium rounded-full ${
                          statusColors[order.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {t(`orders.statuses.${order.status}`) || order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between px-4 py-3 3xl:px-6 3xl:py-4 border-t border-admin-border">
            <div className="flex items-center gap-3">
              <span className="text-xs 3xl:text-sm text-admin-muted">
                {t('common.showing')} {orders.length} {t('common.of')} {pagination.total}
              </span>
              <select
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setLimit(newLimit);
                  setPage(1);
                  const params = new URLSearchParams();
                  if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
                  if (customerFilter && customerFilter !== 'ALL') params.set('customer', customerFilter);
                  if (search) params.set('q', search);
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
                  if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
                  if (customerFilter && customerFilter !== 'ALL') params.set('customer', customerFilter);
                  if (search) params.set('q', search);
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
                  if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
                  if (customerFilter && customerFilter !== 'ALL') params.set('customer', customerFilter);
                  if (search) params.set('q', search);
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
