import { useState } from 'react';
import { FiLock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageTransition from '../animations/PageTransition';
import SEO from '../components/SEO';
import AccountLayout from '../components/common/AccountLayout';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const ChangePassword = () => {
  const { t, language } = useLanguageStore();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const inputClass = 'w-full ps-11 3xl:ps-12 pe-4 py-3 3xl:py-4 bg-background border border-gray-300 rounded-xl text-foreground text-sm 3xl:text-base focus:outline-none focus:border-accent transition-colors';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) return toast.error(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
    if (form.newPassword.length < 6) return toast.error(language === 'ar' ? '٦ أحرف على الأقل' : 'Minimum 6 characters');
    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(language === 'ar' ? 'تم تغيير كلمة المرور' : 'Password changed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <PageTransition>
      <SEO title="Change Password" noindex />
      <AccountLayout>
        <h1 className="text-2xl 3xl:text-3xl font-display font-bold text-foreground mb-6">{t('profile.changePassword')}</h1>

        <form onSubmit={handleSubmit}>
          <div className="bg-surface rounded-2xl border border-muted/10 shadow-sm p-6 sm:p-8 3xl:p-10 mb-6">
            <div className="space-y-5">
              <div>
                <label className="block text-sm 3xl:text-base font-semibold text-foreground mb-1.5">{t('profile.currentPassword')}</label>
                <div className="relative">
                  <FiLock className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/25" />
                  <input type="password" value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} required className={inputClass} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm 3xl:text-base font-semibold text-foreground mb-1.5">{t('profile.newPassword')}</label>
                  <div className="relative">
                    <FiLock className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/25" />
                    <input type="password" value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} required minLength={6} className={inputClass} />
                  </div>
                  <p className="text-xs text-foreground/40 mt-1">{language === 'ar' ? '٦ أحرف على الأقل' : 'Minimum 6 characters'}</p>
                </div>
                <div>
                  <label className="block text-sm 3xl:text-base font-semibold text-foreground mb-1.5">{t('auth.confirmPassword')}</label>
                  <div className="relative">
                    <FiLock className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/25" />
                    <input type="password" value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} required minLength={6} className={inputClass} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="flex items-center gap-2 px-8 py-3 3xl:px-10 3xl:py-4 bg-accent text-white font-semibold 3xl:text-base rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50 shadow-sm shadow-accent/20">
            <FiLock size={16} /> {loading ? t('common.loading') : t('common.save')}
          </button>
        </form>
      </AccountLayout>
    </PageTransition>
  );
};

export default ChangePassword;
