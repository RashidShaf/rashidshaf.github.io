import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  const t = useLanguageStore((s) => s.t);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, pending: 0, delivered: 0 });

  useEffect(() => {
    api.get('/admin/dashboard/stats').then((res) => {
      setStats((s) => ({ ...s, totalOrders: res.data.totalOrders || 0, totalRevenue: res.data.totalRevenue || 0 }));
    }).catch(() => {});
    // Get pending & delivered counts
    Promise.all([
      api.get('/admin/orders?status=PROCESSING&limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
      api.get('/admin/orders?status=DELIVERED&limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
    ]).then(([pendingRes, deliveredRes]) => {
      setStats((s) => ({
        ...s,
        pending: pendingRes.data.pagination?.total || 0,
        delivered: deliveredRes.data.pagination?.total || 0,
      }));
    });
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await api.get(`/admin/orders?${params}`);
      setOrders(res.data.data || res.data);
      setPagination(res.data.pagination || null);
    } catch (err) {
      toast.error('Failed to fetch orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [page, statusFilter]);

  // Live search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
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
          { icon: FiShoppingBag, label: 'Total Orders', value: stats.totalOrders, bg: 'bg-blue-600', color: 'text-white' },
          { icon: FiDollarSign, label: 'Revenue', value: `QAR ${parseFloat(stats.totalRevenue || 0).toFixed(0)}`, bg: 'bg-emerald-600', color: 'text-white' },
          { icon: FiClock, label: 'Processing', value: stats.pending, bg: 'bg-amber-500', color: 'text-white' },
          { icon: FiCheckCircle, label: 'Delivered', value: stats.delivered, bg: 'bg-teal-600', color: 'text-white' },
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
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..." className="w-full pl-10 pr-4 py-2 3xl:py-2.5 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" />
        </div>
        <div className="flex-1" />
        <button onClick={fetchOrders} className="flex items-center gap-1.5 px-3 py-2 3xl:px-4 3xl:py-2.5 text-admin-muted hover:text-admin-accent hover:bg-gray-100 rounded-lg transition-colors text-sm 3xl:text-base font-medium">
          <FiRefreshCw size={14} /> Refresh
        </button>
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

      {/* Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm 3xl:text-base">
            <thead className="bg-gray-50 border-b border-admin-border">
              <tr>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('orders.orderNumber')}</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('orders.customer')}</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('nav.products')}</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">Items</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.total')} (QAR)</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.date')}</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.status')}</th>
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
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-admin-muted">
                    {t('common.noResults')}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="border-b border-admin-border hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-text">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted">
                      {order.user
                        ? `${order.user.firstName} ${order.user.lastName}`
                        : <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">Guest</span>
                      }
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs">
                      {order.items?.slice(0, 2).map((item) => item.book?.title || item.title).join(', ')}
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
                        className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
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
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-admin-border">
            <span className="text-xs text-admin-muted">
              {t('common.showing')} {orders.length} {t('common.of')} {pagination.total}
            </span>
            <div className="flex gap-1">
              <button
                disabled={!pagination.hasPrev}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded border border-admin-border text-admin-muted disabled:opacity-30 hover:bg-gray-50"
              >
                <FiChevronLeft size={16} />
              </button>
              <button
                disabled={!pagination.hasNext}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded border border-admin-border text-admin-muted disabled:opacity-30 hover:bg-gray-50"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
