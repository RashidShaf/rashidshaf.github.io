import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { FiStar, FiSearch, FiTrash2, FiEye, FiEyeOff, FiRefreshCw, FiChevronLeft, FiChevronRight, FiMessageSquare, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';

export default function Reviews() {
  const { t, language } = useLanguageStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [limit, setLimit] = useState(parseInt(searchParams.get('limit')) || 10);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [visibilityFilter, setVisibilityFilter] = useState(searchParams.get('visibility') || '');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, avgRating: 0, visible: 0 });
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkConfirmAction, setBulkConfirmAction] = useState(null);

  // Fetch stats
  useEffect(() => {
    api.get('/admin/reviews?limit=1').then((res) => {
      const total = res.data.pagination?.total || 0;
      setStats((s) => ({ ...s, total }));
    }).catch(() => {});
    api.get('/admin/reviews?isVisible=true&limit=1').then((res) => {
      const visible = res.data.pagination?.total || 0;
      setStats((s) => ({ ...s, visible }));
    }).catch(() => {});
    api.get('/admin/reviews?limit=100').then((res) => {
      const all = res.data.data || [];
      if (all.length > 0) {
        const avg = all.reduce((sum, r) => sum + (r.rating || 0), 0) / all.length;
        setStats((s) => ({ ...s, avgRating: avg.toFixed(1) }));
      }
    }).catch(() => {});
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('search', search);
      if (visibilityFilter) params.set('isVisible', visibilityFilter);
      const res = await api.get(`/admin/reviews?${params}`);
      setReviews(res.data.data || []);
      setPagination(res.data.pagination || null);
      setSelectedIds([]);
    } catch (err) {
      toast.error(t('reviews.failedFetch'));
    } finally {
      setLoading(false);
      const savedScroll = sessionStorage.getItem('admin-reviews-scroll');
      if (savedScroll) {
        setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 50);
        sessionStorage.removeItem('admin-reviews-scroll');
      }
    }
  };

  useEffect(() => { fetchReviews(); }, [page, limit, visibilityFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchReviews();
      const p = new URLSearchParams(searchParams);
      if (search) p.set('q', search); else p.delete('q');
      setSearchParams(p, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleToggleVisibility = async (review) => {
    try {
      await api.put(`/admin/reviews/${review.id}/visibility`);
      toast.success(review.isVisible ? t('reviews.hidden') : t('reviews.shown'));
      fetchReviews();
    } catch (err) {
      toast.error(t('reviews.failedVisibility'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/reviews/${deleteId}`);
      toast.success(t('reviews.reviewDeleted'));
      setDeleteId(null);
      fetchReviews();
    } catch (err) {
      toast.error(t('reviews.failedDelete'));
      setDeleteId(null);
    }
  };

  const toggleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleSelectAll = async (items) => {
    const allIds = items.map((i) => i.id);
    const allSelected = allIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
    } else if (pagination && pagination.total > items.length) {
      try {
        const params = new URLSearchParams({ page: 1, limit: 1000 });
        if (search) params.set('search', search);
        if (visibilityFilter) params.set('isVisible', visibilityFilter);
        const res = await api.get(`/admin/reviews?${params}`);
        const data = res.data.data || res.data;
        setSelectedIds(data.map((r) => r.id));
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
      await api.post('/admin/reviews/bulk-action', { ids: selectedIds, action, ...extra });
      toast.success(t('common.bulkSuccess'));
      setSelectedIds([]);
      setBulkConfirmAction(null);
      fetchReviews();
    } catch (err) {
      toast.error(t('common.saveFailed'));
      setBulkConfirmAction(null);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <FiStar
            key={star}
            size={14}
            className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 3xl:gap-6 mb-6 3xl:mb-8">
        {[
          { icon: FiMessageSquare, label: t('reviews.totalReviews'), value: stats.total, bg: 'bg-blue-600' },
          { icon: FiStar, label: t('reviews.averageRating'), value: stats.avgRating, bg: 'bg-amber-500' },
          { icon: FiEye, label: t('reviews.visibleReviews'), value: stats.visible, bg: 'bg-emerald-600' },
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

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 mb-4 bg-admin-card border border-admin-border rounded-lg px-3 py-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.searchReviews')}
            className="w-full ps-10 pe-4 py-2 3xl:py-2.5 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent"
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={fetchReviews}
          className="flex items-center gap-1.5 px-3 py-2 3xl:px-4 3xl:py-2.5 text-admin-muted hover:text-admin-accent hover:bg-gray-100 rounded-lg transition-colors text-sm 3xl:text-base font-medium"
        >
          <FiRefreshCw size={14} /> {t('common.refresh')}
        </button>
        <select
          value={visibilityFilter}
          onChange={(e) => { const val = e.target.value; setVisibilityFilter(val); setPage(1); const p = new URLSearchParams(searchParams); if (val) p.set('visibility', val); else p.delete('visibility'); setSearchParams(p, { replace: true }); }}
          className="px-4 py-2 3xl:py-2.5 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent appearance-none cursor-pointer min-w-[140px]"
        >
          <option value="">{t('common.all')}</option>
          <option value="true">{t('common.visible')}</option>
          <option value="false">{t('common.hidden')}</option>
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 mb-3 bg-admin-accent/5 border border-admin-accent/20 rounded-lg px-4 py-2.5 3xl:px-6 3xl:py-3">
          <span className="text-sm 3xl:text-lg font-medium text-admin-accent">{selectedIds.length} {t('common.selected')}</span>
          <div className="flex-1" />
          <button onClick={() => setBulkConfirmAction('delete')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">{t('common.bulkDelete')}</button>
          <button onClick={() => handleBulkAction('show')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">{t('common.bulkShow')}</button>
          <button onClick={() => handleBulkAction('hide')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">{t('common.bulkHide')}</button>
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
                  <input type="checkbox" checked={isAllSelected(reviews)} onChange={() => toggleSelectAll(reviews)} className="w-4 h-4 3xl:w-5 3xl:h-5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent" />
                </th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted w-12">#</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('books.bookTitle')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('orders.customer')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.rating')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.comment')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.verified')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.visible')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.date')}</th>
                <th className="text-end px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={10} className="px-4 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-admin-muted">
                    {t('common.noResults')}
                  </td>
                </tr>
              ) : (
                reviews.map((review, index) => (
                  <tr key={review.id} className={`border-b border-admin-border hover:bg-gray-50 transition-colors ${selectedIds.includes(review.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.includes(review.id)} onChange={() => toggleSelect(review.id)} className="w-4 h-4 3xl:w-5 3xl:h-5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent" />
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <span className="font-medium text-admin-text truncate max-w-[200px] block">
                        {review.book?.title || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted">
                      {review.user?.firstName} {review.user?.lastName}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      {renderStars(review.rating)}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs max-w-[250px]">
                      <span className="block truncate" title={review.comment}>
                        {review.comment ? (review.comment.length > 100 ? review.comment.slice(0, 100) + '...' : review.comment) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      {review.isVerified ? (
                        <FiCheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <span className="text-xs text-admin-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <button
                        onClick={() => handleToggleVisibility(review)}
                        className={`px-2.5 py-0.5 3xl:px-3 3xl:py-1 text-xs 3xl:text-sm font-medium rounded-full cursor-pointer transition-colors ${
                          review.isVisible ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                      >
                        {review.isVisible ? t('common.active') : t('common.inactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-end">
                      <button
                        onClick={() => setDeleteId(review.id)}
                        className="p-1.5 3xl:p-2 text-admin-muted hover:text-red-500 transition-colors"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 3xl:px-6 3xl:py-4 border-t border-admin-border">
          <div className="flex items-center gap-3">
            <span className="text-xs 3xl:text-sm text-admin-muted">
              {t('common.showing')} {reviews.length} {t('common.of')} {pagination?.total || reviews.length}
            </span>
            <select
              value={limit}
              onChange={(e) => {
                const newLimit = Number(e.target.value);
                setLimit(newLimit);
                setPage(1);
                const params = new URLSearchParams();
                if (visibilityFilter) params.set('visibility', visibilityFilter);
                if (search) params.set('q', search);
                params.set('page', '1');
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
          {pagination && pagination.totalPages > 1 && (
            <div className="flex gap-1">
              <button
                disabled={!pagination.hasPrev}
                onClick={() => {
                  const newPage = page - 1;
                  setPage(newPage);
                  const params = new URLSearchParams();
                  if (visibilityFilter) params.set('visibility', visibilityFilter);
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
                  if (visibilityFilter) params.set('visibility', visibilityFilter);
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
      </div>

      <ConfirmModal
        open={!!deleteId}
        title={t('reviews.deleteReview')}
        message={t('reviews.deleteReviewConfirm')}
        confirmText={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmModal
        open={bulkConfirmAction === 'delete'}
        title={t('common.bulkDelete')}
        message={t('common.bulkConfirm').replace('{count}', selectedIds.length)}
        confirmText={t('common.delete')}
        onConfirm={() => handleBulkAction('delete')}
        onCancel={() => setBulkConfirmAction(null)}
      />
    </motion.div>
  );
}
