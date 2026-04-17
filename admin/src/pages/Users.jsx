import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiChevronLeft, FiChevronRight, FiShield, FiSlash, FiUsers, FiUserCheck, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';

const roleColors = {
  ADMIN: 'bg-purple-100 text-purple-700',
  USER: 'bg-blue-100 text-blue-700',
};

export default function Users() {
  const t = useLanguageStore((s) => s.t);
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [limit, setLimit] = useState(parseInt(searchParams.get('limit')) || 10);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: null, active: null });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkConfirmAction, setBulkConfirmAction] = useState(null);
  const fetchAbortRef = useRef(null);

  const fetchUsers = async () => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit, withStats: '1' });
      if (search) params.set('search', search);
      const res = await api.get(`/admin/users?${params}`, { signal: controller.signal });
      setUsers(res.data.data || res.data);
      setPagination(res.data.pagination || null);
      setSelectedIds([]);
      if (res.data.stats) {
        setStats(res.data.stats);
      } else {
        setStats({ total: null, active: null });
        toast.error(t('users.failedLoadStats'), { toastId: 'users-stats-fail' });
      }
    } catch (err) {
      if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') return;
      toast.error(t('users.failedFetch'), { toastId: 'users-list-fail' });
    } finally {
      if (fetchAbortRef.current === controller) {
        setLoading(false);
        const savedScroll = sessionStorage.getItem('admin-users-scroll');
        if (savedScroll) {
          setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 50);
          sessionStorage.removeItem('admin-users-scroll');
        }
      }
    }
  };

  useEffect(() => { fetchUsers(); }, [page, limit]);

  // Live search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers();
      const p = new URLSearchParams(searchParams);
      if (search) p.set('q', search); else p.delete('q');
      setSearchParams(p, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

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
        const res = await api.get(`/admin/users?${params}`);
        const data = res.data.data || res.data;
        setSelectedIds(data.map((u) => u.id));
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
      await api.post('/admin/users/bulk-action', { ids: selectedIds, action, ...extra });
      toast.success(t('common.bulkSuccess'));
      setSelectedIds([]);
      setBulkConfirmAction(null);
      fetchUsers();
    } catch (err) {
      toast.error(t('common.saveFailed'));
      setBulkConfirmAction(null);
    }
  };

  const handleToggleBlock = async (user) => {
    const action = user.isBlocked ? 'unblock' : 'block';
    try {
      await api.put(`/admin/users/${user.id}/block`, { blocked: !user.isBlocked });
      toast.success(action === 'block' ? t('users.userBlocked') : t('users.userUnblocked'));
      fetchUsers();
    } catch (err) {
      toast.error(t('users.failedUpdate'));
    }
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
          { icon: FiUsers, label: t('users.totalUsers'), value: stats.total ?? '—', bg: 'bg-blue-600', color: 'text-white' },
          { icon: FiUserCheck, label: t('users.activeUsers'), value: stats.active ?? '—', bg: 'bg-emerald-600', color: 'text-white' },
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

      {/* Search */}
      <div className="flex items-center gap-3 mb-4 bg-admin-card border border-admin-border rounded-lg px-3 py-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} className="w-full ps-10 pe-4 py-2 3xl:py-2.5 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" />
        </div>
        <div className="flex-1" />
        <button onClick={fetchUsers} className="flex items-center gap-1.5 px-3 py-2 3xl:px-4 3xl:py-2.5 text-admin-muted hover:text-admin-accent hover:bg-gray-100 rounded-lg transition-colors text-sm 3xl:text-base font-medium">
          <FiRefreshCw size={14} /> {t('common.refresh')}
        </button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 mb-3 bg-admin-accent/5 border border-admin-accent/20 rounded-lg px-4 py-2.5 3xl:px-6 3xl:py-3">
          <span className="text-sm 3xl:text-lg font-medium text-admin-accent">{selectedIds.length} {t('common.selected')}</span>
          <div className="flex-1" />
          <button onClick={() => handleBulkAction('block')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">{t('common.bulkBlock')}</button>
          <button onClick={() => handleBulkAction('unblock')} className="px-3 py-1.5 3xl:px-6 3xl:py-2.5 text-xs 3xl:text-base font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">{t('common.bulkUnblock')}</button>
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
                  <input type="checkbox" checked={isAllSelected(users)} onChange={() => toggleSelectAll(users)} className="w-4 h-4 3xl:w-5 3xl:h-5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent" />
                </th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('users.name')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('users.email')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.phone')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('users.role')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('users.blocked')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('users.orders')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.joined')}</th>
                <th className="text-end px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="px-4 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-admin-muted">
                    {t('common.noResults')}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className={`border-b border-admin-border hover:bg-gray-50 transition-colors ${selectedIds.includes(user.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.includes(user.id)} onChange={() => toggleSelect(user.id)} className="w-4 h-4 3xl:w-5 3xl:h-5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent" />
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <p className="font-medium text-admin-text">
                        {user.firstName} {user.lastName}
                      </p>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted">{user.email}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted" dir="ltr">{user.phone || '-'}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 3xl:px-3 3xl:py-1 text-xs 3xl:text-sm font-medium rounded-full ${
                          roleColors[user.role] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {user.role === 'ADMIN' ? t('users.admin') : t('users.user')}
                      </span>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <span
                        className={`w-2 h-2 rounded-full inline-block ${
                          user.isBlocked ? 'bg-red-500' : 'bg-green-500'
                        }`}
                      />
                      <span className="ml-2 text-xs text-admin-muted">
                        {user.isBlocked ? t('users.blocked') : t('common.active')}
                      </span>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted">
                      {user.orderCount ?? user._count?.orders ?? '-'}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-end">
                      {user.role === 'ADMIN' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700">
                          <FiShield size={13} /> {t('users.admin')}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleBlock(user)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            user.isBlocked
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                          title={user.isBlocked ? t('users.unblock') : t('users.block')}
                        >
                          {user.isBlocked ? (
                            <>
                              <FiShield size={13} />
                              {t('users.unblock')}
                            </>
                          ) : (
                            <>
                              <FiSlash size={13} />
                              {t('users.block')}
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between px-4 py-3 3xl:px-6 3xl:py-4 border-t border-admin-border">
            <div className="flex items-center gap-3">
              <span className="text-xs 3xl:text-sm text-admin-muted">
                {t('common.showing')} {users.length} {t('common.of')} {pagination.total}
              </span>
              <select
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setLimit(newLimit);
                  setPage(1);
                  const params = new URLSearchParams();
                  if (search) params.set('q', search);
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
            {pagination.totalPages > 1 && (
            <div className="flex gap-1">
              <button
                disabled={!pagination.hasPrev}
                onClick={() => {
                  const newPage = page - 1;
                  setPage(newPage);
                  const params = new URLSearchParams();
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
        )}
      </div>

      <ConfirmModal
        open={bulkConfirmAction === 'block'}
        title={t('common.bulkBlock')}
        message={t('common.bulkConfirm').replace('{count}', selectedIds.length)}
        confirmText={t('users.block')}
        onConfirm={() => handleBulkAction('block')}
        onCancel={() => setBulkConfirmAction(null)}
      />
    </motion.div>
  );
}
