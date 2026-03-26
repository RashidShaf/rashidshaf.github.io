import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import useAuthStore from './stores/useAuthStore';
import useLanguageStore from './stores/useLanguageStore';
import AdminLayout from './components/layout/AdminLayout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Books = lazy(() => import('./pages/Books'));
const BookCreate = lazy(() => import('./pages/BookCreate'));
const BookEdit = lazy(() => import('./pages/BookEdit'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Users = lazy(() => import('./pages/Users'));
const Categories = lazy(() => import('./pages/Categories'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-3 border-admin-accent/30 border-t-admin-accent rounded-full animate-spin" />
  </div>
);

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
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
