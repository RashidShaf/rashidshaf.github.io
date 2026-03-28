import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2, FiDollarSign, FiShoppingBag, FiPackage } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const getDefaultDates = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
};

export default function Reports() {
  const t = useLanguageStore((s) => s.t);
  const defaults = getDefaultDates();

  const [salesFrom, setSalesFrom] = useState(defaults.from);
  const [salesTo, setSalesTo] = useState(defaults.to);
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
      toast.error('Failed to load sales report');
    } finally {
      setSalesLoading(false);
    }
  };

  // Auto-load sales report on mount
  useEffect(() => {
    generateSalesReport();
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <h2 className="text-2xl font-bold text-admin-text mb-6">{t('reports.title')}</h2>

      <div className="space-y-8">
        {/* ==================== SALES REPORT ==================== */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <FiBarChart2 className="text-admin-accent" size={20} />
            <h3 className="text-base font-semibold text-admin-text">{t('reports.salesReport')}</h3>
          </div>

          {/* Date Range Picker */}
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <div>
              <label className="block text-xs font-medium text-admin-muted mb-1.5">{t('reports.from')}</label>
              <input type="date" value={salesFrom} onChange={(e) => setSalesFrom(e.target.value)} className="px-3 py-2.5 bg-admin-card border border-admin-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-admin-muted mb-1.5">{t('reports.to')}</label>
              <input type="date" value={salesTo} onChange={(e) => setSalesTo(e.target.value)} className="px-3 py-2.5 bg-admin-card border border-admin-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent" />
            </div>
            <button onClick={generateSalesReport} disabled={salesLoading} className="px-5 py-2.5 bg-admin-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
              {salesLoading ? t('common.loading') : t('reports.generate')}
            </button>
          </div>

          {/* Sales Summary Cards */}
          {salesLoading && !salesReport ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-50 rounded-lg animate-pulse" />)}
            </div>
          ) : salesReport && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FiShoppingBag size={14} className="text-blue-600" />
                    <span className="text-xs font-medium text-blue-600">Total Orders</span>
                  </div>
                  <p className="text-xl font-bold text-admin-text">{salesReport.summary?.totalOrders ?? 0}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FiDollarSign size={14} className="text-green-600" />
                    <span className="text-xs font-medium text-green-600">Total Revenue</span>
                  </div>
                  <p className="text-xl font-bold text-admin-text">QAR {parseFloat(salesReport.summary?.totalRevenue ?? 0).toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FiBarChart2 size={14} className="text-purple-600" />
                    <span className="text-xs font-medium text-purple-600">Avg Order</span>
                  </div>
                  <p className="text-xl font-bold text-admin-text">QAR {parseFloat(salesReport.summary?.averageOrder ?? 0).toFixed(2)}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FiPackage size={14} className="text-amber-600" />
                    <span className="text-xs font-medium text-amber-600">Total Items</span>
                  </div>
                  <p className="text-xl font-bold text-admin-text">{salesReport.summary?.totalItems ?? 0}</p>
                </div>
              </div>

              {/* Sales Orders Table */}
              <div className="overflow-x-auto border border-admin-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-admin-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-admin-muted">Order #</th>
                      <th className="text-left px-4 py-3 font-medium text-admin-muted">Total</th>
                      <th className="text-left px-4 py-3 font-medium text-admin-muted">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-admin-muted">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(salesReport.orders || []).length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-admin-muted">{t('common.noResults')}</td></tr>
                    ) : (salesReport.orders || []).map((order) => (
                      <tr key={order.id || order.orderNumber} className="border-b border-admin-border last:border-0">
                        <td className="px-4 py-3 font-medium text-admin-text">{order.orderNumber}</td>
                        <td className="px-4 py-3 font-medium text-admin-text">QAR {parseFloat(order.total || 0).toFixed(2)}</td>
                        <td className="px-4 py-3"><span className="text-xs font-medium">{order.status}</span></td>
                        <td className="px-4 py-3 text-admin-muted text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
