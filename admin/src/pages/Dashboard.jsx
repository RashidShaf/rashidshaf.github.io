import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiShoppingBag, FiUsers, FiBook, FiDollarSign, FiAlertTriangle } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

export default function Dashboard() {
  const t = useLanguageStore((s) => s.t);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [topBooks, setTopBooks] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, chartRes, booksRes, ordersRes] = await Promise.all([
          api.get('/admin/dashboard/stats'),
          api.get('/admin/dashboard/sales-chart?days=30'),
          api.get('/admin/dashboard/top-books'),
          api.get('/admin/dashboard/recent-orders'),
        ]);
        setStats(statsRes.data);
        setChartData(chartRes.data);
        setTopBooks(booksRes.data);
        setRecentOrders(ordersRes.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const statCards = [
    { key: 'totalRevenue', icon: FiDollarSign, value: stats ? `QAR ${parseFloat(stats.totalRevenue).toFixed(0)}` : '...', bg: 'bg-blue-600', color: 'text-white' },
    { key: 'totalOrders', icon: FiShoppingBag, value: stats?.totalOrders ?? '...', bg: 'bg-emerald-600', color: 'text-white' },
    { key: 'totalUsers', icon: FiUsers, value: stats?.totalUsers ?? '...', bg: 'bg-violet-600', color: 'text-white' },
    { key: 'totalBooks', icon: FiBook, value: stats?.totalBooks ?? '...', bg: 'bg-amber-500', color: 'text-white' },
  ];

  const statusColor = { PENDING: 'text-yellow-600', CONFIRMED: 'text-blue-600', PROCESSING: 'text-purple-600', SHIPPED: 'text-indigo-600', DELIVERED: 'text-green-600', CANCELLED: 'text-red-600' };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {statCards.map((card, i) => (
          <motion.div key={card.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.1 }} className="bg-admin-card rounded-xl border border-admin-border p-5 h-[140px] flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
            <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon size={20} className={card.color} />
            </div>
            <p className="text-2xl font-extrabold text-admin-text tracking-tight leading-none">{card.value}</p>
            <p className="text-xs font-medium text-admin-muted mt-1.5">{t(`dashboard.${card.key}`)}</p>
          </motion.div>
        ))}
      </div>

      {/* Sales Chart */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm mb-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">{t('dashboard.salesOverview')}</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-admin-muted text-sm py-16 text-center">{loading ? t('common.loading') : t('common.noResults')}</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-admin-text mb-4">{t('dashboard.recentOrders')}</h3>
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-admin-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-admin-text">{order.orderNumber}</p>
                    <p className="text-xs text-admin-muted">{order.user?.firstName} {order.user?.lastName}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-semibold text-admin-text">QAR {parseFloat(order.total).toFixed(2)}</p>
                    <p className={`text-xs font-medium ${statusColor[order.status] || 'text-admin-muted'}`}>{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-admin-muted text-sm py-8 text-center">{t('common.noResults')}</div>
          )}
        </div>

        {/* Top Books */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-admin-text mb-4">{t('dashboard.topBooks')}</h3>
          {topBooks.length > 0 ? (
            <div className="space-y-3">
              {topBooks.slice(0, 5).map((book, i) => (
                <div key={book.id} className="flex items-center gap-3 py-2 border-b border-admin-border last:border-0">
                  <span className="text-xs font-bold text-admin-muted w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-admin-text truncate">{book.title}</p>
                    <p className="text-xs text-admin-muted">{book.author}</p>
                  </div>
                  <span className="text-sm font-semibold text-admin-text">{book.salesCount} sold</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-admin-muted text-sm py-8 text-center">{t('common.noResults')}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
