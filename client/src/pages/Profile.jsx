import { useState } from 'react';
import { FiMail, FiPhone, FiMapPin, FiSave } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageTransition from '../animations/PageTransition';
import PhoneInput from '../components/common/PhoneInput';
import AccountLayout from '../components/common/AccountLayout';
import useLanguageStore from '../stores/useLanguageStore';
import useAuthStore from '../stores/useAuthStore';
import api from '../utils/api';

const Profile = () => {
  const { t, language } = useLanguageStore();
  const { user, updateUser } = useAuthStore();

  const [form, setForm] = useState({
    firstName: user?.firstName || '', lastName: user?.lastName || '',
    phone: user?.phone || '', address: user?.address || '', city: user?.city || '',
  });
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
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

  const inputClass = 'w-full px-4 py-3 bg-background border border-muted/15 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent transition-colors';
  const iconInputClass = `${inputClass} ps-11`;
  const labelClass = 'block text-sm font-semibold text-foreground mb-1.5';

  return (
    <PageTransition>
      <AccountLayout>
        <h1 className="text-2xl font-display font-bold text-foreground mb-6">{t('profile.editProfile')}</h1>

        <form onSubmit={handleSubmit}>
          {/* Personal Info */}
          <div className="bg-surface rounded-2xl border border-muted/10 shadow-sm p-6 sm:p-8 mb-6">
            <h3 className="text-base font-bold text-foreground mb-5">{language === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('auth.firstName')}</label>
                <input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('auth.lastName')}</label>
                <input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-surface rounded-2xl border border-muted/10 shadow-sm p-6 sm:p-8 mb-6">
            <h3 className="text-base font-bold text-foreground mb-5">{language === 'ar' ? 'معلومات الاتصال' : 'Contact Information'}</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t('auth.email')}</label>
                <div className="relative">
                  <FiMail className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/25" />
                  <input type="email" value={user?.email || ''} disabled className="w-full ps-11 pe-4 py-3 bg-surface-alt border border-muted/10 rounded-xl text-foreground/40 text-sm cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('checkout.phone')}</label>
                <PhoneInput value={form.phone} onChange={(val) => update('phone', val)} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-surface rounded-2xl border border-muted/10 shadow-sm p-6 sm:p-8 mb-6">
            <h3 className="text-base font-bold text-foreground mb-5">{language === 'ar' ? 'العنوان' : 'Address'}</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t('checkout.city')}</label>
                <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('checkout.address')}</label>
                <div className="relative">
                  <FiMapPin className="absolute start-4 top-3.5 w-4 h-4 text-foreground/25" />
                  <textarea value={form.address} onChange={(e) => update('address', e.target.value)} rows={3} className={`${iconInputClass} resize-none`} />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="flex items-center gap-2 px-8 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50 shadow-sm shadow-accent/20">
            <FiSave size={16} /> {loading ? t('common.loading') : t('common.save')}
          </button>
        </form>
      </AccountLayout>
    </PageTransition>
  );
};

export default Profile;
