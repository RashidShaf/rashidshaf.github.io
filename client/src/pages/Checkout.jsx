import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMapPin, FiUser, FiFileText, FiCheck, FiShoppingBag, FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageTransition from '../animations/PageTransition';
import PhoneInput from '../components/common/PhoneInput';
import useLanguageStore from '../stores/useLanguageStore';
import useCartStore from '../stores/useCartStore';
import useAuthStore from '../stores/useAuthStore';
import { formatPrice } from '../utils/formatters';
import api from '../utils/api';

const Checkout = () => {
  const { t, language } = useLanguageStore();
  const { items, getTotal, clearCart } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    shippingName: user ? `${user.firstName} ${user.lastName}` : '',
    shippingPhone: user?.phone || '',
    shippingAddress: user?.address || '',
    shippingCity: user?.city || '',
    shippingNotes: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [shippingConfig, setShippingConfig] = useState({ threshold: 100, cost: 15 });

  useEffect(() => {
    api.get('/settings/public').then((res) => {
      const data = res.data;
      setShippingConfig({
        threshold: parseFloat(data.shippingThreshold) || 100,
        cost: parseFloat(data.shippingCost) || 15,
      });
    }).catch(() => {});
  }, []);

  const total = getTotal();
  const shipping = total >= shippingConfig.threshold ? 0 : shippingConfig.cost;
  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const inputClass = 'w-full ps-11 pe-4 py-3 bg-background border border-gray-300 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent transition-colors';

  if (items.length === 0 && !success) {
    navigate('/cart');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/orders', {
        ...form,
        cartItems: items.map((item) => ({ bookId: item.bookId, quantity: item.quantity })),
      });
      setSuccess(res.data.order);
      clearCart();
      window.scrollTo({ top: 0, behavior: 'instant' });
      toast.success(t('checkout.orderSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('checkout.orderFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PageTransition>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-8"
          >
            <FiCheck className="w-12 h-12 text-emerald-600" />
          </motion.div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">
            {t('checkout.orderPlaced')}
          </h1>
          <p className="text-foreground/60 mb-1">
            {t('checkout.orderNumber')}
          </p>
          <p className="text-xl font-bold text-accent mb-2">{success.orderNumber}</p>
          <p className="text-sm text-foreground/50 mb-10">{t('checkout.codNote')}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto">
            <Link to="/orders" className="text-center px-8 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-light transition-colors text-sm sm:text-base">
              {t('orders.track')}
            </Link>
            <Link to="/books" className="text-center px-8 py-3 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary hover:text-white transition-colors text-sm sm:text-base">
              {t('cart.continueShopping')}
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/cart" className="inline-flex items-center gap-2 text-2xl font-display font-bold text-foreground hover:text-accent transition-colors mb-8">
          {language === 'ar' ? <FiArrowRight size={22} /> : <FiArrowLeft size={22} />} {t('checkout.title')}
        </Link>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left — Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping */}
              <div className="bg-surface rounded-2xl border border-muted/10 p-4 sm:p-8">
                <h2 className="text-lg font-bold text-foreground mb-6">{t('checkout.shippingInfo')}</h2>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">{t('checkout.name')}</label>
                      <div className="relative">
                        <FiUser className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                        <input type="text" value={form.shippingName} onChange={(e) => update('shippingName', e.target.value)} required className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">{t('checkout.phone')}</label>
                      <PhoneInput value={form.shippingPhone} onChange={(val) => update('shippingPhone', val)} required />
                      <p className="text-[11px] text-foreground/40 mt-1">{t('checkout.phoneNote')}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">{t('checkout.city')}</label>
                    <input type="text" value={form.shippingCity} onChange={(e) => update('shippingCity', e.target.value)} required className="w-full px-4 py-3 bg-background border border-gray-300 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">{t('checkout.address')}</label>
                    <div className="relative">
                      <FiMapPin className="absolute start-4 top-3.5 w-4 h-4 text-foreground/30" />
                      <textarea value={form.shippingAddress} onChange={(e) => update('shippingAddress', e.target.value)} required rows={3} className={`${inputClass} resize-none`} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">{t('checkout.notes')}</label>
                    <div className="relative">
                      <FiFileText className="absolute start-4 top-3.5 w-4 h-4 text-foreground/30" />
                      <textarea value={form.shippingNotes} onChange={(e) => update('shippingNotes', e.target.value)} rows={2} className={`${inputClass} resize-none`} />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right — Summary */}
            <div className="lg:col-span-1">
              <div className="bg-surface rounded-2xl border border-muted/10 p-4 sm:p-6 sticky top-6">
                <h2 className="text-lg font-bold text-foreground mb-5">{t('checkout.orderSummary')}</h2>

                <div className="space-y-3 mb-5">
                  {items.map((item) => {
                    const cover = item.book.coverImage ? `${API_BASE}/${item.book.coverImage}` : null;
                    return (
                      <div key={item.bookId} className="flex items-center gap-3">
                        <div className="w-10 h-13 rounded-lg overflow-hidden bg-surface-alt flex-shrink-0">
                          {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-accent/30">{item.book.title?.[0]}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium line-clamp-1">
                            {language === 'ar' && item.book.titleAr ? item.book.titleAr : item.book.title}
                          </p>
                          <p className="text-xs text-foreground/40">x{item.quantity}</p>
                        </div>
                        <p className="text-sm font-bold text-foreground flex-shrink-0">{formatPrice(parseFloat(item.book.price) * item.quantity)}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-gray-300 pt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/50">{t('cart.subtotal')}</span>
                    <span className="font-medium text-foreground">{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/50">{t('cart.shipping')}</span>
                    <span className="font-medium text-foreground">{shipping === 0 ? t('cart.freeShipping') : formatPrice(shipping)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-3 flex justify-between">
                    <span className="font-bold text-foreground">{t('cart.total')}</span>
                    <span className="font-extrabold text-xl text-foreground">{formatPrice(total + shipping)}</span>
                  </div>
                </div>

                {/* COD Info */}
                <div className="flex items-center gap-3 p-3 bg-accent/5 border border-gray-300 rounded-xl mt-4">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    COD
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t('cart.codTitle')}</p>
                    <p className="text-xs text-foreground/50">{t('checkout.codNote')}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 py-3.5 bg-accent text-white font-bold rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiShoppingBag size={18} />
                  {loading ? t('common.loading') : t('checkout.placeOrder')}
                </button>

                {shipping > 0 && (
                  <p className="text-xs text-foreground/40 text-center mt-3">
                    {t('cart.freeShippingThreshold', { amount: shippingConfig.threshold })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </PageTransition>
  );
};

export default Checkout;
