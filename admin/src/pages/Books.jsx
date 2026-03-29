import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiChevronLeft, FiChevronRight, FiBook, FiStar, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';

export default function Books() {
  const t = useLanguageStore((s) => s.t);
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, featured: 0, lowStock: 0 });
  const [deleteId, setDeleteId] = useState(null);

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
      const res = await api.get(`/admin/books?${params}`);
      setBooks(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooks(); }, [page, limit]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchBooks(); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: FiBook, label: 'Total Books', value: stats.total, bg: 'bg-blue-600' },
          { icon: FiStar, label: 'Active Books', value: pagination?.total || stats.total, bg: 'bg-amber-500' },
          { icon: FiAlertTriangle, label: 'Low Stock', value: stats.lowStock, bg: 'bg-red-600' },
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

      {/* Search + Per-page + Add Book */}
      <div className="flex items-center gap-3 mb-4 bg-admin-card border border-admin-border rounded-lg px-3 py-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} className="w-full pl-10 pr-4 py-2 bg-admin-bg border border-gray-300 rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent" />
        </div>
        <div className="flex-1" />
        <button onClick={fetchBooks} className="p-2 text-admin-muted hover:text-admin-accent hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
          <FiRefreshCw size={16} />
        </button>
        <Link to="/books/create" className="flex items-center gap-2 px-4 py-2 bg-admin-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors whitespace-nowrap">
          <FiPlus size={16} /> {t('books.addBook')}
        </Link>
      </div>

      {/* Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-admin-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-admin-muted w-12">#</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">{t('books.bookTitle')}</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">{t('books.author')}</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">{t('books.price')}</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">{t('books.stock')}</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">{t('books.active')}</th>
                <th className="text-right px-4 py-3 font-medium text-admin-muted">{t('common.actions')}</th>
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
                    <td className="px-4 py-3 text-admin-muted text-xs">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                          {book.coverImage ? <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/${book.coverImage}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-admin-muted">{book.title.charAt(0)}</div>}
                        </div>
                        <span className="font-medium text-admin-text truncate max-w-[200px]">{book.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-admin-muted">{book.author}</td>
                    <td className="px-4 py-3 font-medium text-admin-text">QAR {parseFloat(book.price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${book.stock <= 5 ? 'text-red-500' : 'text-admin-text'}`}>{book.stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(book)}
                        className={`px-2.5 py-0.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                          book.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                      >
                        {book.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
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
              className="px-2 py-1 bg-admin-bg border border-gray-300 rounded text-xs text-admin-text focus:outline-none focus:border-admin-accent cursor-pointer"
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
        title="Delete Book"
        message="This will permanently delete this book. This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
}
