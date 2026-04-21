import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiShoppingCart, FiHeart, FiStar, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import BookCard from '../components/books/BookCard';
import ReviewSection from '../components/books/ReviewSection';
import Image from '../components/common/Image';
import SEO from '../components/SEO';
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
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    if (reviewModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [reviewModalOpen]);

  const refreshBook = async () => {
    try {
      const res = await api.get(`/books/${slug}`);
      setBook(res.data);
    } catch {}
  };

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
    );
  }

  if (!book) {
    return (
      <>
        <SEO title="Book not found" noindex />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <p className="text-xl text-foreground/60">{t('common.noResults')}</p>
          <Link to="/books" className="mt-4 inline-flex items-center gap-2 text-accent hover:text-accent-light">
            <FiArrowLeft /> {t('common.back')}
          </Link>
        </div>
      </>
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

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');
  const coverPath = book.coverImage || null;
  const placeholderPath = (() => {
    if (coverPath) return null;
    const cat = book.category;
    return cat?.parent?.parent?.parent?.placeholderImage || cat?.parent?.parent?.placeholderImage || cat?.parent?.placeholderImage || cat?.placeholderImage || null;
  })();
  const coverUrl = coverPath ? `${API_BASE}/${coverPath}` : null;
  const placeholderUrl = placeholderPath ? `${API_BASE}/${placeholderPath}` : null;

  const hasDiscount = book.compareAtPrice && parseFloat(book.compareAtPrice) > parseFloat(book.price);
  const discountPercent = hasDiscount
    ? Math.round((1 - parseFloat(book.price) / parseFloat(book.compareAtPrice)) * 100)
    : 0;

  const bookUrl = `https://arkaan.qa/books/${book.slug}`;
  const seoImage = coverUrl || placeholderUrl || `https://arkaan.qa/arkaan-banner-logo.png`;
  const seoDescription = (description || `${title}${author ? ` by ${author}` : ''}. Available at Arkaan Bookstore in Doha, Qatar.`).slice(0, 300);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': bookUrl,
    name: title,
    description: description || undefined,
    image: seoImage,
    sku: book.sku || book.id,
    ...(book.isbn && {
      gtin13: book.isbn.replace(/[^0-9]/g, '').length === 13 ? book.isbn.replace(/[^0-9]/g, '') : undefined,
    }),
    ...(author && author !== 'Unknown' && author.trim() !== '' && {
      brand: { '@type': 'Brand', name: author },
      author: { '@type': 'Person', name: author },
    }),
    ...(publisher && {
      publisher: { '@type': 'Organization', name: publisher },
    }),
    aggregateRating: book.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: parseFloat(book.averageRating).toFixed(1),
      reviewCount: book.reviewCount,
    } : undefined,
    offers: {
      '@type': 'Offer',
      url: bookUrl,
      priceCurrency: 'QAR',
      price: parseFloat(book.price).toFixed(2),
      availability: book.isOutOfStock || book.stock <= 0
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Arkaan Bookstore' },
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://arkaan.qa/' },
      { '@type': 'ListItem', position: 2, name: 'Books', item: 'https://arkaan.qa/books' },
      ...(parentCat ? [{ '@type': 'ListItem', position: 3, name: parentCatName, item: `https://arkaan.qa/books?category=${parentCat.slug}` }] : []),
      ...(book.category ? [{ '@type': 'ListItem', position: parentCat ? 4 : 3, name: catName, item: `https://arkaan.qa/books?category=${book.category.slug}` }] : []),
      { '@type': 'ListItem', position: parentCat && book.category ? 5 : (book.category || parentCat ? 4 : 3), name: title, item: bookUrl },
    ],
  };

  return (
    <>
      <SEO
        title={`${title}${author && author !== 'Unknown' && author.trim() !== '' ? ` by ${author}` : ''}`}
        description={seoDescription}
        image={seoImage}
        url={bookUrl}
        type="product"
        jsonLd={{ '@context': 'https://schema.org', '@graph': [productJsonLd, breadcrumbJsonLd] }}
      />
      <div className="mx-auto px-4 sm:px-6 lg:px-6 xl:px-8 3xl:px-12 py-4 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm 3xl:text-lg text-foreground/60 mb-6">
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
          <div className="flex-shrink-0 lg:mx-0">
            <div className="flex flex-col gap-3 sm:gap-4 items-center sm:items-start">
              {/* Main cover */}
              <div className="relative w-[280px] sm:w-[320px] 3xl:w-[405px] h-[400px] sm:h-[460px] 3xl:h-[600px] bg-surface-alt rounded-xl overflow-hidden border border-muted/10">
                {(selectedImage || coverPath || placeholderPath) ? (
                  <Image
                    src={selectedImage || coverPath || placeholderPath}
                    alt={title}
                    width={405}
                    height={600}
                    sizes="(max-width: 640px) 280px, (max-width: 1024px) 320px, 405px"
                    priority
                    className="w-full h-full object-cover"
                  />
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

              {/* Thumbnail strip — below main image */}
              {book.images && book.images.length > 0 && (
                <div className="flex flex-row gap-2 sm:gap-2.5 flex-wrap">
                  {[coverPath, ...book.images].filter(Boolean).slice(0, 4).map((imgPath, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedImage(imgPath)}
                      className={`w-14 h-16 sm:w-16 sm:h-20 3xl:w-20 3xl:h-24 rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${(selectedImage || coverPath) === imgPath ? 'border-accent' : 'border-muted/15 hover:border-accent/50'}`}
                    >
                      <Image src={imgPath} alt="" width={80} height={96} sizes="80px" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Details */}
          <div
            className="flex-1 min-w-0 lg:max-w-md 3xl:max-w-lg lg:h-[460px] 3xl:h-[600px] lg:flex lg:flex-col"
          >
            {/* Category */}
            {(parentCatName || catName) && (
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                {parentCatName && (
                  <Link to={`/books?category=${parentCat.slug}`} className="text-accent hover:text-accent-light transition-colors">
                    {parentCatName}
                  </Link>
                )}
                {parentCatName && catName && <span className="text-foreground/60">/</span>}
                {catName && (
                  <Link to={`/books?category=${book.category.slug}`} className="text-accent hover:text-accent-light transition-colors">
                    {catName}
                  </Link>
                )}
              </div>
            )}

            {/* Title */}
            <h1 className="text-xl sm:text-3xl lg:text-4xl 3xl:text-5xl font-display font-bold text-foreground mt-3 sm:mt-4 leading-tight">
              {title}
            </h1>

            {/* Author */}
            {author && author !== 'Unknown' && author.trim() !== '' && <p className="text-sm sm:text-lg 3xl:text-2xl text-foreground/60 mt-1 sm:mt-2">{author}</p>}

            {/* Rating — mobile only, desktop shows in right column */}
            <button onClick={() => setReviewModalOpen(true)} className="flex lg:hidden items-center gap-2 mt-3 sm:mt-5 cursor-pointer hover:opacity-80 transition-opacity">
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
              <span className="text-sm text-foreground/50 underline underline-offset-2">({book.reviewCount} {t('book.reviews')})</span>
            </button>

            {/* Price + Quantity + Buttons — pushed to bottom on desktop */}
            <div className="lg:mt-auto">
            {/* Price */}
            <div className="flex items-center gap-2 sm:gap-3 mt-5 sm:mt-7 lg:mt-0">
              <span className="text-2xl sm:text-3xl 3xl:text-5xl font-bold text-foreground">{formatPrice(book.price)}</span>
              {hasDiscount && (
                <span className="text-sm sm:text-lg text-foreground/40 line-through">{formatPrice(book.compareAtPrice)}</span>
              )}
            </div>

            {/* Quantity + Wishlist + Buttons */}
            <div className="inline-flex flex-col gap-5 sm:gap-6 mt-5 sm:mt-6">
            <div className="flex items-center">
              <div className="flex items-center border border-muted/20 rounded-lg">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 sm:w-12 sm:h-11 3xl:w-16 3xl:h-14 flex items-center justify-center text-foreground hover:bg-surface-alt transition-colors rounded-l-lg rtl:rounded-l-none rtl:rounded-r-lg text-sm sm:text-base 3xl:text-lg">-</button>
                <span className="w-14 h-10 sm:w-16 sm:h-11 3xl:w-20 3xl:h-14 flex items-center justify-center text-sm sm:text-base 3xl:text-lg font-medium text-foreground border-x border-muted/20">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 sm:w-12 sm:h-11 3xl:w-16 3xl:h-14 flex items-center justify-center text-foreground hover:bg-surface-alt transition-colors rounded-r-lg rtl:rounded-r-none rtl:rounded-l-lg text-sm sm:text-base 3xl:text-lg">+</button>
              </div>

              <button
                onClick={() => {
                  toggleWishlist(book.id);
                  toast.success(inWishlist ? t('book.removedFromWishlistToast') : t('book.addedToWishlistToast'));
                }}
                className={`ms-auto me-6 sm:me-10 w-8 h-8 sm:w-10 sm:h-10 3xl:w-12 3xl:h-12 flex items-center justify-center rounded-lg sm:rounded-xl border-2 transition-all active:scale-90 ${
                  inWishlist
                    ? 'border-red-500 bg-red-500 text-white'
                    : 'border-gray-300 text-gray-400 hover:border-red-500 hover:text-red-500'
                }`}
              >
                <FiHeart size={15} className={`sm:w-[18px] sm:h-[18px] ${inWishlist ? 'fill-white' : ''}`} />
              </button>
            </div>

            {/* Add to Cart + Buy Now */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { addItem(book, quantity); toast.success(t('books.addedToCart')); }}
                disabled={book.isOutOfStock}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 3xl:px-8 py-2 sm:py-2.5 3xl:py-3 bg-[#A39666] text-white text-xs sm:text-sm 3xl:text-base font-medium rounded-lg hover:bg-[#B8AB7E] active:scale-[0.97] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiShoppingCart size={14} />
                {t('common.addToCart')}
              </button>

              {!book.isOutOfStock ? (
                <Link
                  to="/cart"
                  onClick={() => { addItem(book, quantity); toast.success(t('books.addedToCart')); }}
                  className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 3xl:px-8 py-2 sm:py-2.5 3xl:py-3 text-xs sm:text-sm 3xl:text-base font-medium rounded-lg transition-colors"
                  style={{ backgroundColor: '#7A1B4E', color: 'white' }}
                >
                  {t('common.buyNow')}
                </Link>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 3xl:px-8 py-2 sm:py-2.5 3xl:py-3 text-xs sm:text-sm 3xl:text-base font-medium rounded-lg transition-colors opacity-50 cursor-not-allowed"
                  style={{ backgroundColor: '#7A1B4E', color: 'white' }}
                >
                  {t('common.buyNow')}
                </button>
              )}
            </div>

            {/* Stock info */}
            {book.isOutOfStock && (
              <p className="text-xs sm:text-sm mt-2 sm:mt-3 font-medium text-red-500">
                {t('books.outOfStock')}
              </p>
            )}
            </div>
            </div>

            {/* Product Details — mobile only */}
            {(() => {
              const rawFields = book.category?.parent?.parent?.parent?.detailFields || book.category?.parent?.parent?.detailFields || book.category?.parent?.detailFields || book.category?.detailFields;
              let allowed = null;
              if (rawFields) { try { const parsed = JSON.parse(rawFields); allowed = Array.isArray(parsed) ? parsed : parsed.detail || null; } catch {} }
              const show = (key) => !allowed || allowed.includes(key);

              const items = [
                show('author') && author && author !== 'Unknown' && author.trim() !== '' && { label: t('books.author'), value: author },
                show('publisher') && publisher && { label: t('book.publisher'), value: publisher },
                show('pages') && book.pages && { label: t('book.pages'), value: book.pages },
                show('isbn') && book.isbn && { label: t('book.isbn'), value: book.isbn },
                show('barcode') && book.sku && { label: t('books.barcode'), value: book.sku },
                show('language') && book.language && { label: t('books.language'), value: book.language === 'ar' ? t('books.langArabic') : t('books.langEnglish') },
                show('publishedDate') && book.publishedDate && { label: t('book.published'), value: language === 'ar' ? formatDateAr(book.publishedDate) : formatDate(book.publishedDate) },
                show('brand') && book.brand && { label: t('books.brand'), value: language === 'ar' && book.brandAr ? book.brandAr : book.brand },
                show('color') && book.color && { label: t('books.color'), value: language === 'ar' && book.colorAr ? book.colorAr : book.color },
                show('material') && book.material && { label: t('books.material'), value: language === 'ar' && book.materialAr ? book.materialAr : book.material },
                show('dimensions') && book.dimensions && { label: t('books.dimensions'), value: book.dimensions },
                show('ageRange') && book.ageRange && { label: t('books.ageRange'), value: book.ageRange },
              ].filter(Boolean);

              // Add custom field values
              if (book.customFields) {
                try {
                  const cfValues = typeof book.customFields === 'string' ? JSON.parse(book.customFields) : book.customFields;
                  const rawCF = book.category?.parent?.parent?.parent?.customFields || book.category?.parent?.parent?.customFields || book.category?.parent?.customFields || book.category?.customFields;
                  let cfDefs = [];
                  if (rawCF) { try { cfDefs = JSON.parse(rawCF); } catch {} }
                  cfDefs.forEach((def) => {
                    const val = cfValues[def.key];
                    if (val && (val.value || val.valueAr)) {
                      items.push({ label: language === 'ar' && def.nameAr ? def.nameAr : def.name, value: language === 'ar' && val.valueAr ? val.valueAr : val.value });
                    }
                  });
                } catch {}
              }

              if (items.length === 0) return null;

              return (
                <div className="lg:hidden mt-5 pt-4 border-t border-muted/10">
                  <h3 className="text-sm font-semibold text-foreground mb-3">{t('book.details')}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((item, i) => (
                      <div key={i} className="bg-surface-alt/60 border border-muted/8 rounded-lg px-2.5 py-2">
                        <p className="text-[10px] sm:text-xs text-foreground/40 uppercase tracking-wider">{item.label}</p>
                        <p className="text-xs sm:text-sm text-foreground font-medium mt-0.5 truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Description — mobile only */}
            {description && (
              <div className="lg:hidden mt-5 pt-4 border-t border-muted/10">
                <h3 className="text-base font-semibold text-foreground mb-2">{t('book.description')}</h3>
                <p className="text-foreground/70 text-sm leading-relaxed whitespace-pre-line break-words text-justify">{description}</p>
              </div>
            )}

          </div>

          {/* Product Details — right column */}
          {(() => {
            const rawFields = book.category?.parent?.parent?.parent?.detailFields || book.category?.parent?.parent?.detailFields || book.category?.parent?.detailFields || book.category?.detailFields;
            let allowed = null;
            if (rawFields) { try { const parsed = JSON.parse(rawFields); allowed = Array.isArray(parsed) ? parsed : parsed.detail || null; } catch {} }
            const show = (key) => !allowed || allowed.includes(key);

            const items = [
              show('author') && author && author !== 'Unknown' && author.trim() !== '' && { label: t('books.author'), value: author },
              show('publisher') && publisher && { label: t('book.publisher'), value: publisher },
              show('pages') && book.pages && { label: t('book.pages'), value: book.pages },
              show('isbn') && book.isbn && { label: t('book.isbn'), value: book.isbn },
              show('barcode') && book.sku && { label: t('books.barcode'), value: book.sku },
              show('language') && book.language && { label: t('books.language'), value: book.language === 'ar' ? t('books.langArabic') : t('books.langEnglish') },
              show('publishedDate') && book.publishedDate && { label: t('book.published'), value: language === 'ar' ? formatDateAr(book.publishedDate) : formatDate(book.publishedDate) },
              show('brand') && book.brand && { label: t('books.brand'), value: language === 'ar' && book.brandAr ? book.brandAr : book.brand },
              show('color') && book.color && { label: t('books.color'), value: language === 'ar' && book.colorAr ? book.colorAr : book.color },
              show('material') && book.material && { label: t('books.material'), value: language === 'ar' && book.materialAr ? book.materialAr : book.material },
              show('dimensions') && book.dimensions && { label: t('books.dimensions'), value: book.dimensions },
              show('ageRange') && book.ageRange && { label: t('books.ageRange'), value: book.ageRange },
            ].filter(Boolean);

            // Add custom field values
            if (book.customFields) {
              try {
                const cfValues = typeof book.customFields === 'string' ? JSON.parse(book.customFields) : book.customFields;
                const rawCF = book.category?.parent?.parent?.parent?.customFields || book.category?.parent?.parent?.customFields || book.category?.parent?.customFields || book.category?.customFields;
                let cfDefs = [];
                if (rawCF) { try { cfDefs = JSON.parse(rawCF); } catch {} }
                cfDefs.forEach((def) => {
                  const val = cfValues[def.key];
                  if (val && (val.value || val.valueAr)) {
                    items.push({ label: language === 'ar' && def.nameAr ? def.nameAr : def.name, value: language === 'ar' && val.valueAr ? val.valueAr : val.value });
                  }
                });
              } catch {}
            }

            if (items.length === 0) return null;

            return (
              <div className="hidden lg:block flex-1 min-w-[300px] h-fit xl:ms-4 2xl:ms-8 3xl:ms-12">
                <div className="flex items-center justify-between mb-4 max-w-[460px] 3xl:max-w-[540px]">
                  <h3 className="text-base 3xl:text-xl font-semibold text-foreground">{t('book.details')}</h3>
                  <button onClick={() => setReviewModalOpen(true)} className="flex items-center gap-1.5 3xl:gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <FiStar key={i} size={14} className={`3xl:w-[18px] 3xl:h-[18px] ${i < Math.round(parseFloat(book.averageRating)) ? 'text-yellow-500 fill-yellow-500' : 'text-muted/30'}`} />
                      ))}
                    </div>
                    <span className="text-sm 3xl:text-base font-medium text-foreground">{parseFloat(book.averageRating).toFixed(1)}</span>
                    <span className="text-sm 3xl:text-base text-foreground/50">({book.reviewCount} {t('book.reviews')})</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-6 gap-2.5 3xl:gap-4">
                  {items.slice(0, 18).map((item, i) => (
                    <div key={i} className="bg-surface-alt/60 border border-muted/8 rounded-lg px-3 py-2.5 3xl:px-5 3xl:py-4">
                      <p className="text-[10px] 3xl:text-sm text-foreground/40 uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm 3xl:text-lg text-foreground font-medium mt-1 truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
                {description && (
                  <div className="mt-5 pt-4 border-t border-black">
                    <h3 className="text-base 3xl:text-xl font-semibold text-foreground mb-2 3xl:mb-3">{t('book.description')}</h3>
                    <p className="text-foreground/70 text-sm 3xl:text-lg leading-relaxed 3xl:leading-relaxed whitespace-pre-line break-words text-justify">{description}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Review Modal */}
        {reviewModalOpen && (
          <>
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setReviewModalOpen(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-background rounded-2xl shadow-2xl border border-muted/15 w-full max-w-2xl lg:max-w-3xl 3xl:max-w-4xl max-h-[85vh] overflow-y-auto pointer-events-auto" style={{ scrollbarWidth: 'thin' }}>
                <div className="sticky top-0 bg-background border-b border-muted/10 px-5 py-4 flex items-center justify-between z-10">
                  <h2 className="text-lg font-semibold text-foreground">{t('book.reviews')} {book.reviewCount > 0 && `(${book.reviewCount})`}</h2>
                  <button onClick={() => setReviewModalOpen(false)} className="p-1.5 text-foreground/60 hover:text-foreground hover:bg-surface-alt rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="p-5">
                  <ReviewSection bookId={book.id} book={book} onReviewChange={refreshBook} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-display font-bold text-foreground mb-6">
              {t('book.similarBooks')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 3xl:grid-cols-6 gap-3">
              {recommendations.slice(0, 5).map((rec) => (
                <BookCard key={rec.id} book={rec} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
};

export default BookDetail;
