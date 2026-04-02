import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiUser, FiPhone, FiEye, FiEyeOff } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageTransition from '../animations/PageTransition';
import PhoneInput from '../components/common/PhoneInput';
import useLanguageStore from '../stores/useLanguageStore';
import useAuthStore from '../stores/useAuthStore';

const Register = () => {
  const { t } = useLanguageStore();
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    try {
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, password: form.password });
      toast.success(t('auth.registerSuccess'));
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md 3xl:max-w-lg">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block text-3xl 3xl:text-4xl font-display font-bold text-foreground tracking-[0.15em] mb-2">
              ARKAAN
            </Link>
            <h1 className="text-xl 3xl:text-2xl font-semibold text-foreground">{t('auth.register')}</h1>
          </div>

          <form onSubmit={handleSubmit} className="bg-surface rounded-2xl p-5 sm:p-8 3xl:p-10 border border-muted/10 shadow-sm">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm 3xl:text-base font-medium text-foreground mb-1.5">{t('auth.firstName')}</label>
                  <div className="relative">
                    <FiUser className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60" />
                    <input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required className="w-full ps-10 pe-4 py-3 bg-background border border-gray-300 rounded-xl text-foreground text-sm 3xl:text-base focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm 3xl:text-base font-medium text-foreground mb-1.5">{t('auth.lastName')}</label>
                  <input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required className="w-full px-4 py-3 bg-background border border-gray-300 rounded-xl text-foreground text-sm 3xl:text-base focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" />
                </div>
              </div>

              <div>
                <label className="block text-sm 3xl:text-base font-medium text-foreground mb-1.5">{t('auth.email')}</label>
                <div className="relative">
                  <FiMail className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60" />
                  <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required className="w-full ps-10 pe-4 py-3 bg-background border border-gray-300 rounded-xl text-foreground text-sm 3xl:text-base focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" placeholder="email@example.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm 3xl:text-base font-medium text-foreground mb-1.5">{t('auth.phone') || 'Phone'}</label>
                <PhoneInput value={form.phone} onChange={(val) => update('phone', val)} />
              </div>

              <div>
                <label className="block text-sm 3xl:text-base font-medium text-foreground mb-1.5">{t('auth.password')}</label>
                <div className="relative">
                  <FiLock className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60" />
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={6} className="w-full ps-10 pe-10 py-3 bg-background border border-gray-300 rounded-xl text-foreground text-sm 3xl:text-base focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground">
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm 3xl:text-base font-medium text-foreground mb-1.5">{t('auth.confirmPassword')}</label>
                <div className="relative">
                  <FiLock className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60" />
                  <input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required minLength={6} className="w-full ps-10 pe-4 py-3 bg-background border border-gray-300 rounded-xl text-foreground text-sm 3xl:text-base focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" placeholder="••••••••" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-3 3xl:py-4 bg-accent text-white font-semibold 3xl:text-base rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50">
                {loading ? t('common.loading') : t('auth.register')}
              </button>
            </div>

            <p className="mt-6 text-center text-sm 3xl:text-base text-foreground/60">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="text-accent font-medium hover:underline">{t('nav.login')}</Link>
            </p>
          </form>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Register;
