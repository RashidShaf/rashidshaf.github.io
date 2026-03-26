import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPackage, FiChevronRight, FiShoppingBag } from 'react-icons/fi';
import PageTransition from '../animations/PageTransition';
import useLanguageStore from '../stores/useLanguageStore';
import { formatPrice, formatDate, formatDateAr } from '../utils/formatters';
import api from '../utils/api';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const OrderHistory = () => {
  const { t, language } = useLanguageStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders').then((res) => {
      setOrders(res.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-display font-bold text-foreground mb-8">{t('orders.title')}</h1>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-alt rounded-xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <FiShoppingBag className="w-14 h-14 text-muted/30 mx-auto mb-4" />
            <p className="text-muted">{t('common.noResults')}</p>
            <Link to="/books" className="inline-block mt-4 text-sm text-accent hover:underline">{t('cart.continueShopping')}</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Link
                  to={`/orders/${order.id}`}
                  className="block bg-surface rounded-xl border border-muted/10 p-5 hover:border-accent/20 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <FiPackage className="w-5 h-5 text-accent" />
                      <span className="font-semibold text-foreground text-sm">{order.orderNumber}</span>
                    </div>
                    <span className={`px-2.5 py-1 text-[11px] font-semibold uppercase rounded-full ${statusColors[order.status] || 'bg-muted/10 text-muted'}`}>
                      {t(`orders.statuses.${order.status.toLowerCase()}`)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Item thumbnails */}
                      <div className="flex -space-x-2 rtl:space-x-reverse">
                        {order.items.slice(0, 3).map((item, i) => (
                          <div key={i} className="w-10 h-12 rounded bg-surface-alt border border-muted/10 overflow-hidden">
                            {item.book?.coverImage ? (
                              <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/${item.book.coverImage}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-accent/30">
                                {item.title.charAt(0)}
                              </div>
                            )}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-10 h-12 rounded bg-surface-alt border border-muted/10 flex items-center justify-center text-[10px] font-medium text-muted">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted">
                          {order.items.length} {language === 'ar' ? 'كتب' : 'items'}
                        </p>
                        <p className="text-xs text-muted">
                          {language === 'ar' ? formatDateAr(order.createdAt) : formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{formatPrice(order.total)}</span>
                      <FiChevronRight className="w-4 h-4 text-muted" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default OrderHistory;
