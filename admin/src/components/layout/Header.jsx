import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiMenu, FiBell, FiChevronDown, FiCheck } from 'react-icons/fi';
import useAuthStore from '../../stores/useAuthStore';
import useLanguageStore from '../../stores/useLanguageStore';
import api from '../../utils/api';

const pageTitles = {
  '/': 'nav.dashboard',
  '/books': 'nav.products',
  '/books/create': 'books.addBook',
  '/orders': 'nav.orders',
  '/reviews': 'nav.reviews',
  '/users': 'nav.users',
  '/categories': 'nav.categories',
  '/inventory': 'nav.inventory',
  '/reports': 'nav.reports',
  '/banners': 'nav.banners',
  '/data': 'nav.data',
  '/settings': 'nav.settings',
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function Header({ onMenuClick }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  // Determine page title from path
  const getPageTitle = () => {
    const path = location.pathname;
    // Check exact match first
    if (pageTitles[path]) return t(pageTitles[path]);
    // Check edit pages
    if (path.match(/^\/books\/.*\/edit$/)) return t('books.editBook');
    if (path.match(/^\/orders\/.+$/)) return t('orders.title');
    return t('nav.dashboard');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread count on mount
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/admin/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
    } catch (err) {
      // silently fail
    }
  };

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get('/admin/notifications?limit=10');
      setNotifications(res.data.data || res.data || []);
    } catch (err) {
      // silently fail
    } finally {
      setNotifLoading(false);
    }
  };

  const handleBellClick = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    setDropdownOpen(false);
    if (opening) {
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/admin/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      // silently fail
    }
  };

  const handleMarkRead = async (notif) => {
    if (notif.isRead) return;
    try {
      await api.put(`/admin/notifications/${notif.id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      // silently fail
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-admin-border">
      <div className="flex items-center justify-between h-16 3xl:h-20 px-4 md:px-6 3xl:px-8">
        {/* Left: Menu button + Page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100 transition-colors"
          >
            <FiMenu size={20} />
          </button>
          <h1 className="text-xl 3xl:text-2xl font-extrabold text-admin-text">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right: Language toggle, Notifications, User dropdown */}
        <div className="flex items-center gap-2 md:gap-4 3xl:gap-5">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 3xl:px-4 3xl:py-2 rounded-lg text-xs 3xl:text-sm font-semibold bg-gray-100 text-admin-muted hover:bg-gray-200 transition-colors"
          >
            {language === 'en' ? 'AR' : 'EN'}
          </button>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleBellClick}
              className="relative p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100 transition-colors"
            >
              <FiBell size={18} className="3xl:scale-125" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-admin-danger text-white text-[10px] font-bold rounded-full leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute end-0 mt-2 w-80 3xl:w-96 bg-white rounded-lg shadow-lg border border-admin-border z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 3xl:px-5 3xl:py-4 border-b border-admin-border">
                  <h3 className="text-sm 3xl:text-base font-bold text-admin-text">{t('common.notifications')}</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs 3xl:text-sm text-admin-accent hover:underline font-medium"
                    >
                      <FiCheck size={12} /> {t('common.markAllRead')}
                    </button>
                  )}
                </div>

                {/* Notification list */}
                <div className="max-h-80 3xl:max-h-96 overflow-y-auto">
                  {notifLoading ? (
                    <div className="px-4 py-6 text-center text-sm 3xl:text-base text-admin-muted">{t('common.loading')}</div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm 3xl:text-base text-admin-muted">{t('common.noNotifications')}</div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleMarkRead(notif)}
                        className={`px-4 py-3 3xl:px-5 3xl:py-4 border-b border-admin-border cursor-pointer hover:bg-gray-50 transition-colors ${
                          !notif.isRead ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!notif.isRead && (
                            <span className="w-2 h-2 mt-1.5 bg-admin-accent rounded-full flex-shrink-0" />
                          )}
                          <div className={`flex-1 ${notif.isRead ? 'ml-4' : ''}`}>
                            <p className="text-sm 3xl:text-base font-medium text-admin-text leading-snug">
                              {notif.title}
                            </p>
                            <p className="text-xs 3xl:text-sm text-admin-muted mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                            <p className="text-[10px] 3xl:text-xs text-admin-muted mt-1">
                              {timeAgo(notif.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false); }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 3xl:w-10 3xl:h-10 rounded-full bg-admin-accent flex items-center justify-center text-white text-sm 3xl:text-base font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <span className="hidden md:block text-sm 3xl:text-base font-medium text-admin-text">
                {user?.name || 'Admin'}
              </span>
              <FiChevronDown
                size={14}
                className={`hidden md:block text-admin-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute end-0 mt-2 w-48 3xl:w-56 bg-white rounded-lg shadow-lg border border-admin-border py-1 z-50">
                <div className="px-4 py-2 3xl:px-5 3xl:py-3 border-b border-admin-border">
                  <p className="text-sm 3xl:text-base font-medium text-admin-text">{user?.name}</p>
                  <p className="text-xs 3xl:text-sm text-admin-muted">{user?.email}</p>
                </div>
                <button
                  onClick={async () => {
                    setDropdownOpen(false);
                    await logout();
                    window.location.href = '/login';
                  }}
                  className="w-full text-start px-4 py-2 3xl:px-5 3xl:py-3 text-sm 3xl:text-base text-admin-danger hover:bg-gray-50 transition-colors"
                >
                  {t('nav.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
