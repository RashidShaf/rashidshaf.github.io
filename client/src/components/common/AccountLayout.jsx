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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Mobile Nav — horizontal pills */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {links.map((link) => {
          const isActive = pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                isActive ? 'bg-accent text-white' : 'bg-surface border border-muted/10 text-foreground/70'
              }`}
            >
              <link.icon size={16} /> {link.label}
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-6 space-y-5">
            {/* User Card */}
            <div className="bg-surface rounded-2xl border border-muted/10 shadow-sm p-6 text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-accent-light text-white text-3xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent/20">
                {initials}
              </div>
              <h2 className="text-xl font-bold text-foreground">{user?.firstName} {user?.lastName}</h2>
              <div className="flex items-center justify-center gap-1.5 mt-1.5 text-sm text-foreground/50">
                <FiMail size={13} />
                <span className="truncate max-w-[180px]">{user?.email}</span>
              </div>
              {memberSince && (
                <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 bg-surface-alt rounded-full text-xs text-foreground/50">
                  <FiCalendar size={11} />
                  <span>{language === 'ar' ? 'عضو منذ' : 'Member since'} {memberSince}</span>
                </div>
              )}
            </div>

            {/* Nav Links */}
            <div className="bg-surface rounded-2xl border border-muted/10 shadow-sm overflow-hidden">
              {links.map((link) => {
                const isActive = pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-3 px-5 py-4 transition-all border-b border-muted/5 last:border-b-0 relative ${
                      isActive ? 'bg-accent/5 text-accent' : 'text-foreground/70 hover:bg-surface-alt hover:text-foreground'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute start-0 top-2 bottom-2 w-[3px] bg-accent rounded-e-full" />
                    )}
                    <link.icon size={18} className={isActive ? 'text-accent' : ''} />
                    <span className="text-sm font-semibold">{link.label}</span>
                  </Link>
                );
              })}

            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AccountLayout;
