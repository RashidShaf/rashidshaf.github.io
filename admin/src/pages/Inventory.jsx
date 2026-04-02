import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiPackage, FiChevronLeft, FiChevronRight, FiChevronUp, FiPlus, FiX, FiBook, FiDollarSign, FiLayers, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

export default function Inventory() {
  const t = useLanguageStore((s) => s.t);
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restocking, setRestocking] = useState(false);
  const [summary, setSummary] = useState(null);
  const [invSearch, setInvSearch] = useState('');
  const [alertMinimized, setAlertMinimized] = useState(false);

  useEffect(() => {
    api.get('/admin/reports/inventory').then((res) => setSummary(res.data.summary)).catch(() => {});
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      const [invRes, lowRes] = await Promise.all([
        api.get(`/admin/inventory?${params}`),
        api.get('/admin/inventory/low-stock'),
      ]);
      setInventory(invRes.data.data || invRes.data);
      setPagination(invRes.data.pagination || null);
      setLowStock(lowRes.data.data || lowRes.data);
    } catch (err) {
      toast.error('Failed to fetch inventory');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [page]);

  const handleRestock = async (bookId) => {
    const qty = parseInt(restockQty);
    if (!qty || qty <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    setRestocking(true);
    try {
      await api.post(`/admin/inventory/${bookId}/restock`, {
        quantity: qty,
      });
      toast.success('Restocked successfully');
      setRestockId(null);
      setRestockQty('');
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restock');
    } finally {
      setRestocking(false);
    }
  };

  const handleToggleOutOfStock = async (bookId, currentValue) => {
    try {
      await api.put(`/admin/books/${bookId}`, { isOutOfStock: !currentValue });
      toast.success(currentValue ? 'Marked as In Stock' : 'Marked as Out of Stock');
      fetchInventory();
    } catch (err) {
      toast.error('Failed to update');
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: FiBook, label: 'Total Books', value: summary.totalStock !== undefined ? (inventory.length || '-') : '-', bg: 'bg-blue-600' },
            { icon: FiLayers, label: 'Total Stock', value: summary.totalStock ?? 0, bg: 'bg-emerald-600' },
            { icon: FiAlertTriangle, label: 'Low Stock', value: summary.lowStockCount ?? 0, bg: 'bg-amber-500' },
            { icon: FiDollarSign, label: 'Total Value', value: `QAR ${parseFloat(summary.totalValue ?? 0).toFixed(0)}`, bg: 'bg-violet-600' },
          ].map((card, i) => (
            <div key={i} className="bg-admin-card rounded-xl border border-admin-border p-5 h-[140px] flex flex-col items-center justify-center text-center shadow-sm hover:shadow-lg transition-shadow">
              <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-extrabold text-admin-text tracking-tight leading-none">{card.value}</p>
              <p className="text-xs font-medium text-admin-muted mt-1.5">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Low Stock Alerts */}
      {/* Search */}
      <div className="flex items-center gap-3 mb-4 bg-admin-card border border-admin-border rounded-lg px-3 py-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input type="text" value={invSearch} onChange={(e) => setInvSearch(e.target.value)} placeholder="Search inventory..." className="w-full pl-10 pr-4 py-2 bg-admin-bg border border-admin-input-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent" />
        </div>
        <div className="flex-1" />
        <button onClick={fetchInventory} className="flex items-center gap-1.5 px-3 py-2 text-admin-muted hover:text-admin-accent hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium">
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiAlertTriangle className="text-red-500" size={18} />
              <h3 className="text-sm font-semibold text-red-700">
                {t('inventory.lowStock')} ({lowStock.length})
              </h3>
            </div>
            <button
              onClick={() => setAlertMinimized(!alertMinimized)}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            >
              <FiChevronUp size={16} className={`transition-transform ${alertMinimized ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {!alertMinimized && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
              {lowStock.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-admin-text truncate">
                      {item.title || item.book?.title}
                    </p>
                    <p className="text-xs text-admin-muted">
                      {item.author || item.book?.author}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-600 ml-3">
                    {item.stock ?? item.currentStock} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-admin-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">Book Title</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">
                  {t('inventory.currentStock')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">Value</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">Sales</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">Availability</th>
                <th className="text-right px-4 py-3 font-medium text-admin-muted">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-admin-muted">
                    {t('common.noResults')}
                  </td>
                </tr>
              ) : (
                inventory.filter((item) => !invSearch || (item.title || item.book?.title || '').toLowerCase().includes(invSearch.toLowerCase())).map((item) => {
                  const bookId = item.id || item.bookId;
                  const stock = item.stock ?? item.currentStock ?? 0;
                  const isLow = stock <= 5;

                  return (
                    <tr
                      key={bookId}
                      className="border-b border-admin-border hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-admin-text">
                          {item.title || item.book?.title}
                        </p>
                        <p className="text-xs text-admin-muted">
                          {item.author || item.book?.author}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${
                            isLow ? 'text-red-500' : 'text-admin-text'
                          }`}
                        >
                          {stock}
                        </span>
                        {isLow && (
                          <span className="ml-2 text-xs text-red-400">Low</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-admin-text">
                        QAR {(stock * parseFloat(item.price || 0)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-admin-muted">
                        {item.salesCount ?? item.totalSold ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleOutOfStock(bookId, item.isOutOfStock)}
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-full cursor-pointer transition-colors ${
                            item.isOutOfStock ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {item.isOutOfStock ? 'Out of Stock' : 'In Stock'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {restockId === bookId ? (
                          <div className="flex items-center gap-3 justify-end">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-admin-muted">Qty:</span>
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
                              {restocking ? '...' : 'Restock'}
                            </button>
                            <button
                              onClick={() => { setRestockId(null); setRestockQty(''); }}
                              className="p-1.5 text-admin-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
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
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-admin-border">
            <span className="text-xs text-admin-muted">
              {t('common.showing')} {inventory.length} {t('common.of')} {pagination.total}
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
