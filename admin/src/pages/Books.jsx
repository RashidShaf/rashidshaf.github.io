import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

export default function Books() {
  const t = useLanguageStore((s) => s.t);
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
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

  useEffect(() => { fetchBooks(); }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBooks();
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this book?')) return;
    try {
      await api.delete(`/admin/books/${id}`);
      toast.success('Book deactivated');
      fetchBooks();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-admin-text">{t('books.title')}</h2>
        <Link to="/books/create" className="flex items-center gap-2 px-4 py-2 bg-admin-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
          <FiPlus size={16} /> {t('books.addBook')}
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} className="w-full pl-10 pr-4 py-2.5 bg-admin-card border border-admin-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent" />
        </div>
      </form>

      {/* Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-admin-border">
              <tr>
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
                  <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : books.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-admin-muted">{t('common.noResults')}</td></tr>
              ) : (
                books.map((book) => (
                  <tr key={book.id} className="border-b border-admin-border hover:bg-gray-50 transition-colors">
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
                      <span className={`w-2 h-2 rounded-full inline-block ${book.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/books/${book.id}/edit`} className="p-1.5 text-admin-muted hover:text-admin-accent transition-colors"><FiEdit2 size={15} /></Link>
                        <button onClick={() => handleDelete(book.id)} className="p-1.5 text-admin-muted hover:text-red-500 transition-colors"><FiTrash2 size={15} /></button>
                      </div>
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
            <span className="text-xs text-admin-muted">{t('common.showing')} {books.length} {t('common.of')} {pagination.total}</span>
            <div className="flex gap-1">
              <button disabled={!pagination.hasPrev} onClick={() => setPage(page - 1)} className="p-1.5 rounded border border-admin-border text-admin-muted disabled:opacity-30 hover:bg-gray-50"><FiChevronLeft size={16} /></button>
              <button disabled={!pagination.hasNext} onClick={() => setPage(page + 1)} className="p-1.5 rounded border border-admin-border text-admin-muted disabled:opacity-30 hover:bg-gray-50"><FiChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
