import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiChevronLeft, FiChevronRight, FiShield, FiSlash } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const roleColors = {
  ADMIN: 'bg-purple-100 text-purple-700',
  USER: 'bg-blue-100 text-blue-700',
};

export default function Users() {
  const t = useLanguageStore((s) => s.t);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.set('search', search);
      const res = await api.get(`/admin/users?${params}`);
      setUsers(res.data.data || res.data);
      setPagination(res.data.pagination || null);
    } catch (err) {
      toast.error('Failed to fetch users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleToggleBlock = async (user) => {
    const action = user.isBlocked ? 'unblock' : 'block';
    try {
      await api.put(`/admin/users/${user.id}/block`, { blocked: !user.isBlocked });
      toast.success(`User ${action}ed successfully`);
      fetchUsers();
    } catch (err) {
      toast.error(`Failed to ${action} user`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-admin-text">{t('users.title')}</h2>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="w-full pl-10 pr-4 py-2.5 bg-admin-card border border-admin-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent"
          />
        </div>
      </form>

      {/* Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-admin-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">{t('users.name')}</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">{t('users.email')}</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">{t('users.role')}</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">{t('users.blocked')}</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">Orders</th>
                <th className="text-left px-4 py-3 font-medium text-admin-muted">Joined</th>
                <th className="text-right px-4 py-3 font-medium text-admin-muted">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-admin-muted">
                    {t('common.noResults')}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-admin-border hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-admin-text">
                        {user.firstName} {user.lastName}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-admin-muted">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
                          roleColors[user.role] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`w-2 h-2 rounded-full inline-block ${
                          user.isBlocked ? 'bg-red-500' : 'bg-green-500'
                        }`}
                      />
                      <span className="ml-2 text-xs text-admin-muted">
                        {user.isBlocked ? t('users.blocked') : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-admin-muted">
                      {user.orderCount ?? user._count?.orders ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-admin-muted text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
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
            <span className="text-xs text-admin-muted">
              {t('common.showing')} {users.length} {t('common.of')} {pagination.total}
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
