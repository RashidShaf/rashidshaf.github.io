import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiShoppingCart,
  FiHeart,
  FiUser,
  FiMenu,
  FiX,
  FiChevronDown,
  FiLogOut,
  FiPackage,
} from 'react-icons/fi';
import useLanguageStore from '../../stores/useLanguageStore';
import useCartStore from '../../stores/useCartStore';
import useAuthStore from '../../stores/useAuthStore';
import useWishlistStore from '../../stores/useWishlistStore';
import LanguageSwitcher from './LanguageSwitcher';
import SearchBarWithFilter from './SearchBarWithFilter';
import CategoryBar from './CategoryBar';
import api from '../../utils/api';

const Navbar = () => {
  const { t, language } = useLanguageStore();
  const cartItems = useCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpandedCats, setMobileExpandedCats] = useState({});
  const [accountOpen, setAccountOpen] = useState(false);
  const accountTimeout = useRef(null);

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const handleAccountEnter = () => {
    clearTimeout(accountTimeout.current);
    setAccountOpen(true);
  };

  const handleAccountLeave = () => {
    accountTimeout.current = setTimeout(() => setAccountOpen(false), 200);
  };

  // Fetch categories
  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data || [])).catch(() => {});
  }, []);

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

  const getName = (cat) => language === 'ar' && cat.nameAr ? cat.nameAr : cat.name;

  return (
    <>
      <header className="relative z-50 bg-background border-b border-muted/10">
        {/* Line 1: Logo + Search + Icons */}
        <nav className="mx-auto px-4 sm:px-6 lg:px-6 xl:px-6 3xl:px-12">
          <div className="flex items-center justify-between h-16 lg:h-20 3xl:h-24 gap-3 lg:gap-6">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <img src="/arkaan-text-logo.png" alt="مكتبة أركان - Arkaan Bookstore" className="h-10 lg:h-14 3xl:h-16 w-auto" />
            </Link>

            {/* Search Bar — desktop */}
            <SearchBarWithFilter
              categories={categories}
              className="hidden md:block flex-1 max-w-2xl lg:max-w-3xl"
            />

            {/* Right Side Icons */}
            <div className="flex items-center gap-2 sm:gap-3 3xl:gap-4 flex-shrink-0">
              {/* Language Switcher */}
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>

              {/* Cart */}
              <Link to="/cart" className="relative p-2 text-foreground hover:text-accent transition-colors">
                <FiShoppingCart className="w-5 h-5 3xl:w-6 3xl:h-6" />
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
                  <FiUser className="w-5 h-5 3xl:w-6 3xl:h-6" />
                  <span className="hidden md:inline text-sm 3xl:text-base font-medium">{t('nav.myAccount')}</span>
                  <FiChevronDown className={`w-3 h-3 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-1 ltr:right-0 rtl:left-0 bg-surface border border-muted/20 rounded-xl shadow-xl overflow-hidden min-w-[180px] sm:min-w-[220px] 3xl:min-w-[260px] z-50"
                      onMouseEnter={handleAccountEnter}
                      onMouseLeave={handleAccountLeave}
                    >
                      {user ? (
                        <>
                          <div className="px-4 py-3 3xl:px-5 3xl:py-4 border-b border-muted/10">
                            <p className="text-sm 3xl:text-base font-semibold text-foreground truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs 3xl:text-sm text-foreground/60 truncate">{user.email}</p>
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
                                className="flex items-center gap-3 px-4 py-2.5 3xl:px-5 3xl:py-3 text-sm 3xl:text-base text-foreground hover:bg-surface-alt transition-colors"
                              >
                                <item.icon className="w-4 h-4 3xl:w-5 3xl:h-5 text-foreground/60" />
                                {item.label}
                              </Link>
                            ))}
                          </div>
                          <div className="border-t border-muted/10 py-1">
                            <button
                              onClick={handleLogout}
                              className="flex items-center gap-3 w-full px-4 py-2.5 3xl:px-5 3xl:py-3 text-sm 3xl:text-base text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <FiLogOut className="w-4 h-4 3xl:w-5 3xl:h-5" />
                              {t('nav.logout')}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 3xl:p-5">
                          <Link
                            to="/track-order"
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2 px-3 py-2.5 3xl:py-3 text-sm 3xl:text-base text-foreground/70 hover:text-accent hover:bg-surface-alt rounded-lg transition-colors mb-3"
                          >
                            <FiPackage size={15} /> {t('nav.trackOrder')}
                          </Link>
                          <Link
                            to="/login"
                            onClick={() => setAccountOpen(false)}
                            className="block w-full text-center py-2.5 3xl:py-3 bg-accent text-white text-sm 3xl:text-base font-medium rounded-lg hover:bg-accent-light transition-colors"
                          >
                            {t('nav.login')}
                          </Link>
                          <p className="mt-3 text-center text-xs 3xl:text-sm text-foreground/60">
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
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 text-foreground hover:text-accent transition-colors"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Search Bar */}
        <div className="md:hidden border-t border-muted/10 px-4 py-2">
          <SearchBarWithFilter categories={categories} />
        </div>

        {/* Line 2: Category Bar — inside header */}
        <CategoryBar categories={categories} />
      </header>

      {/* Mobile Category Pills — scrollable strip */}
      {categories.length > 0 && (
        <div className="lg:hidden overflow-x-auto scrollbar-hide px-4 py-2 bg-primary flex gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/books?category=${cat.slug}`}
              className="px-3 py-1.5 text-sm whitespace-nowrap text-white/70 hover:text-white transition-colors"
            >
              {getName(cat)}
            </Link>
          ))}
        </div>
      )}

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
                {/* Categories with expandable sub-categories */}
                {categories.map((corner) => {
                  const hasChildren = corner.children && corner.children.length > 0;
                  const isExpanded = mobileExpandedCats[corner.id];
                  return (
                    <div key={corner.id}>
                      <div className="flex items-center">
                        <Link
                          to={`/books?category=${corner.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className="flex-1 block px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-surface-alt transition-colors"
                        >
                          {getName(corner)}
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
                                    {getName(sub)}
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
                                        {getName(l3)}
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

                <div className="border-t border-muted/20 my-4" />

                {user ? (
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
                ) : (
                  <div className="flex flex-col gap-2 px-4">
                    <Link
                      to="/track-order"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center gap-2 py-3 rounded-lg text-foreground/70 hover:text-accent hover:bg-surface-alt transition-colors font-medium"
                    >
                      <FiPackage size={16} /> {t('nav.trackOrder')}
                    </Link>
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
