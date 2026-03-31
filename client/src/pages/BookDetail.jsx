import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiShoppingCart, FiHeart, FiStar, FiBook, FiArrowLeft,
  FiPackage, FiDownload, FiEye, FiShare2,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageTransition from '../animations/PageTransition';
import BookCard from '../components/books/BookCard';
import ReviewSection from '../components/books/ReviewSection';
import useLanguageStore from '../stores/useLanguageStore';
import useAuthStore from '../stores/useAuthStore';
import useCartStore from '../stores/useCartStore';
import useWishlistStore from '../stores/useWishlistStore';
import { formatPrice, formatDate, formatDateAr } from '../utils/formatters';
import api from '../utils/api';

const BookDetail = () => {
  const { slug } = useParams();
  const { t, language } = useLanguageStore();
  const addItem = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const wishlistItems = useWishlistStore((s) => s.items);

  const [book, setBook] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchBookData = async () => {
      setLoading(true);
      try {
        let bookData = null;
        let recs = [];

        const res = await api.get(`/books/${slug}`);
        bookData = res.data;
        try {
          const recRes = await api.get(`/books/${res.data.id}/recommendations`);
          recs = recRes.data;
        } catch {}

        setBook(bookData);
        setRecommendations(recs);
      } catch (err) {
        console.error('Failed to load book:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookData();
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-10 animate-pulse">
            <div className="aspect-[3/4] bg-surface-alt rounded-2xl" />
            <div className="space-y-4 py-4">
              <div className="h-4 bg-surface-alt rounded w-1/4" />
              <div className="h-8 bg-surface-alt rounded w-3/4" />
              <div className="h-4 bg-surface-alt rounded w-1/3" />
              <div className="h-6 bg-surface-alt rounded w-1/4 mt-6" />
              <div className="h-20 bg-surface-alt rounded mt-6" />
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!book) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <p className="text-xl text-muted">{t('common.noResults')}</p>
          <Link to="/books" className="mt-4 inline-flex items-center gap-2 text-accent hover:text-accent-light">
            <FiArrowLeft /> {t('common.back')}
          </Link>
        </div>
      </PageTransition>
    );
  }

  const title = language === 'ar' && book.titleAr ? book.titleAr : book.title;
  const author = language === 'ar' && book.authorAr ? book.authorAr : book.author;
  const description = language === 'ar' && book.descriptionAr ? book.descriptionAr : book.description;
  const publisher = language === 'ar' && book.publisherAr ? book.publisherAr : book.publisher;
  const catName = book.category ? (language === 'ar' && book.category.nameAr ? book.category.nameAr : book.category.name) : null;
  const parentCat = book.category?.parent;
  const parentCatName = parentCat ? (language === 'ar' && parentCat.nameAr ? parentCat.nameAr : parentCat.name) : null;
  const inWishlist = wishlistItems.includes(book.id);

  const coverUrl = book.coverImage ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}/${book.coverImage}` : null;

  const hasDiscount = book.compareAtPrice && parseFloat(book.compareAtPrice) > parseFloat(book.price);
  const discountPercent = hasDiscount
    ? Math.round((1 - parseFloat(book.price) / parseFloat(book.compareAtPrice)) * 100)
    : 0;

  return (
    <PageTransition>
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 py-4 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted mb-6">
          <Link to="/" className="hover:text-accent transition-colors">{t('nav.home')}</Link>
          {parentCatName && (
            <>
              <span>/</span>
              <Link to={`/books?category=${parentCat.slug}`} className="hover:text-accent transition-colors">{parentCatName}</Link>
            </>
          )}
          {catName && (
            <>
              <span>/</span>
              <Link to={`/books?category=${book.category.slug}`} className="hover:text-accent transition-colors">{catName}</Link>
            </>
          )}
          {!parentCatName && !catName && (
            <>
              <span>/</span>
              <Link to="/books" className="hover:text-accent transition-colors">{t('books.title')}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground truncate max-w-[120px] sm:max-w-[200px]">{title}</span>
        </nav>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Image Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-shrink-0 lg:mx-0"
          >
            <div className="flex gap-2 sm:gap-4 items-start">
              {/* Thumbnail strip */}
              <div className="flex flex-col gap-1.5 sm:gap-2 w-10 sm:w-14 flex-shrink-0">
                {book.images && book.images.length > 0 ? (
                  [coverUrl, ...book.images.map((img) => `${import.meta.env.VITE_API_URL?.replace('/api', '')}/${img}`)].filter(Boolean).slice(0, 4).map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedImage(img)}
                      className={`w-10 sm:w-14 h-12 sm:h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${(selectedImage || coverUrl) === img ? 'border-accent' : 'border-muted/15 hover:border-accent/50'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))
                ) : null}
              </div>

              {/* Main cover */}
              <div className="flex-1 flex justify-center sm:justify-start">
              <div className="relative w-[140px] sm:w-[280px] h-[200px] sm:h-[360px] bg-surface-alt rounded-xl overflow-hidden border border-muted/10">
              {(selectedImage || coverUrl) ? (
                <img src={selectedImage || coverUrl} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                  <span className="text-5xl font-display font-bold text-accent/20">{title.charAt(0)}</span>
                </div>
              )}
              {hasDiscount && (
                <span className="absolute top-3 left-3 rtl:left-auto rtl:right-3 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-md">
                  -{discountPercent}%
                </span>
              )}
            </div>
            </div>
            </div>

          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="flex-1 min-w-0"
          >
            {/* Category */}
            {(parentCatName || catName) && (
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                {parentCatName && (
                  <Link to={`/books?category=${parentCat.slug}`} className="text-accent hover:text-accent-light transition-colors">
                    {parentCatName}
                  </Link>
                )}
                {parentCatName && catName && <span className="text-muted">/</span>}
                {catName && (
                  <Link to={`/books?category=${book.category.slug}`} className="text-accent hover:text-accent-light transition-colors">
                    {catName}
                  </Link>
                )}
              </div>
            )}

            {/* Title */}
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mt-2 leading-tight">
              {title}
            </h1>

            {/* Author */}
            <p className="text-sm sm:text-lg text-foreground/60 mt-1 sm:mt-2">{author}</p>

            {/* Rating */}
            <div className="flex items-center gap-2 mt-3 sm:mt-4">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <FiStar
                    key={i}
                    size={16}
                    className={i < Math.round(parseFloat(book.averageRating))
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-muted/30'
                    }
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-foreground">
                {parseFloat(book.averageRating).toFixed(1)}
              </span>
              <span className="text-sm text-foreground/50">({book.reviewCount} {t('book.reviews')})</span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-2 sm:gap-3 mt-4 sm:mt-6">
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{formatPrice(book.price)}</span>
              {hasDiscount && (
                <span className="text-sm sm:text-lg text-foreground/40 line-through">{formatPrice(book.compareAtPrice)}</span>
              )}
            </div>

            {/* Quantity + Buttons */}
            {/* Quantity + Wishlist */}
            <div className="flex items-center gap-2 sm:gap-3 mt-4 sm:mt-5">
              <div className="flex items-center border border-muted/20 rounded-lg">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-foreground hover:bg-surface-alt transition-colors rounded-l-lg rtl:rounded-l-none rtl:rounded-r-lg text-xs sm:text-sm">-</button>
                <span className="w-8 h-7 sm:w-10 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-medium text-foreground border-x border-muted/20">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(book.stock, quantity + 1))} disabled={quantity >= book.stock} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-foreground hover:bg-surface-alt transition-colors rounded-r-lg rtl:rounded-r-none rtl:rounded-l-lg text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">+</button>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  toggleWishlist(book.id);
                  toast.success(inWishlist ? t('book.removedFromWishlistToast') : t('book.addedToWishlistToast'));
                }}
                className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl border-2 transition-all ${
                  inWishlist
                    ? 'border-red-500 bg-red-500 text-white'
                    : 'border-gray-300 text-gray-400 hover:border-red-500 hover:text-red-500'
                }`}
              >
                <FiHeart size={15} className={`sm:w-[18px] sm:h-[18px] ${inWishlist ? 'fill-white' : ''}`} />
              </motion.button>
            </div>

            {/* Add to Cart + Buy Now */}
            <div className="flex items-center gap-2 mt-2 sm:mt-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { addItem(book, quantity); toast.success(t('books.addedToCart')); }}
                disabled={book.stock === 0}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-[#A39666] text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#B8AB7E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiShoppingCart size={14} />
                {t('common.addToCart')}
              </motion.button>

              {book.stock > 0 ? (
                <Link
                  to="/checkout"
                  onClick={() => { addItem(book, quantity); toast.success(t('books.addedToCart')); }}
                  className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors"
                  style={{ backgroundColor: '#7A1B4E', color: 'white' }}
                >
                  {t('common.buyNow')}
                </Link>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors opacity-50 cursor-not-allowed"
                  style={{ backgroundColor: '#7A1B4E', color: 'white' }}
                >
                  {t('common.buyNow')}
                </button>
              )}
            </div>

            {/* Stock info */}
            {(
              <p className={`text-xs sm:text-sm mt-2 sm:mt-3 font-medium ${book.stock > 5 ? 'text-secondary' : book.stock > 0 ? 'text-red-500' : 'text-red-500'}`}>
                {book.stock > 5
                  ? `${t('books.inStock')}`
                  : book.stock > 0
                  ? t('books.lowStock', { count: book.stock })
                  : t('books.outOfStock')
                }
              </p>
            )}

            {/* Details — inline after buttons */}
            <div className="mt-6 pt-5 border-t border-gray-300/70">
              <div className="flex flex-wrap gap-x-4 sm:gap-x-8 gap-y-3 text-sm">
                {publisher && (
                  <div><span className="text-foreground/50">{t('book.publisher')}: </span><span className="text-foreground font-medium">{publisher}</span></div>
                )}
                {book.pages && (
                  <div><span className="text-foreground/50">{t('book.pages')}: </span><span className="text-foreground font-medium">{book.pages}</span></div>
                )}
                {book.isbn && (
                  <div><span className="text-foreground/50">{t('book.isbn')}: </span><span className="text-foreground font-medium">{book.isbn}</span></div>
                )}
                {book.language && (
                  <div><span className="text-foreground/50">{t('books.language')}: </span><span className="text-foreground font-medium capitalize">{book.language === 'ar' ? t('books.langArabic') : t('books.langEnglish')}</span></div>
                )}
                {book.publishedDate && (
                  <div><span className="text-foreground/50">{t('book.published')}: </span><span className="text-foreground font-medium">{language === 'ar' ? formatDateAr(book.publishedDate) : formatDate(book.publishedDate)}</span></div>
                )}
              </div>
            </div>

          </motion.div>
        </div>

        {/* Description — aligned with title */}
        {description && (
          <div className="mt-8 lg:ps-[380px]">
            <h3 className="text-lg font-semibold text-foreground mb-3">{t('book.description')}</h3>
            <p className="text-foreground/70 text-sm leading-relaxed whitespace-pre-line max-w-4xl">{description}</p>
          </div>
        )}

        {/* Reviews */}
        <div className="mt-8 lg:ps-[380px]">
          <ReviewSection bookId={book.id} book={book} />
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-display font-bold text-foreground mb-6">
              {t('book.similarBooks')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {recommendations.slice(0, 5).map((rec) => (
                <BookCard key={rec.id} book={rec} />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageTransition>
  );
};

export default BookDetail;
