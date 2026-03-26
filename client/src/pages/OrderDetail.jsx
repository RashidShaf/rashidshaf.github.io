import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiPackage, FiMapPin, FiPhone, FiUser, FiCheck, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageTransition from '../animations/PageTransition';
import useLanguageStore from '../stores/useLanguageStore';
import { formatPrice, formatDate, formatDateAr } from '../utils/formatters';
import api from '../utils/api';

const statusSteps = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const OrderDetail = () => {
  const { id } = useParams();
  const { t, language } = useLanguageStore();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${id}`).then((res) => setOrder(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من إلغاء الطلب؟' : 'Are you sure you want to cancel this order?')) return;
    try {
      await api.put(`/orders/${id}/cancel`);
      setOrder((o) => ({ ...o, status: 'CANCELLED', cancelledAt: new Date() }));
      toast.success(language === 'ar' ? 'تم إلغاء الطلب' : 'Order cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="h-8 bg-surface-alt rounded w-1/3 animate-pulse mb-8" />
          <div className="h-64 bg-surface-alt rounded-xl animate-pulse" />
        </div>
      </PageTransition>
    );
  }

  if (!order) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-muted text-lg">{t('common.noResults')}</p>
          <Link to="/orders" className="mt-4 inline-flex items-center gap-2 text-accent"><FiArrowLeft /> {t('orders.title')}</Link>
        </div>
      </PageTransition>
    );
  }

  const currentStep = statusSteps.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/orders" className="flex items-center gap-1 text-sm text-muted hover:text-accent mb-2">
              <FiArrowLeft size={14} /> {t('orders.title')}
            </Link>
            <h1 className="text-2xl font-display font-bold text-foreground">{order.orderNumber}</h1>
            <p className="text-sm text-muted mt-1">
              {language === 'ar' ? formatDateAr(order.createdAt) : formatDate(order.createdAt)}
            </p>
          </div>
          {['PENDING', 'CONFIRMED'].includes(order.status) && (
            <button onClick={handleCancel} className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              {t('orders.cancel')}
            </button>
          )}
        </div>

        {/* Status Timeline */}
        {!isCancelled ? (
          <div className="bg-surface rounded-xl border border-muted/10 p-6 mb-6">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, i) => (
                <div key={step} className="flex-1 flex flex-col items-center relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 ${
                    i <= currentStep ? 'bg-accent text-white' : 'bg-surface-alt text-muted border border-muted/20'
                  }`}>
                    {i <= currentStep ? <FiCheck size={16} /> : i + 1}
                  </div>
                  <span className={`text-[11px] mt-2 font-medium ${i <= currentStep ? 'text-accent' : 'text-muted'}`}>
                    {t(`orders.statuses.${step.toLowerCase()}`)}
                  </span>
                  {i < statusSteps.length - 1 && (
                    <div className={`absolute top-4 left-[55%] w-[calc(100%-10px)] h-0.5 ${i < currentStep ? 'bg-accent' : 'bg-muted/20'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <FiX className="text-red-500 w-5 h-5" />
            <span className="text-sm font-medium text-red-700">
              {language === 'ar' ? 'تم إلغاء هذا الطلب' : 'This order has been cancelled'}
            </span>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-xl border border-muted/10 p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">{t('orders.items')}</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-14 h-18 rounded-lg bg-surface-alt overflow-hidden flex-shrink-0">
                      {item.book?.coverImage ? (
                        <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/${item.book.coverImage}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-accent/30 font-bold">{item.title.charAt(0)}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-1">
                        {language === 'ar' && item.book?.titleAr ? item.book.titleAr : item.title}
                      </p>
                      <p className="text-xs text-muted mt-0.5">x {item.quantity}</p>
                    </div>
                    <span className="text-sm font-bold text-foreground">{formatPrice(parseFloat(item.price) * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary + Shipping */}
          <div className="space-y-6">
            <div className="bg-surface rounded-xl border border-muted/10 p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">{t('checkout.orderSummary')}</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted">{t('cart.subtotal')}</span><span>{formatPrice(order.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted">{t('cart.shipping')}</span><span>{parseFloat(order.shippingCost) === 0 ? t('cart.freeShipping') : formatPrice(order.shippingCost)}</span></div>
                <div className="border-t border-muted/10 pt-2 flex justify-between"><span className="font-semibold">{t('cart.total')}</span><span className="font-bold text-lg">{formatPrice(order.total)}</span></div>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-muted/10 p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">{t('checkout.shippingInfo')}</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted"><FiUser size={14} />{order.shippingName}</div>
                <div className="flex items-center gap-2 text-muted"><FiPhone size={14} /><span dir="ltr">{order.shippingPhone}</span></div>
                <div className="flex items-center gap-2 text-muted"><FiMapPin size={14} />{order.shippingAddress}, {order.shippingCity}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default OrderDetail;
