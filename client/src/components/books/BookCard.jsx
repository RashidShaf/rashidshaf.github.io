import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiShoppingCart, FiHeart, FiStar, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../../stores/useLanguageStore';
import useCartStore from '../../stores/useCartStore';
import useWishlistStore from '../../stores/useWishlistStore';
import { formatPrice } from '../../utils/formatters';

const BookCard = ({ book, comingSoon = false }) => {
  const { t, language } = useLanguageStore();
  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);

  const title = language === 'ar' && book.titleAr ? book.titleAr : book.title;
  const author = language === 'ar' && book.authorAr ? book.authorAr : book.author;
  const inWishlist = isInWishlist(book.id);

  const coverUrl = book.coverImage ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}/${book.coverImage}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group bg-surface rounded-lg border border-muted/10 overflow-hidden hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
    >
      {/* Cover Image */}
      <Link to={comingSoon ? '#' : `/books/${book.slug}`} className="block relative aspect-[5/6] bg-surface-alt overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
            <span className="text-4xl font-display font-bold text-accent/30">
              {title.charAt(0)}
            </span>
          </div>
        )}

        {/* Hover Overlay */}
        {!comingSoon && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  addItem(book, 1);
                  toast.success(t('books.addedToCart'));
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-light transition-colors"
              >
                <FiShoppingCart size={14} />
                {t('common.addToCart')}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleItem(book.id);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  inWishlist
                    ? 'bg-red-500 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <FiHeart size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Badge */}
        {comingSoon ? (
          <span className="absolute top-2 left-2 rtl:left-auto rtl:right-2 px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-amber-500 text-white flex items-center gap-1">
            <FiClock size={10} />
            {language === 'ar' ? 'قريباً' : 'Coming Soon'}
          </span>
        ) : (
          book.compareAtPrice && parseFloat(book.compareAtPrice) > parseFloat(book.price) && (
            <span className="absolute top-2 left-2 rtl:left-auto rtl:right-2 px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-md">
              SALE
            </span>
          )
        )}
      </Link>

      {/* Info */}
      <div className="px-3 py-3">
        <Link to={comingSoon ? '#' : `/books/${book.slug}`}>
          <h3 className="text-[15px] font-bold text-foreground line-clamp-1 hover:text-accent transition-colors leading-tight">
            {title}
          </h3>
        </Link>
        <p className="text-[13px] text-muted mt-1 line-clamp-1">{author}</p>

        {!comingSoon && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-foreground">
                {formatPrice(book.price)}
              </span>
              {book.compareAtPrice && parseFloat(book.compareAtPrice) > parseFloat(book.price) && (
                <span className="text-[11px] text-muted line-through">
                  {formatPrice(book.compareAtPrice)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <FiStar className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-[11px] font-medium text-foreground">
                {parseFloat(book.averageRating).toFixed(1)}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default BookCard;
