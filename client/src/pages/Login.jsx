import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import SEO from '../components/SEO';
import useLanguageStore from '../stores/useLanguageStore';
import useAuthStore from '../stores/useAuthStore';
import useCartStore from '../stores/useCartStore';
import useWishlistStore from '../stores/useWishlistStore';

const Login = () => {
  const { t } = useLanguageStore();
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blockedModal, setBlockedModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      await Promise.all([
        useCartStore.getState().mergeCartToServer(),
        useWishlistStore.getState().mergeWishlistToServer(),
      ]);
      toast.success(t('auth.loginSuccess'));
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (err.response?.status === 403 && msg.toLowerCase().includes('blocked')) {
        setBlockedModal(true);
      } else {
        toast.error(msg || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Login" noindex />
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md 3xl:max-w-lg">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block text-3xl 3xl:text-4xl font-display font-bold text-foreground tracking-[0.15em] mb-2">
              ARKAAN
            </Link>
            <h1 className="text-xl 3xl:text-2xl font-semibold text-foreground">{t('auth.login')}</h1>
          </div>

          <form onSubmit={handleSubmit} className="bg-surface rounded-2xl p-5 sm:p-8 3xl:p-10 border border-muted/10 shadow-sm">
            <div className="space-y-5">
              <div>
                <label className="block text-sm 3xl:text-base font-medium text-foreground mb-1.5">{t('auth.email')}</label>
                <div className="relative">
                  <FiMail className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full ps-10 pe-4 py-3 bg-background border border-gray-300 rounded-xl text-foreground text-sm 3xl:text-base focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm 3xl:text-base font-medium text-foreground mb-1.5">{t('auth.password')}</label>
                <div className="relative">
                  <FiLock className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full ps-10 pe-10 py-3 bg-background border border-gray-300 rounded-xl text-foreground text-sm 3xl:text-base focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 3xl:py-4 bg-accent text-white font-semibold 3xl:text-base rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50"
              >
                {loading ? t('common.loading') : t('auth.login')}
              </button>
            </div>

            <p className="mt-6 text-center text-sm 3xl:text-base text-foreground/60">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-accent font-medium hover:underline">
                {t('nav.register')}
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Blocked Account Modal */}
      {blockedModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center relative">
            <button
              onClick={() => setBlockedModal(false)}
              className="absolute top-3 right-3 rtl:right-auto rtl:left-3 text-gray-400 hover:text-gray-600"
            >
              <FiX size={18} />
            </button>
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <FiAlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Account Blocked</h3>
            <p className="text-sm text-foreground/60 mb-6">
              Your account has been blocked. Please contact support for assistance.
            </p>
            <button
              onClick={() => setBlockedModal(false)}
              className="w-full py-2.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-light transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
