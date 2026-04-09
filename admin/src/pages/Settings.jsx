import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSave } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const defaultSettings = {
  storeName: '',
  storeNameAr: '',
  storeEmail: '',
  storePhone: '',
  storeAddress: '',
  storeAddressAr: '',
  shippingThreshold: '',
  shippingCost: '',
  instagram: '',
  whatsapp: '',
  facebook: '',
  tiktok: '',
  twitter: '',
  linkedin: '',
  pinterest: '',
};

const inputClass = 'w-full px-4 py-2.5 3xl:px-5 3xl:py-3 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent';

export default function Settings() {
  const t = useLanguageStore((s) => s.t);
  const [form, setForm] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings().finally(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      const data = res.data.data || res.data;
      if (Array.isArray(data)) {
        const mapped = {};
        data.forEach((item) => { if (item.key in defaultSettings) mapped[item.key] = item.value || ''; });
        setForm((prev) => ({ ...prev, ...mapped }));
      } else if (typeof data === 'object') {
        const mapped = {};
        Object.keys(defaultSettings).forEach((key) => { if (data[key] !== undefined) mapped[key] = data[key] || ''; });
        setForm((prev) => ({ ...prev, ...mapped }));
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', form);
      toast.success(t('common.savedSuccess'));
    } catch (err) {
      toast.error(t('common.saveFailed'));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
              <div className="h-6 w-40 bg-gray-100 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                <div className="h-10 bg-gray-100 rounded animate-pulse" />
                <div className="h-10 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="space-y-6 3xl:space-y-8 max-w-3xl">
        {/* Store Information */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
          <h2 className="text-lg 3xl:text-xl font-bold text-admin-text mb-4">{t('settings.storeInfo')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 3xl:gap-6">
            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('settings.storeNameEn')}</label>
              <input type="text" value={form.storeName} onChange={(e) => handleChange('storeName', e.target.value)} placeholder="Arkaan Bookstore" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('settings.storeNameAr')}</label>
              <input type="text" value={form.storeNameAr} onChange={(e) => handleChange('storeNameAr', e.target.value)} placeholder="مكتبة أركان" dir="rtl" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('common.email')}</label>
              <input type="email" value={form.storeEmail} onChange={(e) => handleChange('storeEmail', e.target.value)} placeholder="info@arkaan.qa" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('settings.phone')}</label>
              <input type="tel" value={form.storePhone} onChange={(e) => handleChange('storePhone', e.target.value)} placeholder="+974 1234 5678" className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('settings.address')}</label>
              <input type="text" value={form.storeAddress} onChange={(e) => handleChange('storeAddress', e.target.value)} placeholder="Doha, Qatar" className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('settings.addressAr')}</label>
              <input type="text" value={form.storeAddressAr} onChange={(e) => handleChange('storeAddressAr', e.target.value)} placeholder="الدوحة، قطر" className={inputClass} dir="rtl" />
            </div>
          </div>
        </div>

        {/* Shipping Configuration */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
          <h2 className="text-lg 3xl:text-xl font-bold text-admin-text mb-4">{t('settings.shippingConfig')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 3xl:gap-6">
            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('settings.freeShippingThreshold')}</label>
              <input type="number" value={form.shippingThreshold} onChange={(e) => handleChange('shippingThreshold', e.target.value)} placeholder="200" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('settings.flatShippingRate')}</label>
              <input type="number" value={form.shippingCost} onChange={(e) => handleChange('shippingCost', e.target.value)} placeholder="15" className={inputClass} />
            </div>
          </div>
          <p className="text-xs text-admin-muted mt-3">{t('settings.shippingHelp')}</p>
        </div>

        {/* Social Media Links */}
        <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
          <h2 className="text-lg 3xl:text-xl font-bold text-admin-text mb-4">{t('settings.socialMedia')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 3xl:gap-6">
            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('settings.instagram')}</label>
              <input type="text" value={form.instagram} onChange={(e) => handleChange('instagram', e.target.value)} placeholder="https://instagram.com/arkaan" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('settings.whatsapp')}</label>
              <input type="text" value={form.whatsapp} onChange={(e) => handleChange('whatsapp', e.target.value)} placeholder="+974 1234 5678" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('settings.facebook')}</label>
              <input type="text" value={form.facebook} onChange={(e) => handleChange('facebook', e.target.value)} placeholder="https://facebook.com/arkaan" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('settings.tiktok')}</label>
              <input type="text" value={form.tiktok} onChange={(e) => handleChange('tiktok', e.target.value)} placeholder="https://tiktok.com/@arkaan" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('settings.twitter')}</label>
              <input type="text" value={form.twitter} onChange={(e) => handleChange('twitter', e.target.value)} placeholder="https://x.com/arkaan" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('settings.linkedin')}</label>
              <input type="text" value={form.linkedin} onChange={(e) => handleChange('linkedin', e.target.value)} placeholder="https://linkedin.com/company/arkaan" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('settings.pinterest')}</label>
              <input type="text" value={form.pinterest} onChange={(e) => handleChange('pinterest', e.target.value)} placeholder="https://pinterest.com/arkaan" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 3xl:px-8 3xl:py-3 bg-admin-accent text-white rounded-lg text-sm 3xl:text-base font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50">
            <FiSave size={16} />
            {saving ? t('common.saving') : t('settings.saveSettings')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
