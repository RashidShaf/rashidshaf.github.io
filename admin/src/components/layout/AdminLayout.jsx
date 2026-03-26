import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome,
  FiBook,
  FiShoppingBag,
  FiUsers,
  FiLayers,
  FiPackage,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
} from 'react-icons/fi';
import useAuthStore from '../../stores/useAuthStore';
import useLanguageStore from '../../stores/useLanguageStore';
import Header from './Header';

const navItems = [
  { path: '/', icon: FiHome, labelKey: 'nav.dashboard', end: true },
  { path: '/books', icon: FiBook, labelKey: 'nav.books' },
  { path: '/orders', icon: FiShoppingBag, labelKey: 'nav.orders' },
  { path: '/users', icon: FiUsers, labelKey: 'nav.users' },
  { path: '/categories', icon: FiLayers, labelKey: 'nav.categories' },
  { path: '/inventory', icon: FiPackage, labelKey: 'nav.inventory' },
  { path: '/reports', icon: FiBarChart2, labelKey: 'nav.reports' },
  { path: '/settings', icon: FiSettings, labelKey: 'nav.settings' },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const t = useLanguageStore((s) => s.t);
  const isRTL = useLanguageStore((s) => s.isRTL);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
        <span className="text-lg font-bold text-white tracking-wider">
          ARKAAN <span className="text-admin-accent">ADMIN</span>
        </span>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-white/60 hover:text-white"
        >
          <FiX size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-admin-accent text-white'
                  : 'text-white/60 hover:text-white hover:bg-sidebar-hover'
              }`
            }
          >
            <item.icon size={18} />
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-sidebar-hover transition-colors"
        >
          <FiLogOut size={18} />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-admin-bg">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block fixed top-0 ${isRTL ? 'right-0' : 'left-0'} h-full w-64 bg-sidebar z-30`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: isRTL ? 256 : -256 }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? 256 : -256 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} h-full w-64 bg-sidebar z-50 lg:hidden`}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={`${isRTL ? 'lg:mr-64' : 'lg:ml-64'}`}>
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
