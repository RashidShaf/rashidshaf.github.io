import { Link, useLocation } from 'react-router-dom';
import { FiUser, FiPackage, FiHeart, FiBook, FiCalendar, FiMail, FiLock } from 'react-icons/fi';
import useLanguageStore from '../../stores/useLanguageStore';
import useAuthStore from '../../stores/useAuthStore';

const AccountLayout = ({ children }) => {
  const { t, language } = useLanguageStore();
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();

  const initials = `${(user?.firstName || 'U')[0]}${(user?.lastName || '')[0] || ''}`.toUpperCase();
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString(language === 'ar' ? 'ar-QA' : 'en-US', { year: 'numeric', month: 'long' }) : '';

  const links = [
    { to: '/profile', icon: FiUser, label: t('nav.profile') },
    { to: '/orders', icon: FiPackage, label: t('profile.myOrders') },
    { to: '/wishlist', icon: FiHeart, label: t('profile.myWishlist') },
    { to: '/reading-lists', icon: FiBook, label: t('profile.myReadingLists') },
    { to: '/change-password', icon: FiLock, label: t('profile.changePassword') },
  ];

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Mobile Nav */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {links.map((link) => {
          const isActive = pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                isActive ? 'bg-accent text-white' : 'bg-surface border border-muted/10 text-foreground/70'
              }`}
            >
              <link.icon size={16} /> {link.label}
            </Link>
          );
        })}
      </div>

      <div className="flex gap-8">
        {/* Sidebar — always on the physical left */}
        <div className="hidden lg:block w-[280px] flex-shrink-0" style={{ direction: 'ltr' }}>
          <div className="sticky top-6 space-y-4" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
            {/* User Card */}
            <div className="bg-surface rounded-2xl border border-muted/10 shadow-sm p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent-light text-white text-xl font-bold flex items-center justify-center flex-shrink-0 shadow-md shadow-accent/15">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-foreground truncate">{user?.firstName} {user?.lastName}</h2>
                  <p className="text-xs text-foreground/50 truncate flex items-center gap-1">
                    <FiMail size={11} /> {user?.email}
                  </p>
                  {memberSince && (
                    <p className="text-[11px] text-foreground/40 mt-1 flex items-center gap-1">
                      <FiCalendar size={10} /> {language === 'ar' ? 'عضو منذ' : 'Since'} {memberSince}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Nav Links */}
            <div className="bg-surface rounded-2xl border border-muted/10 shadow-sm py-2">
              {links.map((link) => {
                const isActive = pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-3 px-5 py-3 mx-2 rounded-xl transition-all ${
                      isActive
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-foreground/60 hover:bg-surface-alt hover:text-foreground'
                    }`}
                  >
                    <link.icon size={18} />
                    <span className="text-sm font-semibold">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AccountLayout;
