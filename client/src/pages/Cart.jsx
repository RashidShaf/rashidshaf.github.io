import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiShoppingCart, FiTrash2, FiPlus, FiMinus, FiArrowRight, FiShoppingBag } from 'react-icons/fi';
import PageTransition from '../animations/PageTransition';
import useLanguageStore from '../stores/useLanguageStore';
import useCartStore from '../stores/useCartStore';
import { formatPrice } from '../utils/formatters';

const Cart = () => {
  const { t, language } = useLanguageStore();
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore();
  const total = getTotal();
  const shipping = total >= 100 ? 0 : 15;

  if (items.length === 0) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <FiShoppingBag className="w-16 h-16 text-muted/30 mx-auto mb-6" />
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">{t('cart.empty')}</h1>
          <p className="text-muted mb-8">{t('home.heroSubtitle')}</p>
          <Link to="/books" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent-light transition-colors">
            {t('cart.continueShopping')} <FiArrowRight />
          </Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-display font-bold text-foreground mb-8">
          {t('cart.title')} ({items.length})
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const title = language === 'ar' && item.book.titleAr ? item.book.titleAr : item.book.title;
              const author = language === 'ar' && item.book.authorAr ? item.book.authorAr : item.book.author;
              const cover = item.book._googleCover || (item.book.coverImage ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}/${item.book.coverImage}` : null);

              return (
                <motion.div
                  key={item.bookId}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="flex gap-4 p-4 bg-surface rounded-xl border border-muted/10"
                >
                  {/* Cover */}
                  <Link to={`/books/${item.book.slug}`} className="w-20 h-28 rounded-lg overflow-hidden bg-surface-alt flex-shrink-0">
                    {cover ? (
                      <img src={cover} alt={title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-accent/30 font-display font-bold text-2xl">
                        {title.charAt(0)}
                      </div>
                    )}
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/books/${item.book.slug}`} className="text-sm font-semibold text-foreground hover:text-accent transition-colors line-clamp-1">
                      {title}
                    </Link>
                    <p className="text-xs text-muted mt-0.5">{author}</p>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity */}
                      <div className="flex items-center border border-muted/20 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.bookId, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                        >
                          <FiMinus size={14} />
                        </button>
                        <span className="w-8 h-8 flex items-center justify-center text-sm font-medium text-foreground border-x border-muted/20">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.bookId, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                        >
                          <FiPlus size={14} />
                        </button>
                      </div>

                      {/* Price + Remove */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-foreground">
                          {formatPrice(parseFloat(item.book.price) * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeItem(item.bookId)}
                          className="p-1.5 text-muted hover:text-red-500 transition-colors"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            <div className="flex items-center justify-between pt-2">
              <Link to="/books" className="text-sm text-accent hover:text-accent-light transition-colors">
                {t('cart.continueShopping')}
              </Link>
              <button onClick={clearCart} className="text-sm text-red-500 hover:underline">
                Clear cart
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-xl border border-muted/10 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">{t('checkout.orderSummary')}</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">{t('cart.subtotal')}</span>
                  <span className="font-medium text-foreground">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">{t('cart.shipping')}</span>
                  <span className="font-medium text-foreground">
                    {shipping === 0 ? t('cart.freeShipping') : formatPrice(shipping)}
                  </span>
                </div>
                <div className="border-t border-muted/10 pt-3 flex justify-between">
                  <span className="font-semibold text-foreground">{t('cart.total')}</span>
                  <span className="font-bold text-lg text-foreground">{formatPrice(total + shipping)}</span>
                </div>
              </div>

              {shipping > 0 && (
                <p className="text-xs text-muted mt-3">
                  {language === 'ar' ? 'شحن مجاني للطلبات فوق 100 ر.ق' : 'Free shipping on orders over QAR 100'}
                </p>
              )}

              <Link
                to="/checkout"
                className="block w-full mt-6 py-3 bg-accent text-white text-center font-semibold rounded-xl hover:bg-accent-light transition-colors"
              >
                {t('cart.checkout')}
              </Link>

              <p className="text-xs text-muted text-center mt-3">
                {t('checkout.codNote')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Cart;
