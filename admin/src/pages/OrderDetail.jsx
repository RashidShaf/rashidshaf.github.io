import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPackage, FiTruck, FiCheckCircle, FiClock, FiXCircle, FiUser, FiPhone, FiMapPin, FiFileText } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const statusColors = {
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const statusIcons = {
  CONFIRMED: FiCheckCircle,
  PROCESSING: FiPackage,
  SHIPPED: FiTruck,
  DELIVERED: FiCheckCircle,
  CANCELLED: FiXCircle,
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language, isRTL } = useLanguageStore();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/orders/${id}`);
      setOrder(res.data);
      setNewStatus(res.data.status);
    } catch (err) {
      toast.error(t('orders.orderNotFound'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === order.status) return;
    setUpdating(true);
    try {
      await api.put(`/admin/orders/${id}/status`, { status: newStatus });
      toast.success(t('orders.statusUpdated'));
      setOrder((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      toast.error(err.response?.data?.message || t('orders.failedUpdate'));
    } finally {
      setUpdating(false);
    }
  };

  const getTimeline = () => {
    if (!order) return [];
    const steps = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    if (order.status === 'CANCELLED') {
      return [{ status: 'CONFIRMED', reached: true }, { status: 'CANCELLED', reached: true }];
    }
    const idx = steps.indexOf(order.status);
    return steps.map((s, i) => ({ status: s, reached: i <= idx }));
  };

  if (loading) {
    return <div className="text-admin-muted text-sm py-12 text-center">{t('common.loading')}</div>;
  }

  if (!order) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100"><FiArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} /></button>
          <h2 className="text-2xl font-bold text-admin-text">{t('orders.orderNotFound')}</h2>
        </div>
      </div>
    );
  }

  const timeline = getTimeline();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 3xl:mb-8">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100">
          <FiArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl 3xl:text-3xl font-bold text-admin-text">{t('orders.orderNumber')}{order.orderNumber}</h2>
          <p className="text-sm text-admin-muted">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
          {t(`orders.statuses.${order.status}`) || order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 3xl:gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6 3xl:space-y-8">
          {/* Order Info */}
          <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
            <h3 className="text-base 3xl:text-lg font-bold text-admin-text mb-4">{t('orders.orderInfo')}</h3>
            <div className="grid grid-cols-2 gap-4 3xl:gap-6 text-sm 3xl:text-base">
              <div>
                <span className="text-admin-muted">{t('orders.customer')}</span>
                <p className="font-medium text-admin-text mt-1">
                  {order.user ? `${order.user.firstName} ${order.user.lastName}` : <span className="text-amber-600">{t('common.guest')}</span>}
                </p>
              </div>
              <div>
                <span className="text-admin-muted">{t('common.email')}</span>
                <p className="font-medium text-admin-text mt-1">{order.user?.email || '—'}</p>
              </div>
              <div>
                <span className="text-admin-muted">{t('orders.subtotal')}</span>
                <p className="font-medium text-admin-text mt-1">QAR {parseFloat(order.subtotal || 0).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-admin-muted">{t('orders.shipping')}</span>
                <p className="font-medium text-admin-text mt-1">{parseFloat(order.shippingCost) === 0 ? t('common.free') : `QAR ${parseFloat(order.shippingCost || 0).toFixed(2)}`}</p>
              </div>
              <div>
                <span className="text-admin-muted">{t('common.total')}</span>
                <p className="font-bold text-admin-text mt-1">QAR {parseFloat(order.total || 0).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-admin-muted">{t('orders.payment')}</span>
                <p className="font-medium text-admin-text mt-1">{order.paymentMethod || 'COD'}</p>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
            <h3 className="text-base 3xl:text-lg font-bold text-admin-text mb-4">{t('orders.shippingDetails')}</h3>
            <div className="space-y-3 text-sm 3xl:text-base">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><FiUser size={14} className="text-admin-muted" /></div>
                <span className="text-admin-text">{order.shippingName || '-'}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><FiPhone size={14} className="text-admin-muted" /></div>
                <span className="text-admin-text" dir="ltr">{order.shippingPhone || '-'}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><FiMapPin size={14} className="text-admin-muted" /></div>
                <span className="text-admin-text">{order.shippingAddress || '-'}{order.shippingCity ? `, ${order.shippingCity}` : ''}</span>
              </div>
              {order.shippingNotes && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><FiFileText size={14} className="text-admin-muted" /></div>
                  <span className="text-admin-text">{order.shippingNotes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
            <div className="p-6 3xl:p-8 pb-3 3xl:pb-4">
              <h3 className="text-base 3xl:text-lg font-bold text-admin-text">{t('orders.orderItems')} ({order.items?.length || 0})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm 3xl:text-base">
                <thead className="bg-gray-50 border-b border-admin-border">
                  <tr>
                    <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('orders.item')}</th>
                    <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('books.price')}</th>
                    <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.qty')}</th>
                    <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('orders.subtotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-admin-muted">{t('common.noItems')}</td></tr>
                  ) : (order.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b border-admin-border last:border-0">
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                        <p className="font-medium text-admin-text">{language === 'ar' && item.book?.titleAr ? item.book.titleAr : (item.book?.title || item.title || 'Unknown')}</p>
                        {item.book?.author && <p className="text-xs text-admin-muted">{item.book.author}</p>}
                      </td>
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted">QAR {parseFloat(item.price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted">{item.quantity}</td>
                      <td className="px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-text">QAR {(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 3xl:space-y-8">
          {/* Status Update */}
          <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
            <h3 className="text-base 3xl:text-lg font-bold text-admin-text mb-4">{t('orders.updateStatus')}</h3>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2.5 3xl:px-4 3xl:py-3 bg-admin-card border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent mb-3"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{t(`orders.statuses.${s}`) || s}</option>
              ))}
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={updating || newStatus === order.status}
              className="w-full px-4 py-2.5 3xl:px-5 3xl:py-3 bg-admin-accent text-white rounded-lg text-sm 3xl:text-base font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {updating ? t('common.loading') : t('orders.updateStatus')}
            </button>
          </div>

          {/* Timeline */}
          <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
            <h3 className="text-base 3xl:text-lg font-bold text-admin-text mb-4">{t('orders.statusTimeline')}</h3>
            <div className="space-y-4">
              {timeline.map((step, idx) => {
                const Icon = statusIcons[step.status] || FiClock;
                return (
                  <div key={step.status} className="flex items-start gap-3">
                    <div className="relative flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.reached ? 'bg-admin-accent text-white' : 'bg-gray-100 text-admin-muted'}`}>
                        <Icon size={14} />
                      </div>
                      {idx < timeline.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${step.reached ? 'bg-admin-accent' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className={`text-sm font-medium ${step.reached ? 'text-admin-text' : 'text-admin-muted'}`}>
                        {t(`orders.statuses.${step.status}`) || step.status}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
