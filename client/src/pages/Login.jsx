import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageTransition from '../animations/PageTransition';
import useLanguageStore from '../stores/useLanguageStore';
import useAuthStore from '../stores/useAuthStore';

const Login = () => {
  const { t } = useLanguageStore();
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t('auth.loginSuccess'));
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-block text-3xl font-display font-bold text-foreground tracking-[0.15em] mb-2">
              ARKAAN
            </Link>
            <h1 className="text-xl font-semibold text-foreground">{t('auth.login')}</h1>
          </div>

          <form onSubmit={handleSubmit} className="bg-surface rounded-2xl p-8 border border-muted/10 shadow-sm">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth.email')}</label>
                <div className="relative">
                  <FiMail className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full ps-10 pe-4 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth.password')}</label>
                <div className="relative">
                  <FiLock className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full ps-10 pe-10 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50"
              >
                {loading ? t('common.loading') : t('auth.login')}
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-muted">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-accent font-medium hover:underline">
                {t('nav.register')}
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Login;
