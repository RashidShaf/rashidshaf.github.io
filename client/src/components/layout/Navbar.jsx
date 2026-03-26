import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiShoppingCart,
  FiHeart,
  FiUser,
  FiMenu,
  FiX,
  FiSearch,
  FiChevronDown,
  FiLogOut,
  FiPackage,
  FiBook,
} from 'react-icons/fi';
import useLanguageStore from '../../stores/useLanguageStore';
import useCartStore from '../../stores/useCartStore';
import useAuthStore from '../../stores/useAuthStore';
import useWishlistStore from '../../stores/useWishlistStore';
import LanguageSwitcher from './LanguageSwitcher';
import api from '../../utils/api';

const Navbar = () => {
  const { t, language } = useLanguageStore();
  const getItemCount = useCartStore((s) => s.getItemCount);
  const wishlistCount = useWishlistStore((s) => s.getCount);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const accountTimeout = useRef(null);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced search for autocomplete
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    setShowSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/books?search=${encodeURIComponent(value.trim())}&limit=6`);
        const books = res.data.data || res.data;
        setSuggestions(books.map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          slug: b.slug,
          cover: b.coverImage ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}/${b.coverImage}` : null,
        })));
      } catch {
        setSuggestions([]);
      }
      setLoadingSuggestions(false);
    }, 300);
  };

  const closeSuggestions = () => {
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSuggestionClick = (slug) => {
    navigate(`/books/${slug}`);
    setSearchQuery('');
    closeSuggestions();
    setMobileOpen(false);
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        closeSuggestions();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cartCount = getItemCount();
  const wCount = wishlistCount();

  const handleAccountEnter = () => {
    clearTimeout(accountTimeout.current);
    setAccountOpen(true);
  };

  const handleAccountLeave = () => {
    accountTimeout.current = setTimeout(() => setAccountOpen(false), 200);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [navigate]);


  const handleLogout = async () => {
    await logout();
    setAccountOpen(false);
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/books', label: t('nav.books') },
    { to: '/about', label: t('nav.about') },
    { to: '/contact', label: t('nav.contact') },
  ];

  const linkClass = ({ isActive }) =>
    `relative px-1 py-2 text-sm font-medium tracking-wide transition-colors hover:text-accent ${
      isActive ? 'text-accent' : 'text-foreground'
    }`;

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-50 bg-background border-b border-muted/10"
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <img src="/arkaan-text-logo.png" alt="مكتبة أركان - Arkaan Bookstore" className="h-10 lg:h-14 w-auto" />
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={linkClass} end={link.to === '/'}>
                  {link.label}
                </NavLink>
              ))}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search */}
              <div ref={searchRef} className="hidden md:block relative">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      navigate(`/books?search=${encodeURIComponent(searchQuery.trim())}`);
                      setSearchQuery('');
                      closeSuggestions();
                    }
                  }}
                  className="flex items-center relative"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && closeSuggestions()}
                    placeholder={t('books.search')}
                    className="w-48 lg:w-56 px-4 py-2 ps-10 bg-surface border border-muted/20 rounded-full text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent transition-colors"
                  />
                  <FiSearch className="absolute start-3.5 w-4 h-4 text-muted/50 pointer-events-none" />
                </form>

                {/* Suggestions Dropdown */}
                {showSuggestions && (
                  <div className="absolute top-full mt-2 w-72 bg-surface border border-muted/15 rounded-xl shadow-xl z-50 overflow-hidden">
                    {loadingSuggestions ? (
                      <div className="px-4 py-6 text-center">
                        <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
                      </div>
                    ) : suggestions.length === 0 ? (
                      <div className="px-4 py-4 text-center text-sm text-muted">
                        {t('common.noResults')}
                      </div>
                    ) : (
                      <div className="py-1">
                        {suggestions.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleSuggestionClick(item.slug)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-alt transition-colors text-start"
                          >
                            {item.cover ? <img src={item.cover} alt="" className="w-9 h-12 rounded object-cover bg-surface-alt flex-shrink-0" /> : <div className="w-9 h-12 rounded bg-surface-alt flex-shrink-0 flex items-center justify-center text-accent/30 font-bold text-xs">{item.title?.charAt(0)}</div>}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                              <p className="text-xs text-muted line-clamp-1">{item.author}</p>
                            </div>
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            navigate(`/books?search=${encodeURIComponent(searchQuery.trim())}`);
                            setSearchQuery('');
                            closeSuggestions();
                          }}
                          className="w-full px-3 py-2.5 text-xs font-medium text-accent hover:bg-surface-alt transition-colors border-t border-muted/10 text-center"
                        >
                          {t('common.seeAll')} "{searchQuery}"
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Language Switcher */}
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>

              {/* Cart */}
              <Link to="/cart" className="relative p-2 text-foreground hover:text-accent transition-colors">
                <FiShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 ltr:-right-0.5 rtl:-left-0.5 bg-accent text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </motion.span>
                )}
              </Link>

              {/* My Account — hover dropdown */}
              <div
                className="relative hidden sm:block"
                onMouseEnter={handleAccountEnter}
                onMouseLeave={handleAccountLeave}
              >
                <button className="flex items-center gap-1.5 p-2 text-foreground hover:text-accent transition-colors">
                  <FiUser className="w-5 h-5" />
                  <span className="hidden md:inline text-sm font-medium">{t('nav.myAccount')}</span>
                  <FiChevronDown className={`w-3 h-3 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-1 ltr:right-0 rtl:left-0 bg-surface border border-muted/20 rounded-xl shadow-xl overflow-hidden min-w-[220px] z-50"
                      onMouseEnter={handleAccountEnter}
                      onMouseLeave={handleAccountLeave}
                    >
                      {user ? (
                        <>
                          <div className="px-4 py-3 border-b border-muted/10">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-muted truncate">{user.email}</p>
                          </div>
                          <div className="py-1">
                            {[
                              { to: '/profile', icon: FiUser, label: t('nav.profile') },
                              { to: '/orders', icon: FiPackage, label: t('nav.orders') },
                              { to: '/wishlist', icon: FiHeart, label: t('nav.wishlist') },
                              { to: '/reading-lists', icon: FiBook, label: t('nav.readingLists') },
                            ].map((item) => (
                              <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setAccountOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-surface-alt transition-colors"
                              >
                                <item.icon className="w-4 h-4 text-muted" />
                                {item.label}
                              </Link>
                            ))}
                          </div>
                          <div className="border-t border-muted/10 py-1">
                            <button
                              onClick={handleLogout}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <FiLogOut className="w-4 h-4" />
                              {t('nav.logout')}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-4">
                          <Link
                            to="/login"
                            onClick={() => setAccountOpen(false)}
                            className="block w-full text-center py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-light transition-colors"
                          >
                            {t('nav.login')}
                          </Link>
                          <p className="mt-3 text-center text-xs text-muted">
                            {t('auth.noAccount')}{' '}
                            <Link
                              to="/register"
                              onClick={() => setAccountOpen(false)}
                              className="text-accent font-medium hover:underline"
                            >
                              {t('nav.register')}
                            </Link>
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Hamburger */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 text-foreground hover:text-accent transition-colors"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
              </motion.button>
            </div>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed top-16 inset-x-0 bg-background border-b border-muted/20 shadow-2xl z-50 lg:hidden max-h-[calc(100vh-4rem)] overflow-y-auto"
            >
              <div className="px-4 py-6 space-y-1">
                {/* Mobile Search */}
                <div className="relative mb-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (searchQuery.trim()) {
                        navigate(`/books?search=${encodeURIComponent(searchQuery.trim())}`);
                        setSearchQuery('');
                        closeSuggestions();
                        setMobileOpen(false);
                      }
                    }}
                  >
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder={t('books.search')}
                      className="w-full px-4 py-3 ps-11 bg-surface border border-muted/20 rounded-xl text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent transition-colors"
                    />
                    <FiSearch className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50 pointer-events-none" />
                  </form>

                  {/* Mobile Suggestions */}
                  {showSuggestions && (
                    <div className="mt-2 bg-surface border border-muted/15 rounded-xl shadow-lg overflow-hidden">
                      {loadingSuggestions ? (
                        <div className="px-4 py-4 text-center">
                          <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
                        </div>
                      ) : suggestions.length === 0 ? (
                        <div className="px-4 py-3 text-center text-sm text-muted">
                          {t('common.noResults')}
                        </div>
                      ) : (
                        <div className="py-1">
                          {suggestions.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleSuggestionClick(item.slug)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-alt transition-colors text-start"
                            >
                              {item.cover ? <img src={item.cover} alt="" className="w-9 h-12 rounded object-cover bg-surface-alt flex-shrink-0" /> : <div className="w-9 h-12 rounded bg-surface-alt flex-shrink-0 flex items-center justify-center text-accent/30 font-bold text-xs">{item.title?.charAt(0)}</div>}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                                <p className="text-xs text-muted line-clamp-1">{item.author}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        isActive
                          ? 'bg-accent/10 text-accent'
                          : 'text-foreground hover:bg-surface-alt'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}

                <div className="border-t border-muted/20 my-4" />

                {user ? (
                  <>
                    <div className="px-4 py-2 mb-2">
                      <p className="text-sm font-semibold text-foreground">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-surface-alt transition-colors"
                    >
                      <FiUser className="w-5 h-5" />
                      {t('nav.profile')}
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-surface-alt transition-colors"
                    >
                      <FiPackage className="w-5 h-5" />
                      {t('nav.orders')}
                    </Link>
                    <Link
                      to="/wishlist"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-surface-alt transition-colors"
                    >
                      <FiHeart className="w-5 h-5" />
                      {t('nav.wishlist')}
                    </Link>
                    <Link
                      to="/reading-lists"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-surface-alt transition-colors"
                    >
                      <FiBook className="w-5 h-5" />
                      {t('nav.readingLists')}
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-secondary hover:bg-surface-alt transition-colors"
                    >
                      <FiLogOut className="w-5 h-5" />
                      {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 px-4">
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="block text-center py-3 rounded-lg border border-accent text-accent font-medium hover:bg-accent/5 transition-colors"
                    >
                      {t('nav.login')}
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileOpen(false)}
                      className="block text-center py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent-light transition-colors"
                    >
                      {t('nav.register')}
                    </Link>
                  </div>
                )}

                <div className="border-t border-muted/20 my-4" />

                <div className="flex items-center gap-3 px-4 py-2">
                  <LanguageSwitcher />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
