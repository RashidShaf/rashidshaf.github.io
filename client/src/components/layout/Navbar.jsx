import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
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
} from 'react-icons/fi';
import useLanguageStore from '../../stores/useLanguageStore';
import useCartStore from '../../stores/useCartStore';
import useAuthStore from '../../stores/useAuthStore';
import useWishlistStore from '../../stores/useWishlistStore';
import LanguageSwitcher from './LanguageSwitcher';
import api from '../../utils/api';

const Navbar = () => {
  const { t, language } = useLanguageStore();
  const cartItems = useCartStore((s) => s.items);
  const wishlistItems = useWishlistStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [corners, setCorners] = useState([]);
  const currentCorner = searchParams.get('corner') || (corners.length > 0 ? corners[0].slug : 'books');
  const [cornerOpen, setCornerOpen] = useState(false);
  const cornerRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpandedCats, setMobileExpandedCats] = useState({});
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const accountTimeout = useRef(null);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
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
      const inDesktop = searchRef.current && searchRef.current.contains(e.target);
      const inMobile = mobileSearchRef.current && mobileSearchRef.current.contains(e.target);
      if (!inDesktop && !inMobile) {
        closeSuggestions();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const wCount = wishlistItems.length;

  const handleAccountEnter = () => {
    clearTimeout(accountTimeout.current);
    setAccountOpen(true);
  };

  const handleAccountLeave = () => {
    accountTimeout.current = setTimeout(() => setAccountOpen(false), 200);
  };

  // Fetch corners
  useEffect(() => {
    api.get('/categories').then((res) => setCorners(res.data || [])).catch(() => {});
  }, []);

  // Close corner dropdown on click outside
  useEffect(() => {
    const handleClick = (e) => { if (cornerRef.current && !cornerRef.current.contains(e.target)) setCornerOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedCorner = corners.find((c) => c.slug === currentCorner) || corners[0];
  const selectedCornerName = selectedCorner ? (language === 'ar' && selectedCorner.nameAr ? selectedCorner.nameAr : selectedCorner.name) : '';

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [navigate]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);


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
    `relative px-1 py-2 text-sm font-medium tracking-wide 3xl:text-lg transition-colors hover:text-accent ${
      isActive ? 'text-accent' : 'text-foreground'
    }`;

  return (
    <>
      <header
        className="relative z-50 bg-background border-b border-muted/10"
      >
        <nav className="mx-auto px-4 sm:px-6 lg:px-6 xl:px-6 3xl:px-12">
          <div className="flex items-center justify-between h-16 lg:h-20 3xl:h-24">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <img src="/arkaan-text-logo.png" alt="مكتبة أركان - Arkaan Bookstore" className="h-10 lg:h-14 3xl:h-16 w-auto" />
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-8">
              <NavLink to="/" className={linkClass} end>{t('nav.home')}</NavLink>

              {/* Selected corner with mega menu on hover */}
              <div
                className="relative"
                onMouseEnter={() => setCornerOpen(true)}
                onMouseLeave={() => setCornerOpen(false)}
              >
                <NavLink to={`/books?category=${selectedCorner?.slug || 'books'}`} className={({ isActive }) => `relative px-1 py-2 text-sm font-medium tracking-wide transition-colors hover:text-accent flex items-center gap-1 ${isActive ? 'text-accent' : 'text-foreground'}`}>
                  {selectedCornerName || t('nav.books')}
                  <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${cornerOpen ? 'rotate-180' : ''}`} />
                </NavLink>
                {cornerOpen && (
                  <div className="absolute top-full mt-0 left-1/2 -translate-x-1/2 bg-surface border border-muted/15 rounded-2xl shadow-2xl z-50 p-6 w-[min(90vw,900px)]">
                    <div className="grid grid-cols-4 gap-x-6 gap-y-5">
                      {corners.filter((c) => c.children && c.children.length > 0).map((corner) => (
                        <div key={corner.id}>
                          <Link
                            to={`/books?category=${corner.slug}`}
                            onClick={() => setCornerOpen(false)}
                            className="text-sm 3xl:text-lg font-semibold text-primary border-b border-primary/20 pb-1.5 mb-2 block hover:text-accent transition-colors"
                          >
                            {language === 'ar' && corner.nameAr ? corner.nameAr : corner.name}
                          </Link>
                          <div className="mt-1.5 space-y-0.5">
                            {corner.children.slice(0, 6).map((sub) => (
                              <div key={sub.id}>
                                <Link
                                  to={`/books?category=${sub.slug}`}
                                  onClick={() => setCornerOpen(false)}
                                  className="block text-[13px] 3xl:text-base text-foreground/60 hover:text-accent transition-colors py-0.5"
                                >
                                  {language === 'ar' && sub.nameAr ? sub.nameAr : sub.name}
                                </Link>
                                {sub.children && sub.children.length > 0 && (
                                  <div className="ps-3 space-y-0">
                                    {sub.children.slice(0, 4).map((l3) => (
                                      <Link
                                        key={l3.id}
                                        to={`/books?category=${l3.slug}`}
                                        onClick={() => setCornerOpen(false)}
                                        className="block text-[11.5px] text-foreground/40 hover:text-accent transition-colors py-0.5"
                                      >
                                        {language === 'ar' && l3.nameAr ? l3.nameAr : l3.name}
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                            <Link
                              to={`/books?category=${corner.slug}`}
                              onClick={() => setCornerOpen(false)}
                              className="block text-[13px] 3xl:text-base text-accent hover:text-accent-light transition-colors py-0.5 mt-1 font-medium"
                            >
                              {language === 'ar' ? 'تصفح الكل ←' : 'Browse All →'}
                            </Link>
                          </div>
                        </div>
                      ))}
                      {/* Standalone categories (no children) */}
                      {corners.filter((c) => !c.children || c.children.length === 0).length > 0 && (
                        <div>
                          <span className="text-sm 3xl:text-lg font-semibold text-primary border-b border-primary/20 pb-1.5 mb-2 block">
                            {language === 'ar' ? 'المزيد' : 'More'}
                          </span>
                          <div className="mt-1.5 space-y-0.5">
                            {corners.filter((c) => !c.children || c.children.length === 0).map((corner) => (
                              <Link
                                key={corner.id}
                                to={`/books?category=${corner.slug}`}
                                onClick={() => setCornerOpen(false)}
                                className="block text-[13px] 3xl:text-base text-foreground/60 hover:text-accent transition-colors py-0.5"
                              >
                                {language === 'ar' && corner.nameAr ? corner.nameAr : corner.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {[
                { to: '/about', label: t('nav.about') },
                { to: '/contact', label: t('nav.contact') },
              ].map((link) => (
                <NavLink key={link.to} to={link.to} className={linkClass}>
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
                    className="w-48 lg:w-56 3xl:w-72 px-4 py-2 ps-10 bg-surface border border-gray-300 rounded-full text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent transition-colors"
                  />
                  <FiSearch className="absolute start-3.5 w-4 h-4 text-muted/50 pointer-events-none" />
                </form>

                {/* Suggestions Dropdown */}
                {showSuggestions && (
                  <div className="absolute top-full mt-2 w-[calc(100vw-2rem)] sm:w-72 left-0 sm:left-auto bg-surface border border-muted/15 rounded-xl shadow-xl z-50 overflow-hidden">
                    {loadingSuggestions ? (
                      <div className="px-4 py-6 text-center">
                        <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
                      </div>
                    ) : suggestions.length === 0 ? (
                      <div className="px-4 py-4 text-center text-sm text-foreground/60">
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
                              <p className="text-xs text-foreground/60 line-clamp-1">{item.author}</p>
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
                      className="absolute top-full mt-1 ltr:right-0 rtl:left-0 bg-surface border border-muted/20 rounded-xl shadow-xl overflow-hidden min-w-[180px] sm:min-w-[220px] z-50"
                      onMouseEnter={handleAccountEnter}
                      onMouseLeave={handleAccountLeave}
                    >
                      {user ? (
                        <>
                          <div className="px-4 py-3 border-b border-muted/10">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-foreground/60 truncate">{user.email}</p>
                          </div>
                          <div className="py-1">
                            {[
                              { to: '/profile', icon: FiUser, label: t('nav.profile') },
                              { to: '/orders', icon: FiPackage, label: t('nav.orders') },
                              { to: '/wishlist', icon: FiHeart, label: t('nav.wishlist') },
                            ].map((item) => (
                              <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setAccountOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-surface-alt transition-colors"
                              >
                                <item.icon className="w-4 h-4 text-foreground/60" />
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
                          <p className="mt-3 text-center text-xs text-foreground/60">
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
      </header>

      {/* Mobile Search Bar */}
      <div ref={mobileSearchRef} className="md:hidden bg-background border-b border-muted/10 px-4 py-2 relative z-40">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              navigate(`/books?search=${encodeURIComponent(searchQuery.trim())}`);
              setSearchQuery('');
              closeSuggestions();
            }
          }}
          className="relative"
        >
          <FiSearch className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && closeSuggestions()}
            placeholder={t('books.search')}
            className="w-full px-4 py-2.5 ps-10 bg-surface border border-gray-300 rounded-full text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent transition-colors"
          />
        </form>
        {showSuggestions && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-surface border border-muted/15 rounded-xl shadow-2xl overflow-hidden z-50">
            {loadingSuggestions ? (
              <div className="px-4 py-4 text-center"><div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" /></div>
            ) : suggestions.length === 0 ? (
              <div className="px-4 py-3 text-center text-sm text-foreground/60">{t('common.noResults')}</div>
            ) : (
              <div className="py-1">
                {suggestions.map((item) => (
                  <button key={item.id} onClick={() => handleSuggestionClick(item.slug)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-alt transition-colors text-start">
                    {item.cover ? <img src={item.cover} alt="" className="w-9 h-12 rounded object-cover bg-surface-alt flex-shrink-0" /> : <div className="w-9 h-12 rounded bg-surface-alt flex-shrink-0 flex items-center justify-center text-accent/30 font-bold text-xs">{item.title?.charAt(0)}</div>}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                      <p className="text-xs text-foreground/60 line-clamp-1">{item.author}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
                {/* Nav Links */}
                <NavLink to="/" end onClick={() => setMobileOpen(false)} className={({ isActive }) => `block px-4 py-3 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-accent/10 text-accent' : 'text-foreground hover:bg-surface-alt'}`}>
                  {t('nav.home')}
                </NavLink>

                {/* Categories — Books first, then others with expandable sub-categories */}
                {corners.map((corner) => {
                  const hasChildren = corner.children && corner.children.length > 0;
                  const isExpanded = mobileExpandedCats[corner.id];
                  const cornerName = language === 'ar' && corner.nameAr ? corner.nameAr : corner.name;
                  return (
                    <div key={corner.id}>
                      <div className="flex items-center">
                        <Link
                          to={`/books?category=${corner.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className="flex-1 block px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-surface-alt transition-colors"
                        >
                          {cornerName}
                        </Link>
                        {hasChildren && (
                          <button
                            onClick={() => setMobileExpandedCats((prev) => ({ ...prev, [corner.id]: !prev[corner.id] }))}
                            className="p-3 text-foreground/60 hover:text-foreground transition-colors"
                          >
                            <FiChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                      {hasChildren && isExpanded && (
                        <div className="ps-6 pb-1 space-y-0.5">
                          {corner.children.map((sub) => {
                            const subHasChildren = sub.children && sub.children.length > 0;
                            const subExpanded = mobileExpandedCats[sub.id];
                            return (
                              <div key={sub.id}>
                                <div className="flex items-center">
                                  <Link
                                    to={`/books?category=${sub.slug}`}
                                    onClick={() => setMobileOpen(false)}
                                    className="flex-1 block px-4 py-2 rounded-lg text-sm text-foreground/60 hover:text-accent hover:bg-surface-alt transition-colors"
                                  >
                                    {language === 'ar' && sub.nameAr ? sub.nameAr : sub.name}
                                  </Link>
                                  {subHasChildren && (
                                    <button
                                      onClick={() => setMobileExpandedCats((prev) => ({ ...prev, [sub.id]: !prev[sub.id] }))}
                                      className="p-2 text-foreground/40 hover:text-foreground transition-colors"
                                    >
                                      <FiChevronDown size={14} className={`transition-transform ${subExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                  )}
                                </div>
                                {subHasChildren && subExpanded && (
                                  <div className="ps-6 pb-0.5 space-y-0.5">
                                    {sub.children.map((l3) => (
                                      <Link
                                        key={l3.id}
                                        to={`/books?category=${l3.slug}`}
                                        onClick={() => setMobileOpen(false)}
                                        className="block px-4 py-1.5 rounded-lg text-[13px] text-foreground/45 hover:text-accent hover:bg-surface-alt transition-colors"
                                      >
                                        {language === 'ar' && l3.nameAr ? l3.nameAr : l3.name}
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                <NavLink to="/about" onClick={() => setMobileOpen(false)} className={({ isActive }) => `block px-4 py-3 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-accent/10 text-accent' : 'text-foreground hover:bg-surface-alt'}`}>
                  {t('nav.about')}
                </NavLink>
                <NavLink to="/contact" onClick={() => setMobileOpen(false)} className={({ isActive }) => `block px-4 py-3 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-accent/10 text-accent' : 'text-foreground hover:bg-surface-alt'}`}>
                  {t('nav.contact')}
                </NavLink>

                <div className="border-t border-muted/20 my-4" />

                {user ? (
                  <>
                    <div className="bg-surface-alt rounded-xl p-3">
                      <div className="flex items-center gap-3 px-2 py-2 mb-1">
                        <div className="w-9 h-9 rounded-full bg-accent text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{user.firstName} {user.lastName}</p>
                          <p className="text-[11px] text-foreground/60 truncate">{user.email}</p>
                        </div>
                      </div>
                      {[
                        { to: '/profile', icon: FiUser, label: t('nav.profile') },
                        { to: '/orders', icon: FiPackage, label: t('nav.orders') },
                        { to: '/wishlist', icon: FiHeart, label: t('nav.wishlist') },
                      ].map((item) => (
                        <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground/80 hover:bg-background transition-colors text-sm">
                          <item.icon className="w-4 h-4" /> {item.label}
                        </Link>
                      ))}
                      <button
                        onClick={() => { handleLogout(); setMobileOpen(false); }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-500 hover:bg-background transition-colors text-sm mt-1"
                      >
                        <FiLogOut className="w-4 h-4" /> {t('nav.logout')}
                      </button>
                    </div>
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
