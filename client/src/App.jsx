import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import useLanguageStore from './stores/useLanguageStore';

import MainLayout from './components/layout/MainLayout';
import PrivateRoute from './components/common/PrivateRoute';

const Home = lazy(() => import('./pages/Home'));
const Books = lazy(() => import('./pages/Books'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Profile = lazy(() => import('./pages/Profile'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const ReadingLists = lazy(() => import('./pages/ReadingLists'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="books" element={<Books />} />
          <Route path="books/:slug" element={<BookDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route
            path="checkout"
            element={
              <PrivateRoute>
                <Checkout />
              </PrivateRoute>
            }
          />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route
            path="profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="orders"
            element={
              <PrivateRoute>
                <OrderHistory />
              </PrivateRoute>
            }
          />
          <Route
            path="orders/:id"
            element={
              <PrivateRoute>
                <OrderDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="wishlist"
            element={
              <PrivateRoute>
                <Wishlist />
              </PrivateRoute>
            }
          />
          <Route
            path="reading-lists"
            element={
              <PrivateRoute>
                <ReadingLists />
              </PrivateRoute>
            }
          />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AnimatePresence>
    </Suspense>
  );
};

const App = () => {
  const initLanguage = useLanguageStore((s) => s.initLanguage);

  useEffect(() => {
    initLanguage();
  }, [initLanguage]);

  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <ToastContainer
        position="top-right"
        autoClose={1500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </BrowserRouter>
  );
};

export default App;
