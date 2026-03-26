import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiTrash2, FiShoppingCart, FiShoppingBag } from 'react-icons/fi';
import { motion } from 'framer-motion';
import PageTransition from '../animations/PageTransition';
import useLanguageStore from '../stores/useLanguageStore';
import useAuthStore from '../stores/useAuthStore';
import useCartStore from '../stores/useCartStore';
import useWishlistStore from '../stores/useWishlistStore';
import { formatPrice } from '../utils/formatters';
import api from '../utils/api';

const Wishlist = () => {
  const { t, language } = useLanguageStore();
  const user = useAuthStore((s) => s.user);
  const addToCart = useCartStore((s) => s.addItem);
  const { items: localItems, removeItem } = useWishlistStore();
  const [serverItems, setServerItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      api.get('/wishlist').then((res) => setServerItems(res.data)).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const books = user
    ? serverItems.map((item) => item.book).filter(Boolean)
    : [];

  const handleRemove = async (bookId) => {
    removeItem(bookId);
    if (user) {
      await api.delete(`/wishlist/${bookId}`).catch(() => {});
      setServerItems((items) => items.filter((i) => i.bookId !== bookId));
    }
  };

  const isEmpty = user ? books.length === 0 : localItems.length === 0;

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-display font-bold text-foreground mb-8">{t('profile.myWishlist')}</h1>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-surface-alt rounded-xl animate-pulse" />)}
          </div>
        ) : isEmpty ? (
          <div className="text-center py-16">
            <FiHeart className="w-14 h-14 text-muted/30 mx-auto mb-4" />
            <p className="text-muted mb-2">{t('common.noResults')}</p>
            <Link to="/books" className="inline-block mt-4 text-sm text-accent hover:underline">{t('cart.continueShopping')}</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {books.map((book) => {
              const title = language === 'ar' && book.titleAr ? book.titleAr : book.title;
              const author = language === 'ar' && book.authorAr ? book.authorAr : book.author;
              const cover = book.coverImage ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}/${book.coverImage}` : null;

              return (
                <motion.div key={book.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-muted/10">
                  <Link to={`/books/${book.slug}`} className="w-16 h-20 rounded-lg overflow-hidden bg-surface-alt flex-shrink-0">
                    {cover ? <img src={cover} alt={title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-accent/30 font-bold text-xl">{title.charAt(0)}</div>}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/books/${book.slug}`} className="text-sm font-semibold text-foreground hover:text-accent line-clamp-1">{title}</Link>
                    <p className="text-xs text-muted">{author}</p>
                    <p className="text-sm font-bold text-foreground mt-1">{formatPrice(book.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { addToCart(book, 1); }} className="p-2 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors" title={t('common.addToCart')}>
                      <FiShoppingCart size={16} />
                    </button>
                    <button onClick={() => handleRemove(book.id)} className="p-2 text-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default Wishlist;
