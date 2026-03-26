import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMapPin, FiPhone, FiUser, FiFileText, FiCheck } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageTransition from '../animations/PageTransition';
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

  const total = getTotal();
  const shipping = total >= 100 ? 0 : 15;
  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  if (items.length === 0 && !success) {
    navigate('/cart');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/orders', form);
      setSuccess(res.data.order);
      clearCart();
      toast.success(language === 'ar' ? 'تم تقديم الطلب بنجاح!' : 'Order placed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <PageTransition>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-6"
          >
            <FiCheck className="w-10 h-10 text-secondary" />
          </motion.div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            {language === 'ar' ? 'تم تقديم طلبك!' : 'Order Placed!'}
          </h1>
          <p className="text-muted mb-2">
            {language === 'ar' ? 'رقم الطلب' : 'Order number'}: <span className="font-bold text-foreground">{success.orderNumber}</span>
          </p>
          <p className="text-sm text-muted mb-8">{t('checkout.codNote')}</p>
          <div className="flex justify-center gap-4">
            <Link to="/orders" className="px-6 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent-light transition-colors">
              {t('nav.orders')}
            </Link>
            <Link to="/books" className="px-6 py-3 border border-muted/20 text-foreground font-medium rounded-xl hover:border-accent hover:text-accent transition-colors">
              {t('cart.continueShopping')}
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-display font-bold text-foreground mb-8">{t('checkout.title')}</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Shipping Form */}
            <div className="lg:col-span-2">
              <div className="bg-surface rounded-xl border border-muted/10 p-6">
                <h2 className="text-lg font-semibold text-foreground mb-5">{t('checkout.shippingInfo')}</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{t('checkout.name')}</label>
                    <div className="relative">
                      <FiUser className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input type="text" value={form.shippingName} onChange={(e) => update('shippingName', e.target.value)} required className="w-full ps-10 pe-4 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{t('checkout.phone')}</label>
                    <div className="relative">
                      <FiPhone className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input type="tel" value={form.shippingPhone} onChange={(e) => update('shippingPhone', e.target.value)} required className="w-full ps-10 pe-4 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{t('checkout.city')}</label>
                    <input type="text" value={form.shippingCity} onChange={(e) => update('shippingCity', e.target.value)} required className="w-full px-4 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{t('checkout.address')}</label>
                    <div className="relative">
                      <FiMapPin className="absolute left-3 rtl:left-auto rtl:right-3 top-3 w-4 h-4 text-muted" />
                      <textarea value={form.shippingAddress} onChange={(e) => update('shippingAddress', e.target.value)} required rows={3} className="w-full ps-10 pe-4 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 resize-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{t('checkout.notes')}</label>
                    <div className="relative">
                      <FiFileText className="absolute left-3 rtl:left-auto rtl:right-3 top-3 w-4 h-4 text-muted" />
                      <textarea value={form.shippingNotes} onChange={(e) => update('shippingNotes', e.target.value)} rows={2} className="w-full ps-10 pe-4 py-3 bg-background border border-muted/20 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 resize-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-surface rounded-xl border border-muted/10 p-6 mt-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">{t('checkout.cod')}</h2>
                <div className="flex items-center gap-3 p-4 bg-accent/5 border border-accent/20 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                    COD
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('checkout.cod')}</p>
                    <p className="text-xs text-muted">{t('checkout.codNote')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-surface rounded-xl border border-muted/10 p-6 sticky top-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">{t('checkout.orderSummary')}</h2>

                <div className="space-y-3 mb-4">
                  {items.map((item) => (
                    <div key={item.bookId} className="flex items-center justify-between text-sm">
                      <span className="text-muted truncate max-w-[160px]">
                        {language === 'ar' && item.book.titleAr ? item.book.titleAr : item.book.title} x{item.quantity}
                      </span>
                      <span className="font-medium text-foreground">{formatPrice(parseFloat(item.book.price) * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-muted/10 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">{t('cart.subtotal')}</span>
                    <span className="text-foreground">{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">{t('cart.shipping')}</span>
                    <span className="text-foreground">{shipping === 0 ? t('cart.freeShipping') : formatPrice(shipping)}</span>
                  </div>
                  <div className="border-t border-muted/10 pt-2 flex justify-between">
                    <span className="font-semibold text-foreground">{t('cart.total')}</span>
                    <span className="font-bold text-lg text-foreground">{formatPrice(total + shipping)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="block w-full mt-6 py-3 bg-accent text-white text-center font-semibold rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50"
                >
                  {loading ? t('common.loading') : t('checkout.placeOrder')}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </PageTransition>
  );
};

export default Checkout;
