import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiPackage, FiChevronLeft, FiChevronRight, FiPlus, FiX } from 'react-icons/fi';
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
  const [restockNote, setRestockNote] = useState('');
  const [restocking, setRestocking] = useState(false);

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
        note: restockNote,
      });
      toast.success('Restocked successfully');
      setRestockId(null);
      setRestockQty('');
      setRestockNote('');
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restock');
    } finally {
      setRestocking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-admin-text">{t('inventory.title')}</h2>
      </div>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FiAlertTriangle className="text-red-500" size={18} />
            <h3 className="text-sm font-semibold text-red-700">
              {t('inventory.lowStock')} ({lowStock.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                <th className="text-left px-4 py-3 font-medium text-admin-muted">
                  {t('books.format')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">Sales</th>
                <th className="text-right px-4 py-3 font-medium text-admin-muted">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-admin-muted">
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
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 rounded">
                          {item.format || 'PAPERBACK'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-admin-muted">
                        {item.salesCount ?? item.totalSold ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {restockId === bookId ? (
                          <div className="flex items-center gap-2 justify-end">
                            <input
                              type="number"
                              min="1"
                              value={restockQty}
                              onChange={(e) => setRestockQty(e.target.value)}
                              placeholder="Qty"
                              className="w-16 px-2 py-1.5 bg-admin-card border border-admin-border rounded text-sm text-admin-text focus:outline-none focus:border-admin-accent"
                            />
                            <input
                              type="text"
                              value={restockNote}
                              onChange={(e) => setRestockNote(e.target.value)}
                              placeholder="Note"
                              className="w-24 px-2 py-1.5 bg-admin-card border border-admin-border rounded text-sm text-admin-text focus:outline-none focus:border-admin-accent"
                            />
                            <button
                              onClick={() => handleRestock(bookId)}
                              disabled={restocking}
                              className="px-3 py-1.5 bg-admin-accent text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                              {restocking ? '...' : t('common.save')}
                            </button>
                            <button
                              onClick={() => {
                                setRestockId(null);
                                setRestockQty('');
                                setRestockNote('');
                              }}
                              className="p-1 text-admin-muted hover:text-admin-text transition-colors"
                            >
                              <FiX size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRestockId(bookId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
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
