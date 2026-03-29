import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
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
  const t = useLanguageStore((s) => s.t);
  const isRTL = useLanguageStore((s) => s.isRTL);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/orders?limit=100`);
      const allOrders = res.data.data || res.data;
      const found = allOrders.find((o) => o.id === id);
      if (found) {
        setOrder(found);
        setNewStatus(found.status);
      } else {
        toast.error('Order not found');
      }
    } catch (err) {
      toast.error('Failed to fetch order');
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
      toast.success('Status updated');
      setOrder((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
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
    return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="text-admin-muted text-sm py-12 text-center">{t('common.loading')}</div></motion.div>;
  }

  if (!order) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-6">
          <Link to="/orders" className="p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100"><FiArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} /></Link>
          <h2 className="text-2xl font-bold text-admin-text">Order not found</h2>
        </div>
      </motion.div>
    );
  }

  const timeline = getTimeline();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/orders" className="p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100">
          <FiArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-admin-text">{t('orders.orderNumber')}{order.orderNumber}</h2>
          <p className="text-sm text-admin-muted">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
          {t(`orders.statuses.${order.status}`) || order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Info */}
          <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
            <h3 className="text-base font-bold text-admin-text mb-4">Order Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-admin-muted">Customer</span>
                <p className="font-medium text-admin-text mt-1">{order.user?.firstName} {order.user?.lastName}</p>
              </div>
              <div>
                <span className="text-admin-muted">Email</span>
                <p className="font-medium text-admin-text mt-1">{order.user?.email}</p>
              </div>
              <div>
                <span className="text-admin-muted">{t('common.total')}</span>
                <p className="font-medium text-admin-text mt-1">QAR {parseFloat(order.total || 0).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-admin-muted">Payment</span>
                <p className="font-medium text-admin-text mt-1">{order.paymentMethod || 'COD'}</p>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
            <h3 className="text-base font-bold text-admin-text mb-4">Shipping Details</h3>
            <div className="space-y-3 text-sm">
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
            <div className="p-6 pb-3">
              <h3 className="text-base font-bold text-admin-text">Order Items ({order.items?.length || 0})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-admin-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-admin-muted">Item</th>
                    <th className="text-left px-4 py-3 font-medium text-admin-muted">Price</th>
                    <th className="text-left px-4 py-3 font-medium text-admin-muted">Qty</th>
                    <th className="text-left px-4 py-3 font-medium text-admin-muted">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-admin-muted">No items</td></tr>
                  ) : (order.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b border-admin-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-admin-text">{item.book?.title || item.title || 'Unknown'}</p>
                        {item.book?.author && <p className="text-xs text-admin-muted">{item.book.author}</p>}
                      </td>
                      <td className="px-4 py-3 text-admin-muted">QAR {parseFloat(item.price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-admin-muted">{item.quantity}</td>
                      <td className="px-4 py-3 font-medium text-admin-text">QAR {(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Status Update */}
          <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
            <h3 className="text-base font-bold text-admin-text mb-4">{t('orders.updateStatus')}</h3>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-admin-card border border-gray-300 rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent mb-3"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{t(`orders.statuses.${s}`) || s}</option>
              ))}
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={updating || newStatus === order.status}
              className="w-full px-4 py-2.5 bg-admin-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {updating ? t('common.loading') : t('orders.updateStatus')}
            </button>
          </div>

          {/* Timeline */}
          <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
            <h3 className="text-base font-bold text-admin-text mb-4">Status Timeline</h3>
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
    </motion.div>
  );
}
