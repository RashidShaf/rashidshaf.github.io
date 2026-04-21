import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiCheck, FiX, FiUser, FiPhone, FiMapPin, FiCreditCard, FiCalendar, FiHash } from 'react-icons/fi';
import { toast } from 'react-toastify';
import SEO from '../components/SEO';
import AccountLayout from '../components/common/AccountLayout';
import ConfirmModal from '../components/common/ConfirmModal';
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

const OrderDetail = () => {
  const { id } = useParams();
  const { t, language } = useLanguageStore();
  const isRTL = language === 'ar';
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');

  useEffect(() => {
    api.get(`/orders/${id}`).then((res) => setOrder(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    try {
      await api.put(`/orders/${id}/cancel`);
      setOrder((o) => ({ ...o, status: 'CANCELLED', cancelledAt: new Date() }));
      toast.success(t('orders.orderCancelledToast'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('orders.cancelFailed'));
    } finally {
      setShowCancelModal(false);
    }
  };

  if (loading) {
    return (
      <>
        <AccountLayout>
          <div className="space-y-4">
            <div className="h-8 bg-surface-alt rounded-lg w-1/3 animate-pulse" />
            <div className="h-48 bg-surface-alt rounded-2xl animate-pulse" />
            <div className="h-64 bg-surface-alt rounded-2xl animate-pulse" />
          </div>
        </AccountLayout>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <AccountLayout>
          <div className="text-center py-20">
            <p className="text-foreground/50 text-lg">{t('common.noResults')}</p>
            <Link to="/orders" className="mt-4 inline-flex items-center gap-2 text-accent text-sm font-medium">
              {isRTL ? <FiArrowRight /> : <FiArrowLeft />} {t('orders.title')}
            </Link>
          </div>
        </AccountLayout>
      </>
    );
  }

  const currentStep = statusSteps.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <>
      <SEO title="Order Details" noindex />
      <AccountLayout>
        {/* Back */}
        <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-accent transition-colors mb-4">
          {isRTL ? <FiArrowRight size={14} /> : <FiArrowLeft size={14} />} {t('orders.title')}
        </Link>

        {/* Order Header Card */}
        <div className="bg-surface rounded-2xl border border-muted/10 shadow-sm p-5 sm:p-6 3xl:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h1 className="text-xl sm:text-2xl 3xl:text-3xl font-display font-bold text-foreground">{order.orderNumber}</h1>
                <span className={`px-2.5 py-0.5 text-[11px] font-semibold uppercase rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                  {t(`orders.statuses.${order.status?.toLowerCase()}`) || order.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-foreground/50">
                <span className="flex items-center gap-1.5">
                  <FiCalendar size={12} />
                  {isRTL ? formatDateAr(order.createdAt) : formatDate(order.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <FiCreditCard size={12} />
                  {t('checkout.cod')}
                </span>
              </div>
            </div>
            {['CONFIRMED'].includes(order.status) && (
              <button onClick={() => setShowCancelModal(true)} className="px-4 py-2 text-sm font-medium text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors self-start">
                {t('orders.cancel')}
              </button>
            )}
          </div>
        </div>

        {/* Status Timeline */}
        {!isCancelled ? (
          <div className="bg-surface rounded-2xl border border-muted/10 shadow-sm p-6 sm:p-8 3xl:p-10 mb-6">
            <h3 className="text-sm 3xl:text-base font-bold text-foreground/50 uppercase tracking-wider mb-6">
              {t('orders.orderStatus')}
            </h3>
            <div className="flex items-center justify-between relative">
              {/* Progress line */}
              <div className="absolute top-4 left-4 right-4 h-1 bg-muted/15 rounded-full" />
              <div
                className="absolute top-4 left-4 h-1 bg-accent rounded-full transition-all duration-500"
                style={{ width: currentStep >= 0 ? `${(currentStep / (statusSteps.length - 1)) * (100 - 8)}%` : '0%' }}
              />

              {statusSteps.map((step, i) => (
                <div key={step} className="flex flex-col items-center relative z-10">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                    i <= currentStep
                      ? 'bg-accent text-white'
                      : 'bg-background text-foreground/30 border-2 border-muted/20'
                  }`}>
                    {i <= currentStep ? <FiCheck size={16} /> : i + 1}
                  </div>
                  <span className={`text-[11px] mt-2.5 font-semibold hidden sm:block ${i <= currentStep ? 'text-accent' : 'text-foreground/30'}`}>
                    {t(`orders.statuses.${step.toLowerCase()}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <FiX className="text-red-500 w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-700">
                {t('orders.orderCancelled')}
              </p>
              {order.cancelledAt && (
                <p className="text-xs text-red-500 mt-0.5">
                  {isRTL ? formatDateAr(order.cancelledAt) : formatDate(order.cancelledAt)}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-2xl border border-muted/10 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-muted/10">
                <h2 className="text-base 3xl:text-lg font-bold text-foreground">
                  {t('orders.items')} ({order.items.length})
                </h2>
              </div>
              <div className="divide-y divide-muted/10">
                {order.items.map((item) => {
                  const coverPath = item.book?.coverImage || null;
                  const title = isRTL && item.book?.titleAr ? item.book.titleAr : item.title;
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="w-14 h-[72px] rounded-lg bg-surface-alt overflow-hidden flex-shrink-0">
                        {coverPath ? (
                          <Image src={coverPath} alt={title} width={56} height={72} sizes="56px" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-accent/20 font-bold text-lg">{item.title.charAt(0)}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{title}</p>
                        <p className="text-xs text-foreground/50 mt-1">
                          {formatPrice(item.price)} x {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-foreground flex-shrink-0">
                        {formatPrice(parseFloat(item.price) * item.quantity)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar — Summary + Shipping */}
          <div className="space-y-5">
            {/* Order Summary */}
            <div className="bg-surface rounded-2xl border border-muted/10 shadow-sm p-4 sm:p-6 3xl:p-8">
              <h2 className="text-base 3xl:text-lg font-bold text-foreground mb-4">{t('checkout.orderSummary')}</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/50">{t('cart.subtotal')}</span>
                  <span className="font-medium text-foreground">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/50">{t('cart.shipping')}</span>
                  <span className="font-medium text-foreground">{parseFloat(order.shippingCost) === 0 ? t('cart.freeShipping') : formatPrice(order.shippingCost)}</span>
                </div>
                <div className="border-t border-muted/10 pt-3 flex justify-between">
                  <span className="font-bold text-foreground">{t('cart.total')}</span>
                  <span className="font-extrabold text-xl text-foreground">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="bg-surface rounded-2xl border border-muted/10 shadow-sm p-4 sm:p-6 3xl:p-8">
              <h2 className="text-base 3xl:text-lg font-bold text-foreground mb-4">{t('checkout.shippingInfo')}</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center flex-shrink-0">
                    <FiUser size={14} className="text-foreground/40" />
                  </div>
                  <span className="text-sm text-foreground">{order.shippingName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center flex-shrink-0">
                    <FiPhone size={14} className="text-foreground/40" />
                  </div>
                  <span className="text-sm text-foreground" dir="ltr">{order.shippingPhone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center flex-shrink-0">
                    <FiMapPin size={14} className="text-foreground/40" />
                  </div>
                  <span className="text-sm text-foreground">{order.shippingAddress}, {order.shippingCity}</span>
                </div>
              </div>
            </div>

            {/* Order Info */}
            <div className="bg-surface rounded-2xl border border-muted/10 shadow-sm p-4 sm:p-6 3xl:p-8">
              <h2 className="text-base 3xl:text-lg font-bold text-foreground mb-4">{t('orders.orderInfo')}</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/50 flex items-center gap-1.5"><FiHash size={12} /> {t('orders.orderHash')}</span>
                  <span className="font-semibold text-foreground">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/50 flex items-center gap-1.5"><FiCalendar size={12} /> {t('orders.date')}</span>
                  <span className="text-foreground">{isRTL ? formatDateAr(order.createdAt) : formatDate(order.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/50 flex items-center gap-1.5"><FiCreditCard size={12} /> {t('orders.payment')}</span>
                  <span className="text-foreground">{t('orders.paymentCOD')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AccountLayout>

      <ConfirmModal
        open={showCancelModal}
        title={t('orders.cancel')}
        message={t('orders.cancelConfirm')}
        confirmText={t('orders.cancel')}
        onConfirm={handleCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </>
  );
};

export default OrderDetail;
