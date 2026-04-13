import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2, FiDollarSign, FiShoppingBag, FiPackage, FiDownload } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

export default function Reports() {
  const { t, language } = useLanguageStore();

  const [salesFrom, setSalesFrom] = useState('');
  const [salesTo, setSalesTo] = useState('');
  const [salesReport, setSalesReport] = useState(null);
  const [salesLoading, setSalesLoading] = useState(false);

  const generateSalesReport = async () => {
    setSalesLoading(true);
    try {
      const params = [];
      if (salesFrom) params.push(`from=${salesFrom}`);
      if (salesTo) params.push(`to=${salesTo}`);
      const res = await api.get(`/admin/reports/sales${params.length ? '?' + params.join('&') : ''}`);
      setSalesReport(res.data);
    } catch (err) {
      toast.error(t('reports.loadFailed'));
    } finally {
      setSalesLoading(false);
    }
  };

  useEffect(() => { generateSalesReport(); }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
        {/* Stat Cards */}
        {salesLoading && !salesReport ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 3xl:gap-6 mb-6 3xl:mb-8">
            {[...Array(4)].map((_, i) => <div key={i} className="h-[140px] 3xl:h-[170px] bg-gray-50 rounded-xl animate-pulse" />)}
          </div>
        ) : salesReport && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 3xl:gap-6 mb-6 3xl:mb-8">
            {[
              { icon: FiShoppingBag, label: t('reports.totalOrders'), value: salesReport.summary?.totalOrders ?? 0, bg: 'bg-blue-600' },
              { icon: FiDollarSign, label: t('reports.revenue'), value: `QAR ${parseFloat(salesReport.summary?.totalRevenue ?? 0).toFixed(0)}`, bg: 'bg-emerald-600' },
              { icon: FiBarChart2, label: t('reports.avgOrder'), value: `QAR ${parseFloat(salesReport.summary?.averageOrder ?? 0).toFixed(0)}`, bg: 'bg-violet-600' },
              { icon: FiPackage, label: t('reports.totalItems'), value: salesReport.summary?.totalItems ?? 0, bg: 'bg-amber-500' },
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

        {/* Date Filter */}
        <div className="flex flex-wrap items-end gap-3 mb-6 3xl:mb-8 p-4 3xl:p-6 bg-gray-50 rounded-xl">
          <div>
            <label className="block text-xs 3xl:text-sm font-medium text-admin-muted mb-1.5">{t('reports.from')}</label>
            <input type="date" value={salesFrom} onChange={(e) => setSalesFrom(e.target.value)} className="px-3 py-2.5 3xl:px-4 3xl:py-3 bg-white border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" />
          </div>
          <div>
            <label className="block text-xs 3xl:text-sm font-medium text-admin-muted mb-1.5">{t('reports.to')}</label>
            <input type="date" value={salesTo} onChange={(e) => setSalesTo(e.target.value)} className="px-3 py-2.5 3xl:px-4 3xl:py-3 bg-white border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" />
          </div>
          <button onClick={generateSalesReport} disabled={salesLoading} className="px-5 py-2.5 3xl:px-6 3xl:py-3 bg-admin-accent text-white rounded-lg text-sm 3xl:text-base font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
            {salesLoading ? t('common.loading') : t('reports.generate')}
          </button>
          {salesReport && (salesReport.orders || []).length > 0 && (
            <button
              onClick={() => {
                const params = [];
                if (salesFrom) params.push(`from=${salesFrom}`);
                if (salesTo) params.push(`to=${salesTo}`);
                const url = `${import.meta.env.VITE_API_URL}/admin/reports/sales/export${params.length ? '?' + params.join('&') : ''}`;
                const token = JSON.parse(localStorage.getItem('admin-auth-storage') || '{}')?.state?.accessToken;
                fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                  .then((res) => res.blob())
                  .then((blob) => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  })
                  .catch(() => toast.error(t('common.exportFailed')));
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 3xl:px-5 3xl:py-3 border border-admin-border text-admin-muted rounded-lg text-sm 3xl:text-base font-medium hover:bg-gray-100 transition-colors"
            >
              <FiDownload size={14} /> {t('common.export')}
            </button>
          )}
        </div>

        {/* Orders Table */}
        {salesReport && (
          <div className="overflow-x-auto border border-admin-border rounded-lg">
            <table className="w-full text-sm 3xl:text-base">
              <thead className="bg-gray-50 border-b border-admin-border">
                <tr>
                  <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('reports.orderNumber')}</th>
                  <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('orders.customer')}</th>
                  <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('nav.products')}</th>
                  <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.total')} (QAR)</th>
                  <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.status')}</th>
                  <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.date')}</th>
                </tr>
              </thead>
              <tbody>
                {(salesReport.orders || []).length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-admin-muted">{t('common.noResults')}</td></tr>
                ) : (salesReport.orders || []).map((order) => (
                  <tr key={order.id || order.orderNumber} className="border-b border-admin-border last:border-0">
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-text">{order.orderNumber}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted">{order.user?.firstName} {order.user?.lastName}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs">
                      {order.items?.slice(0, 2).map((item) => language === 'ar' && item.book?.titleAr ? item.book.titleAr : (item.book?.title || item.title)).join(', ')}
                      {order.items?.length > 2 && ` +${order.items.length - 2}`}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-text">QAR {parseFloat(order.total || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4"><span className="text-xs font-medium">{t(`orders.statuses.${order.status}`) || order.status}</span></td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
