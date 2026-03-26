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
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

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
    <BrowserRouter>
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
          <Route path="users" element={<Users />} />
          <Route path="categories" element={<Categories />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
