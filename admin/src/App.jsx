import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import useAuthStore from './stores/useAuthStore';
import useLanguageStore from './stores/useLanguageStore';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import BookCreate from './pages/BookCreate';
import BookEdit from './pages/BookEdit';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Users from './pages/Users';
import Categories from './pages/Categories';
import CategoryCreate from './pages/CategoryCreate';
import CategoryEdit from './pages/CategoryEdit';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Reviews from './pages/Reviews';
import Settings from './pages/Settings';
import Banners from './pages/Banners';
import DataManagement from './pages/DataManagement';
import HomeLayout from './pages/HomeLayout';

const AdminRoute = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  if (!user || user.role !== 'ADMIN') return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const initLanguage = useLanguageStore((s) => s.initLanguage);

  useEffect(() => {
    initLanguage();
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.VITE_ADMIN_BASE || ''}>
      <ToastContainer position="top-right" autoClose={1500} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="books" element={<Books />} />
          <Route path="books/create" element={<BookCreate />} />
          <Route path="books/:id/edit" element={<BookEdit />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="users" element={<Users />} />
          <Route path="categories" element={<Categories />} />
          <Route path="categories/create" element={<CategoryCreate />} />
          <Route path="categories/:id/edit" element={<CategoryEdit />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="banners" element={<Banners />} />
          <Route path="home-layout" element={<HomeLayout />} />
          <Route path="data" element={<DataManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
