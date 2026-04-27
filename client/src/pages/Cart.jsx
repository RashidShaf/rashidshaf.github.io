import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiShoppingCart, FiTrash2, FiPlus, FiMinus, FiArrowRight, FiShoppingBag, FiCreditCard } from 'react-icons/fi';
import Image from '../components/common/Image';
import SEO from '../components/SEO';
import useLanguageStore from '../stores/useLanguageStore';
import useCartStore from '../stores/useCartStore';
import useAuthStore from '../stores/useAuthStore';
import { formatPrice } from '../utils/formatters';

const Cart = () => {
  const { t, language } = useLanguageStore();
  const { items, updateQuantity, removeItem, getTotal, clearCart, paymentMethod, setPaymentMethod, fetchCart } = useCartStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user) fetchCart();
  }, []);

  const total = getTotal();

  const hasUnavailable = items.some((item) => (
    item.book.isOutOfStock
    || (item.variant && (item.variant.isActive === false || item.variant.isOutOfStock))
  ));

  if (items.length === 0) {
    return (
      <>
        <SEO title="Cart" noindex />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <FiShoppingBag className="w-16 h-16 text-muted/30 mx-auto mb-6" />
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">{t('cart.empty')}</h1>
          <p className="text-foreground/60 mb-8">{t('home.heroSubtitle')}</p>
          <Link to="/books" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-medium rounded-xl hover:bg-accent-light transition-colors">
            {t('cart.continueShopping')} <FiArrowRight />
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Cart" noindex />
      <div className="mx-auto px-4 sm:px-6 lg:px-6 xl:px-8 3xl:px-12 py-10">
        <h1 className="text-2xl 3xl:text-4xl font-display font-bold text-foreground mb-8">
          {t('cart.title')} ({items.length})
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const title = language === 'ar' && item.book.titleAr ? item.book.titleAr : item.book.title;
              const author = language === 'ar' && item.book.authorAr ? item.book.authorAr : item.book.author;
              const coverPath = item.variant?.image || item.book.coverImage || null;
              const variantLabel = item.variant
                ? (language === 'ar' && item.variant.labelAr ? item.variant.labelAr : item.variant.label)
                : null;
              const variantColor = item.variant
                ? (language === 'ar' && item.variant.colorAr ? item.variant.colorAr : item.variant.color)
                : null;
              const unitPrice = parseFloat(item.variant?.price ?? item.book.price);
              const unavailable = item.book.isOutOfStock
                || (item.variant && (item.variant.isActive === false || item.variant.isOutOfStock));
              const rowKey = `${item.bookId}__${item.variantId || ''}`;

              return (
                <div
                  key={rowKey}
                  className="flex gap-4 p-4 bg-surface rounded-xl border border-muted/10"
                >
                  {/* Cover */}
                  <Link to={`/books/${item.book.slug}${item.variantId ? `?v=${item.variantId}` : ''}`} className="w-20 h-28 rounded-lg overflow-hidden bg-surface-alt flex-shrink-0">
                    {coverPath ? (
                      <Image src={coverPath} alt={title} width={80} height={112} sizes="80px" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-accent/30 font-display font-bold text-2xl">
                        {title.charAt(0)}
                      </div>
                    )}
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/books/${item.book.slug}${item.variantId ? `?v=${item.variantId}` : ''}`} className="text-sm 3xl:text-lg font-semibold text-foreground hover:text-accent transition-colors line-clamp-1">
                      {title}
                    </Link>
                    {author && <p className="text-xs text-foreground/60 mt-0.5">{author}</p>}

                    {/* Variant sub-line */}
                    {variantLabel && (
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-foreground/70">
                        {item.variant?.color && (
                          <span
                            className="inline-block w-3 h-3 rounded-full border border-muted/30"
                            style={{ backgroundColor: item.variant.color }}
                            aria-hidden="true"
                          />
                        )}
                        <span>{variantLabel}</span>
                        {variantColor && <span>· {variantColor}</span>}
                      </div>
                    )}

                    {unavailable && (
                      <p className="text-[11px] text-red-500 mt-1">{t('books.outOfStock')}</p>
                    )}

                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                      {/* Quantity */}
                      <div className="flex items-center border border-muted/20 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.bookId, item.variantId, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
                        >
                          <FiMinus size={14} />
                        </button>
                        <span className="w-8 h-8 flex items-center justify-center text-sm font-medium text-foreground border-x border-muted/20">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.bookId, item.variantId, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
                        >
                          <FiPlus size={14} />
                        </button>
                      </div>

                      {/* Price + Remove */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm 3xl:text-lg font-bold text-foreground">
                          {formatPrice(unitPrice * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeItem(item.bookId, item.variantId)}
                          className="p-1.5 text-foreground/60 hover:text-red-500 transition-colors"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-4">
              <Link to="/books" className="inline-flex items-center gap-2 px-5 py-2.5 border border-accent text-accent text-sm font-medium rounded-xl hover:bg-accent hover:text-white transition-colors">
                {t('cart.continueShopping')}
              </Link>
              <button onClick={clearCart} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
                <FiTrash2 size={14} />
                {t('cart.clearCart')}
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-xl border border-muted/10 p-4 sm:p-6 sticky top-6">
              <h2 className="text-lg 3xl:text-2xl font-semibold text-foreground mb-4">{t('checkout.orderSummary')}</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/70">{t('cart.subtotal')}</span>
                  <span className="font-medium text-foreground">{formatPrice(total)}</span>
                </div>
                <div className="border-t border-gray-300 pt-3 flex justify-between">
                  <span className="font-semibold text-foreground">{t('cart.total')}</span>
                  <span className="font-bold text-lg text-foreground">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-foreground mb-2">{t('checkout.paymentMethod')}</p>

                {/* COD Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('COD')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                    paymentMethod === 'COD'
                      ? 'border-accent bg-accent/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    paymentMethod === 'COD' ? 'border-accent' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'COD' && <div className="w-2 h-2 rounded-full bg-accent" />}
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                    COD
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t('cart.codTitle')}</p>
                    <p className="text-xs text-foreground/50">{t('checkout.codNote')}</p>
                  </div>
                </button>

                {/* Online Payment Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ONLINE')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                    paymentMethod === 'ONLINE'
                      ? 'border-accent bg-accent/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    paymentMethod === 'ONLINE' ? 'border-accent' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'ONLINE' && <div className="w-2 h-2 rounded-full bg-accent" />}
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
                    <FiCreditCard size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{t('cart.onlinePayment')}</p>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-600 rounded">{t('cart.comingSoon')}</span>
                    </div>
                    <p className="text-xs text-foreground/50">{t('cart.onlinePaymentDesc')}</p>
                  </div>
                </button>
              </div>

              {hasUnavailable ? (
                <button
                  type="button"
                  disabled
                  className="block w-full mt-4 py-3 bg-muted/30 text-foreground/50 text-center font-semibold rounded-xl cursor-not-allowed"
                  title={t('cart.removeUnavailableFirst')}
                >
                  {t('cart.checkout')}
                </button>
              ) : (
                <Link
                  to="/checkout"
                  className="block w-full mt-4 py-3 bg-accent text-white text-center font-semibold rounded-xl hover:bg-accent-light transition-colors"
                >
                  {t('cart.checkout')}
                </Link>
              )}
              {hasUnavailable && (
                <p className="text-xs text-red-500 mt-2 text-center">{t('cart.removeUnavailableFirst')}</p>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Cart;
