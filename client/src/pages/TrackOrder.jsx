import { useState } from 'react';
import { FiSearch, FiCheck, FiX, FiUser, FiPhone, FiMapPin, FiCreditCard, FiCalendar, FiHash, FiPackage, FiChevronDown } from 'react-icons/fi';
import SEO from '../components/SEO';
import PhoneInput from '../components/common/PhoneInput';
import Image from '../components/common/Image';
import useLanguageStore from '../stores/useLanguageStore';
import { formatPrice, formatDate, formatDateAr } from '../utils/formatters';
import api from '../utils/api';

const statusSteps = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const statusColors = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-violet-100 text-violet-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const TrackOrder = () => {
  const { t, language } = useLanguageStore();
  const isRTL = language === 'ar';

  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError('');
    setOrders(null);
    setExpandedId(null);
    try {
      const res = await api.get(`/orders/track?phone=${encodeURIComponent(phone.trim())}`);
      if (res.data.length === 0) {
        setError(t('trackOrder.notFound'));
      } else {
        setOrders(res.data);
        if (res.data.length === 1) setExpandedId(res.data[0].id);
      }
    } catch {
      setError(t('trackOrder.notFound'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Track Order"
        description="Track your Arkaan Bookstore order status — enter your order number and phone to see delivery progress."
        url="https://arkaan.qa/track-order"
      />
      <div className="mx-auto px-4 sm:px-6 lg:px-6 xl:px-8 3xl:px-12 py-10">
        {/* Lookup Form */}
        <div className="max-w-md 3xl:max-w-lg mx-auto mb-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 3xl:w-20 3xl:h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <FiPackage className="w-7 h-7 3xl:w-9 3xl:h-9 text-accent" />
            </div>
            <h1 className="text-2xl 3xl:text-4xl font-display font-bold text-foreground mb-2">
              {t('trackOrder.title')}
            </h1>
            <p className="text-sm 3xl:text-base text-foreground/50">{t('trackOrder.subtitle')}</p>
          </div>

          <form onSubmit={handleTrack} className="bg-surface rounded-2xl border border-muted/10 p-6 3xl:p-8 space-y-4">
            <div>
              <label className="block text-sm 3xl:text-base font-semibold text-foreground mb-1.5">
                {t('trackOrder.phone')}
              </label>
              <PhoneInput value={phone} onChange={setPhone} required />
            </div>
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full py-3 3xl:py-4 bg-accent text-white font-bold 3xl:text-base rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FiSearch size={16} />
              {loading ? t('common.loading') : t('trackOrder.submit')}
            </button>

            {error && (
              <p className="text-sm text-red-500 text-center font-medium">{error}</p>
            )}
          </form>
        </div>

        {/* Orders List */}
        {orders && orders.length > 0 && (
          <div className="max-w-4xl 3xl:max-w-5xl mx-auto space-y-4">
            <p className="text-sm text-foreground/50 mb-2">
              {orders.length} {orders.length === 1 ? t('trackOrder.orderCount_one') : t('trackOrder.orderCount_other')}
            </p>

            {orders.map((order) => {
              const isExpanded = expandedId === order.id;
              const currentStep = statusSteps.indexOf(order.status);
              const isCancelled = order.status === 'CANCELLED';

              return (
                <div key={order.id} className="bg-surface rounded-2xl border border-muted/10 shadow-sm overflow-hidden">
                  {/* Order Header — always visible, clickable */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="w-full flex items-center gap-4 p-4 sm:p-5 3xl:p-6 text-left hover:bg-surface-alt/30 transition-colors"
                  >
                    {/* Thumbnails */}
                    <div className="hidden sm:flex -space-x-2 flex-shrink-0">
                      {(order.items || []).slice(0, 3).map((item, i) => {
                        const coverPath = item.book?.coverImage || null;
                        return (
                          <div key={i} className="w-10 h-13 rounded-lg overflow-hidden border-2 border-background bg-surface-alt flex-shrink-0">
                            {coverPath ? <Image src={coverPath} alt="" width={40} height={52} sizes="40px" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-accent/30 text-[10px] font-bold">{item.title?.[0]}</div>}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm 3xl:text-base font-bold text-foreground">{order.orderNumber}</p>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                          {t(`orders.statuses.${order.status?.toLowerCase()}`) || order.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-foreground/50">
                        <span>{order.items?.length || 0} {t('trackOrder.items')}</span>
                        <span className="flex items-center gap-1"><FiCalendar size={10} /> {isRTL ? formatDateAr(order.createdAt) : formatDate(order.createdAt)}</span>
                      </div>
                    </div>

                    <p className="text-base 3xl:text-lg font-extrabold text-foreground flex-shrink-0">{formatPrice(order.total)}</p>
                    <FiChevronDown className={`w-5 h-5 text-foreground/30 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-muted/10 p-4 sm:p-6 3xl:p-8 space-y-6">
                      {/* Status Timeline */}
                      {!isCancelled ? (
                        <div>
                          <h3 className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-4">
                            {t('orders.orderStatus')}
                          </h3>
                          <div className="flex items-center justify-between relative">
                            <div className="absolute top-4 left-4 right-4 h-1 bg-muted/15 rounded-full" />
                            <div
                              className="absolute top-4 left-4 h-1 bg-accent rounded-full transition-all duration-500"
                              style={{ width: currentStep >= 0 ? `${(currentStep / (statusSteps.length - 1)) * (100 - 8)}%` : '0%' }}
                            />
                            {statusSteps.map((step, i) => (
                              <div key={step} className="flex flex-col items-center relative z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                                  i <= currentStep ? 'bg-accent text-white' : 'bg-background text-foreground/30 border-2 border-muted/20'
                                }`}>
                                  {i <= currentStep ? <FiCheck size={14} /> : i + 1}
                                </div>
                                <span className={`text-[10px] mt-2 font-semibold hidden sm:block ${i <= currentStep ? 'text-accent' : 'text-foreground/30'}`}>
                                  {t(`orders.statuses.${step.toLowerCase()}`)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <FiX className="text-red-500 w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-red-700">{t('orders.orderCancelled')}</p>
                            {order.cancelledAt && (
                              <p className="text-xs text-red-500 mt-0.5">{isRTL ? formatDateAr(order.cancelledAt) : formatDate(order.cancelledAt)}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Items */}
                      <div>
                        <h3 className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-3">
                          {t('orders.items')} ({order.items.length})
                        </h3>
                        <div className="space-y-2">
                          {order.items.map((item) => {
                            const coverPath = item.book?.coverImage || null;
                            const title = isRTL && item.book?.titleAr ? item.book.titleAr : item.title;
                            return (
                              <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-alt/30 rounded-xl">
                                <div className="w-11 h-14 rounded-lg bg-surface-alt overflow-hidden flex-shrink-0">
                                  {coverPath ? <Image src={coverPath} alt={title} width={44} height={56} sizes="44px" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-accent/20 font-bold text-sm">{item.title.charAt(0)}</div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground line-clamp-1">{title}</p>
                                  <p className="text-xs text-foreground/50">{formatPrice(item.price)} x {item.quantity}</p>
                                </div>
                                <p className="text-sm font-bold text-foreground flex-shrink-0">{formatPrice(parseFloat(item.price) * item.quantity)}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Summary row */}
                      <div className="pt-3 border-t border-muted/10 text-sm space-y-2">
                        <div className="flex items-center gap-4 text-foreground/50">
                          <span className="flex items-center gap-1.5"><FiHash size={12} /> {order.orderNumber}</span>
                          <span className="flex items-center gap-1.5"><FiCreditCard size={12} /> {order.paymentMethod === 'ONLINE' ? t('cart.onlinePayment') : t('orders.paymentCOD')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/50">{t('cart.subtotal')}</span>
                          <span className="font-medium text-foreground">{formatPrice(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground/50">{t('cart.shipping')}</span>
                          <span className="font-medium text-foreground">{parseFloat(order.shippingCost) === 0 ? t('cart.freeShipping') : formatPrice(order.shippingCost)}</span>
                        </div>
                        <div className="flex justify-between border-t border-muted/10 pt-2">
                          <span className="font-bold text-foreground">{t('cart.total')}</span>
                          <span className="font-extrabold text-foreground">{formatPrice(order.total)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default TrackOrder;
