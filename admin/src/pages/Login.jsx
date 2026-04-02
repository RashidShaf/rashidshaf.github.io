import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../stores/useAuthStore';
import useLanguageStore from '../stores/useLanguageStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const t = useLanguageStore((s) => s.t);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('auth.error'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md 3xl:max-w-lg"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8 3xl:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl 3xl:text-4xl font-bold text-admin-text tracking-wider">
              ARKAAN
            </h1>
            <p className="text-admin-muted mt-1 text-sm 3xl:text-base">{t('auth.login')}</p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 3xl:px-5 3xl:py-3.5 rounded-lg border border-admin-border focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20 outline-none transition-all text-sm 3xl:text-base"
                placeholder="admin@arkaan.com"
              />
            </div>

            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">
                {t('auth.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 3xl:px-5 3xl:py-3.5 rounded-lg border border-admin-border focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20 outline-none transition-all text-sm 3xl:text-base"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 3xl:py-3.5 rounded-lg bg-admin-accent text-white font-semibold text-sm 3xl:text-base hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t('common.loading') : t('auth.signIn')}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
