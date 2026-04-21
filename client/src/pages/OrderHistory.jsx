import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPackage, FiShoppingBag, FiChevronRight, FiCalendar } from 'react-icons/fi';
import PageTransition from '../animations/PageTransition';
import SEO from '../components/SEO';
import AccountLayout from '../components/common/AccountLayout';
import useLanguageStore from '../stores/useLanguageStore';
import { formatPrice, formatDate, formatDateAr } from '../utils/formatters';
import api from '../utils/api';

const statusColors = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-violet-100 text-violet-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const OrderHistory = () => {
  const { t, language } = useLanguageStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders?limit=50').then((res) => {
      setOrders(res.data.data || res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');

  return (
    <PageTransition>
      <SEO title="My Orders" noindex />
      <AccountLayout>
        <h1 className="text-2xl 3xl:text-3xl font-display font-bold text-foreground mb-6">{t('orders.title')}</h1>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-surface-alt rounded-xl animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <FiShoppingBag className="w-16 h-16 text-foreground/15 mx-auto mb-4" />
            <p className="text-foreground/50 text-lg font-medium mb-2">{language === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet'}</p>
            <Link to="/books" className="inline-block mt-4 px-6 py-2.5 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent-light transition-colors">
              {t('cart.continueShopping')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block sm:flex sm:items-center gap-4 bg-surface rounded-xl border border-muted/10 shadow-sm p-4 sm:p-5 3xl:p-6 hover:shadow-lg hover:border-accent/20 transition-all group"
              >
                {/* Item Thumbnails */}
                <div className="hidden sm:flex -space-x-3 flex-shrink-0">
                  {(order.items || []).slice(0, 3).map((item, i) => {
                    const cover = item.book?.coverImage ? `${API_BASE}/${item.book.coverImage}` : null;
                    return (
                      <div key={i} className="w-12 h-16 rounded-lg overflow-hidden border-2 border-background bg-surface-alt flex-shrink-0">
                        {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-accent/30 text-xs font-bold">{item.title?.[0]}</div>}
                      </div>
                    );
                  })}
                  {(order.items?.length || 0) > 3 && (
                    <div className="w-12 h-16 rounded-lg border-2 border-background bg-surface-alt flex items-center justify-center text-xs font-bold text-foreground/40">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>

                {/* Order Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm 3xl:text-base font-bold text-foreground">{order.orderNumber}</p>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {t(`orders.statuses.${order.status?.toLowerCase()}`) || order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-foreground/50">
                    <span>{order.items?.length || 0} {language === 'ar' ? 'منتجات' : 'items'}</span>
                    <span className="flex items-center gap-1"><FiCalendar size={10} /> {language === 'ar' ? formatDateAr(order.createdAt) : formatDate(order.createdAt)}</span>
                  </div>
                </div>

                {/* Price + Arrow */}
                <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-muted/10">
                  <p className="text-base 3xl:text-lg font-extrabold text-foreground">{formatPrice(order.total)}</p>
                  <FiChevronRight className="w-5 h-5 text-foreground/30 group-hover:text-accent transition-colors rtl:rotate-180" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </AccountLayout>
    </PageTransition>
  );
};

export default OrderHistory;
