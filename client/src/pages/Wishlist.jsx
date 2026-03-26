import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageTransition from '../animations/PageTransition';
import AccountLayout from '../components/common/AccountLayout';
import useLanguageStore from '../stores/useLanguageStore';
import useCartStore from '../stores/useCartStore';
import useWishlistStore from '../stores/useWishlistStore';
import { formatPrice } from '../utils/formatters';
import api from '../utils/api';

const Wishlist = () => {
  const { t, language } = useLanguageStore();
  const addToCart = useCartStore((s) => s.addItem);
  const { items: wishlistIds, removeItem } = useWishlistStore();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      if (wishlistIds.length === 0) { setBooks([]); setLoading(false); return; }
      try {
        const res = await api.get('/books?limit=100');
        const allBooks = res.data.data || res.data;
        setBooks(allBooks.filter((b) => wishlistIds.includes(b.id)));
      } catch { setBooks([]); }
      finally { setLoading(false); }
    };
    fetchBooks();
  }, [wishlistIds]);

  const handleRemove = (bookId) => {
    removeItem(bookId);
    toast.success(language === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from wishlist');
  };

  const handleAddToCart = (book) => {
    addToCart(book, 1);
    toast.success(t('books.addedToCart'));
  };

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');

  return (
    <PageTransition>
      <AccountLayout>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t('profile.myWishlist')}</h1>
            {books.length > 0 && <p className="text-sm text-foreground/50 mt-1">{books.length} {language === 'ar' ? 'كتب' : 'books'}</p>}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-surface-alt rounded-lg animate-pulse">
                <div className="aspect-[5/6] bg-muted/10 rounded-t-lg" />
                <div className="p-3 space-y-2"><div className="h-3 bg-muted/10 rounded w-2/3" /><div className="h-2.5 bg-muted/10 rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20">
            <FiHeart className="w-16 h-16 text-foreground/15 mx-auto mb-4" />
            <p className="text-foreground/50 text-lg font-medium mb-2">{language === 'ar' ? 'قائمة المفضلة فارغة' : 'Your wishlist is empty'}</p>
            <Link to="/books" className="inline-block mt-4 px-6 py-2.5 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent-light transition-colors">
              {t('cart.continueShopping')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {books.map((book) => {
              const title = language === 'ar' && book.titleAr ? book.titleAr : book.title;
              const author = language === 'ar' && book.authorAr ? book.authorAr : book.author;
              const cover = book.coverImage ? `${API_BASE}/${book.coverImage}` : null;

              return (
                <div key={book.id} className="group bg-surface rounded-lg border border-muted/10 overflow-hidden hover:shadow-lg transition-all">
                  {/* Cover */}
                  <Link to={`/books/${book.slug}`} className="block relative aspect-[5/6] bg-surface-alt overflow-hidden">
                    {cover ? (
                      <img src={cover} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                        <span className="text-4xl font-display font-bold text-accent/30">{title.charAt(0)}</span>
                      </div>
                    )}

                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                        <button
                          onClick={(e) => { e.preventDefault(); handleAddToCart(book); }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-light transition-colors"
                        >
                          <FiShoppingCart size={14} />
                          {t('common.addToCart')}
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); handleRemove(book.id); }}
                          className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Wishlist Badge */}
                    <div className="absolute top-2 end-2">
                      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                        <FiHeart className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="px-3 py-3">
                    <Link to={`/books/${book.slug}`}>
                      <h3 className="text-[15px] font-bold text-foreground line-clamp-1 hover:text-accent transition-colors leading-tight">{title}</h3>
                    </Link>
                    <p className="text-[13px] text-foreground/50 mt-1 line-clamp-1">{author}</p>
                    <p className="text-sm font-bold text-foreground mt-2">{formatPrice(book.price)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AccountLayout>
    </PageTransition>
  );
};

export default Wishlist;
