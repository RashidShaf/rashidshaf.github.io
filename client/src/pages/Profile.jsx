import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiMapPin, FiSave, FiLock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageTransition from '../animations/PageTransition';
import useLanguageStore from '../stores/useLanguageStore';
import useAuthStore from '../stores/useAuthStore';
import api from '../utils/api';

const Profile = () => {
  const { t, language } = useLanguageStore();
  const { user, updateUser } = useAuthStore();
  const [tab, setTab] = useState('profile');

  const [form, setForm] = useState({
    firstName: user?.firstName || '', lastName: user?.lastName || '',
    phone: user?.phone || '', address: user?.address || '', city: user?.city || '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/auth/me', form);
      updateUser(res.data.user);
      toast.success(language === 'ar' ? 'تم تحديث الملف الشخصي' : 'Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(language === 'ar' ? 'تم تغيير كلمة المرور' : 'Password changed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  const tabs = [
    { id: 'profile', label: t('profile.editProfile'), icon: FiUser },
    { id: 'password', label: t('profile.changePassword'), icon: FiLock },
  ];

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-display font-bold text-foreground mb-6">{t('profile.title')}</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-accent text-white' : 'bg-surface text-muted hover:text-foreground border border-muted/10'}`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleProfile} className="bg-surface rounded-xl border border-muted/10 p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth.firstName')}</label>
                  <input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} className="w-full px-4 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth.lastName')}</label>
                  <input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} className="w-full px-4 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth.email')}</label>
                <div className="relative">
                  <FiMail className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="email" value={user?.email || ''} disabled className="w-full ps-10 pe-4 py-3 bg-surface-alt border border-muted/10 rounded-xl text-muted text-sm cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth.phone') || 'Phone'}</label>
                <div className="relative">
                  <FiPhone className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full ps-10 pe-4 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t('checkout.city')}</label>
                <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} className="w-full px-4 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t('checkout.address')}</label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 rtl:left-auto rtl:right-3 top-3 w-4 h-4 text-muted" />
                  <textarea value={form.address} onChange={(e) => update('address', e.target.value)} rows={3} className="w-full ps-10 pe-4 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent resize-none" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50">
                <FiSave size={16} /> {loading ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </motion.form>
        )}

        {tab === 'password' && (
          <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handlePassword} className="bg-surface rounded-xl border border-muted/10 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t('profile.currentPassword')}</label>
                <input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} required className="w-full px-4 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t('profile.newPassword')}</label>
                <input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))} required minLength={6} className="w-full px-4 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth.confirmPassword')}</label>
                <input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))} required minLength={6} className="w-full px-4 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent" />
              </div>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50">
                <FiLock size={16} /> {loading ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </motion.form>
        )}
      </div>
    </PageTransition>
  );
};

export default Profile;
