import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiMenu, FiBell, FiChevronDown } from 'react-icons/fi';
import useAuthStore from '../../stores/useAuthStore';
import useLanguageStore from '../../stores/useLanguageStore';

const pageTitles = {
  '/': 'nav.dashboard',
  '/books': 'nav.books',
  '/books/create': 'books.addBook',
  '/orders': 'nav.orders',
  '/users': 'nav.users',
  '/categories': 'nav.categories',
  '/inventory': 'nav.inventory',
  '/reports': 'nav.reports',
  '/settings': 'nav.settings',
};

export default function Header({ onMenuClick }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-admin-border">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left: Menu button + Page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100 transition-colors"
          >
            <FiMenu size={20} />
          </button>
          <h1 className="text-lg font-semibold text-admin-text">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right: Language toggle, Notifications, User dropdown */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-admin-muted hover:bg-gray-200 transition-colors"
          >
            {language === 'en' ? 'AR' : 'EN'}
          </button>

          {/* Notification Bell */}
          <button className="relative p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100 transition-colors">
            <FiBell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-admin-danger rounded-full" />
          </button>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-admin-accent flex items-center justify-center text-white text-sm font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <span className="hidden md:block text-sm font-medium text-admin-text">
                {user?.name || 'Admin'}
              </span>
              <FiChevronDown
                size={14}
                className={`hidden md:block text-admin-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-admin-border py-1 z-50">
                <div className="px-4 py-2 border-b border-admin-border">
                  <p className="text-sm font-medium text-admin-text">{user?.name}</p>
                  <p className="text-xs text-admin-muted">{user?.email}</p>
                </div>
                <button
                  onClick={async () => {
                    setDropdownOpen(false);
                    await logout();
                    window.location.href = '/login';
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-admin-danger hover:bg-gray-50 transition-colors"
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
