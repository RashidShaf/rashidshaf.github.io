import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2, FiPackage, FiDollarSign, FiShoppingBag, FiAlertTriangle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

export default function Reports() {
  const t = useLanguageStore((s) => s.t);

  // Sales report state
  const [salesFrom, setSalesFrom] = useState('');
  const [salesTo, setSalesTo] = useState('');
  const [salesReport, setSalesReport] = useState(null);
  const [salesLoading, setSalesLoading] = useState(false);

  // Inventory report state
  const [inventoryReport, setInventoryReport] = useState(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const generateSalesReport = async () => {
    if (!salesFrom || !salesTo) {
      toast.error('Please select both from and to dates');
      return;
    }
    setSalesLoading(true);
    try {
      const res = await api.get(`/admin/reports/sales?from=${salesFrom}&to=${salesTo}`);
      setSalesReport(res.data);
    } catch (err) {
      toast.error('Failed to generate sales report');
      console.error(err);
    } finally {
      setSalesLoading(false);
    }
  };

  const generateInventoryReport = async () => {
    setInventoryLoading(true);
    try {
      const res = await api.get('/admin/reports/inventory');
      setInventoryReport(res.data);
    } catch (err) {
      toast.error('Failed to generate inventory report');
      console.error(err);
    } finally {
      setInventoryLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-admin-text">{t('reports.title')}</h2>
      </div>

      <div className="space-y-8">
        {/* ==================== SALES REPORT ==================== */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <FiBarChart2 className="text-admin-accent" size={20} />
            <h3 className="text-base font-semibold text-admin-text">
              {t('reports.salesReport')}
            </h3>
          </div>

          {/* Date Range Picker */}
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <div>
              <label className="block text-xs font-medium text-admin-muted mb-1.5">
                {t('reports.from')}
              </label>
              <input
                type="date"
                value={salesFrom}
                onChange={(e) => setSalesFrom(e.target.value)}
                className="px-3 py-2.5 bg-admin-card border border-admin-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-admin-muted mb-1.5">
                {t('reports.to')}
              </label>
              <input
                type="date"
                value={salesTo}
                onChange={(e) => setSalesTo(e.target.value)}
                className="px-3 py-2.5 bg-admin-card border border-admin-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent"
              />
            </div>
            <button
              onClick={generateSalesReport}
              disabled={salesLoading}
              className="px-5 py-2.5 bg-admin-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {salesLoading ? t('common.loading') : t('reports.generate')}
            </button>
          </div>

          {/* Sales Summary Cards */}
          {salesReport && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FiShoppingBag size={14} className="text-blue-600" />
                    <span className="text-xs font-medium text-blue-600">Total Orders</span>
                  </div>
                  <p className="text-xl font-bold text-admin-text">
                    {salesReport.summary?.totalOrders ?? salesReport.totalOrders ?? 0}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FiDollarSign size={14} className="text-green-600" />
                    <span className="text-xs font-medium text-green-600">Total Revenue</span>
                  </div>
                  <p className="text-xl font-bold text-admin-text">
                    QAR{' '}
                    {parseFloat(
                      salesReport.summary?.totalRevenue ?? salesReport.totalRevenue ?? 0
                    ).toFixed(2)}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FiBarChart2 size={14} className="text-purple-600" />
                    <span className="text-xs font-medium text-purple-600">Avg Order</span>
                  </div>
                  <p className="text-xl font-bold text-admin-text">
                    QAR{' '}
                    {parseFloat(
                      salesReport.summary?.averageOrder ?? salesReport.averageOrder ?? 0
                    ).toFixed(2)}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FiPackage size={14} className="text-amber-600" />
                    <span className="text-xs font-medium text-amber-600">Total Items</span>
                  </div>
                  <p className="text-xl font-bold text-admin-text">
                    {salesReport.summary?.totalItems ?? salesReport.totalItems ?? 0}
                  </p>
                </div>
              </div>

              {/* Sales Orders Table */}
              {(salesReport.orders || salesReport.data) && (
                <div className="overflow-x-auto border border-admin-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-admin-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-admin-muted">
                          Order #
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-admin-muted">
                          Customer
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-admin-muted">
                          Total
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-admin-muted">
                          Status
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-admin-muted">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(salesReport.orders || salesReport.data || []).map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-admin-border last:border-0"
                        >
                          <td className="px-4 py-3 font-medium text-admin-text">
                            {order.orderNumber}
                          </td>
                          <td className="px-4 py-3 text-admin-muted">
                            {order.user?.firstName} {order.user?.lastName}
                          </td>
                          <td className="px-4 py-3 font-medium text-admin-text">
                            QAR {parseFloat(order.total || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium">
                              {t(`orders.statuses.${order.status}`) || order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-admin-muted text-xs">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {(salesReport.orders || salesReport.data || []).length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-admin-muted"
                          >
                            {t('common.noResults')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {!salesReport && !salesLoading && (
            <div className="text-admin-muted text-sm py-8 text-center">
              Select a date range and click Generate to view the sales report
            </div>
          )}
        </div>

        {/* ==================== INVENTORY REPORT ==================== */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FiPackage className="text-admin-accent" size={20} />
              <h3 className="text-base font-semibold text-admin-text">
                {t('reports.inventoryReport')}
              </h3>
            </div>
            <button
              onClick={generateInventoryReport}
              disabled={inventoryLoading}
              className="px-5 py-2.5 bg-admin-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {inventoryLoading ? t('common.loading') : t('reports.generate')}
            </button>
          </div>

          {/* Inventory Summary Cards */}
          {inventoryReport && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <span className="text-xs font-medium text-blue-600">Total Stock</span>
                  <p className="text-xl font-bold text-admin-text mt-1">
                    {inventoryReport.summary?.totalStock ?? inventoryReport.totalStock ?? 0}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center gap-1">
                    <FiAlertTriangle size={12} className="text-yellow-600" />
                    <span className="text-xs font-medium text-yellow-600">Low Stock</span>
                  </div>
                  <p className="text-xl font-bold text-admin-text mt-1">
                    {inventoryReport.summary?.lowStockCount ?? inventoryReport.lowStockCount ?? 0}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <span className="text-xs font-medium text-red-600">Out of Stock</span>
                  <p className="text-xl font-bold text-admin-text mt-1">
                    {inventoryReport.summary?.outOfStockCount ??
                      inventoryReport.outOfStockCount ??
                      0}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <span className="text-xs font-medium text-green-600">Total Value</span>
                  <p className="text-xl font-bold text-admin-text mt-1">
                    QAR{' '}
                    {parseFloat(
                      inventoryReport.summary?.totalValue ?? inventoryReport.totalValue ?? 0
                    ).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Inventory Books Table */}
              {(inventoryReport.books || inventoryReport.data) && (
                <div className="overflow-x-auto border border-admin-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-admin-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-admin-muted">
                          Book
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-admin-muted">
                          Stock
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-admin-muted">
                          Price
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-admin-muted">
                          Value
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-admin-muted">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(inventoryReport.books || inventoryReport.data || []).map((book) => {
                        const stock = book.stock ?? book.currentStock ?? 0;
                        const price = parseFloat(book.price || 0);
                        const value = stock * price;
                        const isLow = stock > 0 && stock <= 5;
                        const isOut = stock === 0;

                        return (
                          <tr
                            key={book.id}
                            className="border-b border-admin-border last:border-0"
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium text-admin-text">{book.title}</p>
                              <p className="text-xs text-admin-muted">{book.author}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`font-semibold ${
                                  isOut
                                    ? 'text-red-500'
                                    : isLow
                                    ? 'text-yellow-600'
                                    : 'text-admin-text'
                                }`}
                              >
                                {stock}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-admin-muted">
                              QAR {price.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 font-medium text-admin-text">
                              QAR {value.toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
                                  isOut
                                    ? 'bg-red-100 text-red-700'
                                    : isLow
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {(inventoryReport.books || inventoryReport.data || []).length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-admin-muted"
                          >
                            {t('common.noResults')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {!inventoryReport && !inventoryLoading && (
            <div className="text-admin-muted text-sm py-8 text-center">
              Click Generate to view the inventory report
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
