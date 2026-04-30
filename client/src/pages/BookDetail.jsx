import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { FiShoppingCart, FiHeart, FiStar, FiArrowLeft, FiInfo, FiX, FiShare2, FiLink } from 'react-icons/fi';
import { FaWhatsapp, FaFacebookF, FaXTwitter, FaInstagram, FaTiktok } from 'react-icons/fa6';
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [returnPolicyOpen, setReturnPolicyOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const shareMenuRef = useRef(null);
  const [publicSettings, setPublicSettings] = useState({});

  // Fetch public settings once on mount — used to build the "Inquire on
  // WhatsApp" link with the admin's number from settings.whatsapp.
  useEffect(() => {
    let cancelled = false;
    api.get('/settings/public').then((res) => {
      if (!cancelled) setPublicSettings(res.data || {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Close the share popover on outside click or ESC.
  useEffect(() => {
    if (!shareMenuOpen) return;
    const onPointer = (e) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target)) {
        setShareMenuOpen(false);
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') setShareMenuOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [shareMenuOpen]);
  const [returnPolicyText, setReturnPolicyText] = useState('');

  useEffect(() => {
    if (reviewModalOpen || returnPolicyOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [reviewModalOpen, returnPolicyOpen]);

  // Fetch return policy text when the modal opens. Re-fetches on language
  // change so the user sees the right localized text after switching.
  useEffect(() => {
    if (!returnPolicyOpen) return;
    let cancelled = false;
    api.get('/settings/public').then((res) => {
      if (cancelled) return;
      const s = res.data || {};
      const text = language === 'ar'
        ? (s.returnPolicyAr || s.returnPolicy || '')
        : (s.returnPolicy || s.returnPolicyAr || '');
      setReturnPolicyText(text);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [returnPolicyOpen, language]);

  // Close return-policy modal on Escape.
  useEffect(() => {
    if (!returnPolicyOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setReturnPolicyOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [returnPolicyOpen]);

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

  // Initialize selectedVariantId once the book loads.
  //   - If a `?v=` URL param points to an existing variant, restore that.
  //   - Otherwise, leave it null so the page shows the BASE product first.
  // Customers must explicitly pick an option to see/add a variant.
  useEffect(() => {
    if (!book || !book.hasVariants) {
      setSelectedVariantId(null);
      return;
    }
    const active = (book.variants || []).filter((v) => v.isActive !== false);
    const fromUrl = searchParams.get('v');
    const urlMatch = fromUrl ? active.find((v) => v.id === fromUrl) : null;
    if (urlMatch) {
      setSelectedVariantId(urlMatch.id);
      return;
    }
    setSelectedVariantId(null);
    // Clear an invalid ?v= so the URL stays clean
    if (fromUrl && !urlMatch) {
      const next = new URLSearchParams(searchParams);
      next.delete('v');
      setSearchParams(next, { replace: true });
    }
  }, [book?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // After refreshBook() (e.g. on review submit) the previously selected
  // variant might have been deactivated by an admin in another tab. Drop the
  // stale selection and clean the URL so the page doesn't keep showing
  // base price/sku while ?v=<dead-id> lingers.
  useEffect(() => {
    if (!book || !selectedVariantId) return;
    const active = (book.variants || []).filter((v) => v.isActive !== false);
    if (active.find((v) => v.id === selectedVariantId)) return;
    setSelectedVariantId(null);
    if (searchParams.get('v')) {
      const next = new URLSearchParams(searchParams);
      next.delete('v');
      setSearchParams(next, { replace: true });
    }
  }, [book?.variants]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Variants — when present, drive price/sku/color/image/stock instead of root book
  const hasVariants = !!book.hasVariants && Array.isArray(book.variants) && book.variants.length > 0;
  const activeVariants = hasVariants ? book.variants.filter((v) => v.isActive !== false) : [];
  const selectedVariant = hasVariants
    ? activeVariants.find((v) => v.id === selectedVariantId) || null
    : null;
  const effectivePrice = selectedVariant ? selectedVariant.price : book.price;
  const effectiveCompareAt = selectedVariant ? selectedVariant.compareAtPrice : book.compareAtPrice;
  const effectiveSku = selectedVariant ? selectedVariant.sku : book.sku;
  const effectiveColor = selectedVariant
    ? (language === 'ar' && selectedVariant.colorAr ? selectedVariant.colorAr : (selectedVariant.color || (language === 'ar' && book.colorAr ? book.colorAr : book.color)))
    : (language === 'ar' && book.colorAr ? book.colorAr : book.color);
  const effectiveVariantImage = selectedVariant?.image || null;
  // Per-field effective values — prefer variant override, fall back to base.
  //
  // CONTRACT: a variant column with NULL means "inherit from base". The admin
  // form's sanitizer converts empty strings ('') to null on save, so DB-stored
  // values are either non-empty or null. Therefore:
  //   • String fields use `||` — treat '' (defensive, from raw DB writes) as
  //     missing and fall back to base. Admin form never produces '' on save.
  //   • Numeric fields use `??` — preserve `0` as a real value and only fall
  //     back when the variant value is null/undefined.
  //   • Date fields use `||` — same as strings; '' from raw DB writes inherits.
  const effectiveDimensions = (selectedVariant?.dimensions) || book.dimensions;
  const effectiveWeight     = selectedVariant?.weight ?? book.weight;
  const effectiveBrand = (() => {
    const ar = selectedVariant?.brandAr || book.brandAr;
    const en = selectedVariant?.brand || book.brand;
    return language === 'ar' && ar ? ar : en;
  })();
  const effectiveMaterial = (() => {
    const ar = selectedVariant?.materialAr || book.materialAr;
    const en = selectedVariant?.material || book.material;
    return language === 'ar' && ar ? ar : en;
  })();
  const effectiveAgeRange = (selectedVariant?.ageRange) || book.ageRange;
  // Book-specific
  const effectiveAuthor = (() => {
    const ar = selectedVariant?.authorAr || book.authorAr;
    const en = selectedVariant?.author || book.author;
    return language === 'ar' && ar ? ar : en;
  })();
  const effectivePublisher = (() => {
    const ar = selectedVariant?.publisherAr || book.publisherAr;
    const en = selectedVariant?.publisher || book.publisher;
    return language === 'ar' && ar ? ar : en;
  })();
  const effectiveIsbn = selectedVariant?.isbn || book.isbn;
  const effectivePages = selectedVariant?.pages ?? book.pages;
  const effectiveLanguage = selectedVariant?.language || book.language;
  const effectivePublishedDate = selectedVariant?.publishedDate || book.publishedDate;
  // Merge customFields per key — variant override wins per key, even when
  // empty (so admin can explicitly blank a CF on a variant). The render-side
  // filter (`if (val.value || val.valueAr)`) drops empty values from display
  // so the row simply doesn't appear for a deliberately-blanked override.
  // Keys absent from variant.customFields fall through to base.
  const effectiveCustomFieldValues = (() => {
    const parse = (raw) => {
      if (!raw) return {};
      if (typeof raw === 'object') return raw;
      try { return JSON.parse(raw) || {}; } catch { return {}; }
    };
    const baseCfs = parse(book.customFields);
    const varCfs = parse(selectedVariant?.customFields);
    const merged = { ...baseCfs };
    Object.entries(varCfs).forEach(([key, val]) => {
      if (val) merged[key] = val; // override wins even if value is empty
    });
    return merged;
  })();
  // Base is always purchasable when book.isOutOfStock=false. Variant is
  // purchasable only when active and not out of stock. Unavailable means
  // whichever target the customer has currently selected is out.
  const isUnavailable = selectedVariant
    ? (selectedVariant.isOutOfStock || !selectedVariant.isActive)
    : book.isOutOfStock;

  const handlePickVariant = (variantId) => {
    setSelectedVariantId(variantId);
    setSelectedImage(null); // let the gallery default re-evaluate
    const next = new URLSearchParams(searchParams);
    if (variantId) next.set('v', variantId); else next.delete('v');
    setSearchParams(next, { replace: true });
  };

  const handleAddToCart = () => {
    // No variant selected ⇒ buy the base product. The server now accepts
    // variantId=null on hasVariants products as a valid base purchase.
    addItem(book, quantity, selectedVariant ? selectedVariant.id : null);
    toast.success(t('books.addedToCart'));
  };

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');
  const coverPath = book.coverImage || null;
  const placeholderPath = (() => {
    if (coverPath) return null;
    const cat = book.category;
    return cat?.parent?.parent?.parent?.placeholderImage || cat?.parent?.parent?.placeholderImage || cat?.parent?.placeholderImage || cat?.placeholderImage || null;
  })();
  const coverUrl = coverPath ? `${API_BASE}/${coverPath}` : null;
  const placeholderUrl = placeholderPath ? `${API_BASE}/${placeholderPath}` : null;

  const hasDiscount = effectiveCompareAt && parseFloat(effectiveCompareAt) > parseFloat(effectivePrice);
  const discountPercent = hasDiscount
    ? Math.round((1 - parseFloat(effectivePrice) / parseFloat(effectiveCompareAt)) * 100)
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
    sku: effectiveSku || book.id,
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
    offers: hasVariants && book.priceFrom
      ? {
          '@type': 'AggregateOffer',
          url: bookUrl,
          priceCurrency: 'QAR',
          lowPrice: parseFloat(book.priceFrom).toFixed(2),
          highPrice: parseFloat(book.priceTo).toFixed(2),
          offerCount: activeVariants.length,
          availability: isUnavailable
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', name: 'Arkaan Bookstore' },
        }
      : {
          '@type': 'Offer',
          url: bookUrl,
          priceCurrency: 'QAR',
          price: parseFloat(effectivePrice).toFixed(2),
          availability: isUnavailable
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
          {/* Image Gallery — centered on mobile + tablet (640–1023), left-aligned on desktop */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <div className="flex flex-col gap-3 sm:gap-4 items-center lg:items-start">
              {/* Main cover */}
              <div className="relative h-[400px] sm:h-[460px] 3xl:h-[600px] max-w-[90vw] sm:max-w-[480px] 3xl:max-w-[600px] bg-surface-alt rounded-xl overflow-hidden border border-muted/10">
                {(selectedImage || effectiveVariantImage || coverPath || placeholderPath) ? (
                  <Image
                    src={selectedImage || effectiveVariantImage || coverPath || placeholderPath}
                    alt={title}
                    width={600}
                    height={600}
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 480px, 600px"
                    priority
                    className="h-full w-auto max-w-full object-cover"
                  />
                ) : (
                  <div className="h-full aspect-square flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                    <span className="text-5xl font-display font-bold text-accent/20">{title.charAt(0)}</span>
                  </div>
                )}
                {hasDiscount && (
                  <span className="absolute top-3 left-3 rtl:left-auto rtl:right-3 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-md">
                    -{discountPercent}%
                  </span>
                )}
              </div>

              {/* Thumbnail strip — scope depends on what's selected:
                   • A variant is selected → show ONLY the variant's image
                     (the base product's additional photos belong to the base,
                     not to this variant — showing them would be misleading).
                   • Base is selected (or no variants) → show base cover plus
                     the book's additional images. */}
              {(() => {
                let thumbs;
                if (selectedVariant && effectiveVariantImage) {
                  thumbs = [effectiveVariantImage];
                } else {
                  thumbs = [coverPath, ...(book.images || [])].filter(Boolean);
                }
                // De-duplicate while preserving order
                const seen = new Set();
                const unique = thumbs.filter((p) => {
                  if (seen.has(p)) return false;
                  seen.add(p);
                  return true;
                }).slice(0, 5);
                if (unique.length <= 1) return null;
                const activeThumb = selectedImage || effectiveVariantImage || coverPath;
                return (
                  <div className="flex flex-row gap-2 sm:gap-2.5 flex-wrap">
                    {unique.map((imgPath, i) => (
                      <div
                        key={`${imgPath}-${i}`}
                        onClick={() => setSelectedImage(imgPath)}
                        className={`w-14 h-16 sm:w-16 sm:h-20 3xl:w-20 3xl:h-24 rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${activeThumb === imgPath ? 'border-primary' : 'border-muted/15 hover:border-primary/50'}`}
                      >
                        <Image src={imgPath} alt="" width={80} height={96} sizes="80px" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                );
              })()}
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

            {/* Variant picker — sits HIGH in the layout (right after the
                rating). First tile is the BASE product (always purchasable).
                Image first, color swatch fallback, grey letter as last resort.
                Price shows only in the main price element below, reflecting
                the selected target. */}
            {hasVariants && activeVariants.length > 0 && (
              <div className="mt-6 lg:mt-24 3xl:mt-36">
                <p className="text-[11px] sm:text-xs 3xl:text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-2 3xl:mb-3">
                  {t('books.chooseOption')}
                </p>
                <div className="flex flex-wrap gap-2 sm:gap-3 3xl:gap-4">
                  {/* Base tile */}
                  {(() => {
                    const isSelected = !selectedVariantId;
                    const isOut = book.isOutOfStock;
                    const baseLabel = t('books.default');
                    return (
                      <button
                        key="__base"
                        type="button"
                        onClick={() => handlePickVariant(null)}
                        title={baseLabel}
                        className="flex flex-col items-center gap-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#560736] focus-visible:ring-offset-2 cursor-pointer"
                      >
                        <div
                          className={`relative w-12 h-12 sm:w-14 sm:h-14 3xl:w-[72px] 3xl:h-[72px] rounded-full overflow-hidden border-2 transition-all ${
                            isSelected
                              ? 'border-primary ring-2 ring-[#560736]/40 scale-105'
                              : isOut
                                ? 'border-muted/15 opacity-50'
                                : 'border-muted/20 group-hover:border-primary/50'
                          }`}
                        >
                          {coverPath ? (
                            <Image
                              src={coverPath}
                              alt={baseLabel}
                              width={120}
                              height={120}
                              sizes="56px"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-surface-alt text-foreground/40 text-lg font-bold">
                              {(book.title || '?').trim().charAt(0).toUpperCase()}
                            </div>
                          )}
                          {isOut && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <span className="text-[8px] font-bold text-white uppercase tracking-wider rotate-[-15deg]">
                                {t('books.outOfStock')}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] sm:text-[11px] 3xl:text-xs font-medium line-clamp-1 max-w-[56px] sm:max-w-[64px] 3xl:max-w-[72px] ${
                          isSelected ? 'text-primary' : 'text-foreground/70'
                        }`}>
                          {baseLabel}
                        </span>
                      </button>
                    );
                  })()}

                  {/* Variant tiles */}
                  {activeVariants.map((v) => {
                    const isSelected = selectedVariantId === v.id;
                    const isOut = v.isOutOfStock;
                    const vLabel = language === 'ar' && v.labelAr ? v.labelAr : v.label;
                    const initial = (vLabel || '?').trim().charAt(0).toUpperCase();
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handlePickVariant(v.id)}
                        title={vLabel}
                        className="flex flex-col items-center gap-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#560736] focus-visible:ring-offset-2 cursor-pointer"
                      >
                        <div
                          className={`relative w-12 h-12 sm:w-14 sm:h-14 3xl:w-[72px] 3xl:h-[72px] rounded-full overflow-hidden border-2 transition-all ${
                            isSelected
                              ? 'border-primary ring-2 ring-[#560736]/40 scale-105'
                              : isOut
                                ? 'border-muted/15 opacity-50'
                                : 'border-muted/20 group-hover:border-primary/50'
                          }`}
                          style={!v.image && !coverPath && v.color ? { backgroundColor: v.color } : undefined}
                        >
                          {v.image ? (
                            <Image
                              src={v.image}
                              alt={vLabel}
                              width={120}
                              height={120}
                              sizes="56px"
                              className="w-full h-full object-cover"
                            />
                          ) : coverPath ? (
                            // Fallback: use the base product cover when no variant image
                            <Image
                              src={coverPath}
                              alt={vLabel}
                              width={120}
                              height={120}
                              sizes="56px"
                              className="w-full h-full object-cover"
                            />
                          ) : !v.color ? (
                            <div className="w-full h-full flex items-center justify-center bg-surface-alt text-foreground/40 text-lg font-bold">
                              {initial}
                            </div>
                          ) : null}
                          {isOut && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <span className="text-[8px] font-bold text-white uppercase tracking-wider rotate-[-15deg]">
                                {t('books.outOfStock')}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] sm:text-[11px] 3xl:text-xs font-medium line-clamp-1 max-w-[56px] sm:max-w-[64px] 3xl:max-w-[72px] ${
                          isSelected ? 'text-primary' : 'text-foreground/70'
                        }`}>
                          {vLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price + Quantity + Buttons — pushed to the bottom on desktop
                so the variant picker stays high and a natural gap opens up
                between the picker and the price. */}
            <div className="lg:mt-auto">

            {/* Price */}
            <div className="flex items-center gap-2 sm:gap-3 mt-5 sm:mt-7 lg:mt-0">
              <span className="text-2xl sm:text-3xl 3xl:text-5xl font-bold text-foreground">{formatPrice(effectivePrice)}</span>
              {hasDiscount && (
                <span className="text-sm sm:text-lg text-foreground/40 line-through">{formatPrice(effectiveCompareAt)}</span>
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
                className={`ms-3 sm:ms-4 3xl:ms-6 w-8 h-8 sm:w-10 sm:h-10 3xl:w-12 3xl:h-12 flex items-center justify-center rounded-lg sm:rounded-xl border-2 transition-all active:scale-90 ${
                  inWishlist
                    ? 'border-red-500 bg-red-500 text-white'
                    : 'border-gray-300 text-gray-400 hover:border-red-500 hover:text-red-500'
                }`}
              >
                <FiHeart size={15} className={`sm:w-[18px] sm:h-[18px] ${inWishlist ? 'fill-white' : ''}`} />
              </button>

              {/* Return & exchange policy — sits after wishlist (with a gap)
                  as a simple round info button. Opens the policy modal.
                  Custom tooltip on hover. */}
              <div className="relative group ms-3 sm:ms-4 me-6 sm:me-10">
                <button
                  type="button"
                  onClick={() => setReturnPolicyOpen(true)}
                  className="w-6 h-6 sm:w-7 sm:h-7 3xl:w-9 3xl:h-9 flex items-center justify-center rounded-full border-2 border-gray-300 text-gray-400 hover:border-accent hover:text-accent transition-all active:scale-90 focus:outline-none focus-visible:border-accent focus-visible:text-accent"
                  aria-label={t('product.returnPolicyTooltip')}
                >
                  <FiInfo size={12} className="sm:w-[14px] sm:h-[14px]" />
                </button>
                <span className="absolute bottom-full mb-2 ltr:right-0 rtl:left-0 px-2.5 py-1 bg-foreground text-background text-[11px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-150 shadow-lg">
                  {t('product.returnPolicyTooltip')}
                </span>
              </div>
            </div>

            {/* Add to Cart + Buy Now + Social share */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleAddToCart}
                disabled={isUnavailable}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 3xl:px-8 py-2 sm:py-2.5 3xl:py-3 bg-[#A39666] text-white text-xs sm:text-sm 3xl:text-base font-medium rounded-lg hover:bg-[#B8AB7E] active:scale-[0.97] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiShoppingCart size={14} />
                {t('common.addToCart')}
              </button>

              {!isUnavailable ? (
                <Link
                  to="/cart"
                  onClick={handleAddToCart}
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

              {/* Direct WhatsApp inquiry — opens WhatsApp chat with the
                  store's number pre-filled with a product enquiry message.
                  Uses settings.whatsapp (admin-configured); hides the button
                  if it's not set. The generic "share to anyone" WhatsApp
                  lives inside the share popover below. */}
              {(() => {
                const shareText = `${title} - ${bookUrl}`;
                const shareTextEnc = encodeURIComponent(shareText);
                const shareUrlEnc = encodeURIComponent(bookUrl);
                const shareTitleEnc = encodeURIComponent(title);
                const openShare = (url) => window.open(url, '_blank', 'noopener,noreferrer');
                const copyForPlatform = async (platformLabel) => {
                  try {
                    await navigator.clipboard.writeText(bookUrl);
                    const tpl = t('book.linkCopiedFor') || 'Link copied — paste in {{platform}}';
                    toast.success(tpl.replace('{{platform}}', platformLabel));
                  } catch {
                    toast.error(t('book.copyFailed') || 'Could not copy link');
                  }
                  setShareMenuOpen(false);
                };

                // Build the "Inquire on store WhatsApp" link from settings.
                // Accepts either a raw phone number (e.g. "+974 ...") or a
                // full https://wa.me/... URL stored by the admin.
                const rawWhats = publicSettings.whatsapp;
                let inquireUrl = null;
                if (rawWhats) {
                  const inquiryTpl = t('book.whatsappInquiry') || "Hello, I'm interested in this product:\n{{title}}\n{{url}}";
                  const message = inquiryTpl
                    .replace('{{title}}', title)
                    .replace('{{url}}', bookUrl);
                  const messageEnc = encodeURIComponent(message);
                  if (/^https?:\/\//i.test(rawWhats)) {
                    inquireUrl = rawWhats.includes('?')
                      ? `${rawWhats}&text=${messageEnc}`
                      : `${rawWhats}?text=${messageEnc}`;
                  } else {
                    const digits = rawWhats.replace(/[^0-9]/g, '');
                    if (digits) inquireUrl = `https://wa.me/${digits}?text=${messageEnc}`;
                  }
                }

                // Tap behavior for the main Share button: try the OS native
                // share sheet first (iOS AirDrop, Android intent picker, modern
                // desktop Chrome/Edge dialog). The receiving app fetches the
                // product page's Open Graph tags to render its own preview
                // (image + title + description) — no need to attach files.
                const handleShareClick = async () => {
                  // Short message + product title + URL. The URL goes in its
                  // own field so receiving apps can render a rich link card
                  // from the page's og:image / og:title meta tags.
                  const messageTpl = t('book.shareMessage')
                    || 'Check this out on Arkaan Bookstore';
                  const shareData = {
                    title,
                    text: `${messageTpl}: ${title}`,
                    url: bookUrl,
                  };
                  const canNative = typeof navigator !== 'undefined'
                    && typeof navigator.share === 'function'
                    && (typeof navigator.canShare !== 'function' || navigator.canShare(shareData));
                  if (canNative) {
                    try {
                      await navigator.share(shareData);
                      return;
                    } catch (err) {
                      if (err && err.name === 'AbortError') return;
                      // any other failure → fall through to the popover
                    }
                  }
                  setShareMenuOpen((o) => !o);
                };

                const btnBase = 'w-9 h-9 sm:w-10 sm:h-10 3xl:w-11 3xl:h-11 flex items-center justify-center rounded-full transition-colors';
                // Default (desktop): neutral surface that tints to the platform
                // color on hover. Below lg (mobile/tablet) each icon ALSO carries
                // a `max-lg:` override that pins the platform color permanently —
                // no hover state needed since touch devices can't hover.
                const popBtn = 'w-9 h-9 flex items-center justify-center rounded-full bg-surface-alt border border-muted/15 text-foreground/70 transition-colors';
                return (
                  <>
                    {inquireUrl && (
                      <a
                        href={inquireUrl}
                        rel="noopener"
                        aria-label={t('book.inquireOnWhatsApp') || 'Inquire on WhatsApp'}
                        title={t('book.inquireOnWhatsApp') || 'Inquire on WhatsApp'}
                        className={`${btnBase} bg-green-500 text-white hover:bg-green-600 active:scale-95`}
                      >
                        <FaWhatsapp size={18} />
                      </a>
                    )}

                    {/* Share — opens the OS native share sheet on supported
                        devices (mobile + modern desktop). Falls back to the
                        in-page popover on browsers without Web Share API. */}
                    <div className="relative" ref={shareMenuRef}>
                      <button
                        type="button"
                        onClick={handleShareClick}
                        aria-label={t('book.share') || 'Share'}
                        title={t('book.share') || 'Share'}
                        aria-haspopup="menu"
                        aria-expanded={shareMenuOpen}
                        className={`${btnBase} bg-surface-alt border border-muted/15 text-foreground/70 hover:bg-foreground hover:text-background active:scale-95`}
                      >
                        <FiShare2 size={16} />
                      </button>
                      {shareMenuOpen && (
                        <div
                          role="menu"
                          className="absolute z-30 top-full mt-2 ltr:end-0 rtl:start-0 bg-surface border border-muted/15 rounded-xl shadow-lg p-2 flex items-center gap-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => { openShare(`https://wa.me/?text=${shareTextEnc}`); setShareMenuOpen(false); }}
                            aria-label="WhatsApp"
                            title="WhatsApp"
                            className={`${popBtn} max-lg:bg-green-500 max-lg:text-white max-lg:border-green-500 lg:hover:bg-green-500 lg:hover:text-white lg:hover:border-green-500`}
                          >
                            <FaWhatsapp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => { openShare(`https://www.facebook.com/sharer/sharer.php?u=${shareUrlEnc}`); setShareMenuOpen(false); }}
                            aria-label="Facebook"
                            title="Facebook"
                            className={`${popBtn} max-lg:bg-blue-600 max-lg:text-white max-lg:border-blue-600 lg:hover:bg-blue-600 lg:hover:text-white lg:hover:border-blue-600`}
                          >
                            <FaFacebookF size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => { openShare(`https://twitter.com/intent/tweet?url=${shareUrlEnc}&text=${shareTitleEnc}`); setShareMenuOpen(false); }}
                            aria-label="X"
                            title="X (Twitter)"
                            className={`${popBtn} max-lg:bg-black max-lg:text-white max-lg:border-black lg:hover:bg-black lg:hover:text-white lg:hover:border-black`}
                          >
                            <FaXTwitter size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => copyForPlatform('Instagram')}
                            aria-label="Instagram"
                            title="Instagram"
                            className={`${popBtn} max-lg:bg-gradient-to-br max-lg:from-pink-500 max-lg:to-orange-400 max-lg:text-white max-lg:border-pink-500 lg:hover:bg-gradient-to-br lg:hover:from-pink-500 lg:hover:to-orange-400 lg:hover:text-white lg:hover:border-pink-500`}
                          >
                            <FaInstagram size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => copyForPlatform('TikTok')}
                            aria-label="TikTok"
                            title="TikTok"
                            className={`${popBtn} max-lg:bg-black max-lg:text-white max-lg:border-black lg:hover:bg-black lg:hover:text-white lg:hover:border-black`}
                          >
                            <FaTiktok size={13} />
                          </button>
                          {/* Copy link — universal fallback that works on every platform. */}
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(bookUrl);
                                toast.success(t('book.linkCopied') || 'Link copied');
                              } catch {
                                toast.error(t('book.copyFailed') || 'Could not copy link');
                              }
                              setShareMenuOpen(false);
                            }}
                            aria-label={t('book.copyLink') || 'Copy link'}
                            title={t('book.copyLink') || 'Copy link'}
                            className={`${popBtn} max-lg:bg-accent max-lg:text-white max-lg:border-accent lg:hover:bg-accent lg:hover:text-white lg:hover:border-accent`}
                          >
                            <FiLink size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Stock info — only when the currently-selected target is out */}
            {isUnavailable && (
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
                show('author') && effectiveAuthor && effectiveAuthor !== 'Unknown' && effectiveAuthor.trim() !== '' && { label: t('books.author'), value: effectiveAuthor },
                show('publisher') && effectivePublisher && { label: t('book.publisher'), value: effectivePublisher },
                show('pages') && effectivePages && { label: t('book.pages'), value: effectivePages },
                show('isbn') && effectiveIsbn && { label: t('book.isbn'), value: effectiveIsbn },
                show('barcode') && effectiveSku && { label: t('books.barcode'), value: effectiveSku },
                show('language') && effectiveLanguage && { label: t('books.language'), value: effectiveLanguage === 'ar' ? t('books.langArabic') : t('books.langEnglish') },
                show('publishedDate') && effectivePublishedDate && { label: t('book.published'), value: language === 'ar' ? formatDateAr(effectivePublishedDate) : formatDate(effectivePublishedDate) },
                show('brand') && effectiveBrand && { label: t('books.brand'), value: effectiveBrand },
                show('color') && effectiveColor && { label: t('books.color'), value: effectiveColor },
                show('material') && effectiveMaterial && { label: t('books.material'), value: effectiveMaterial },
                show('dimensions') && effectiveDimensions && { label: t('books.dimensions'), value: effectiveDimensions },
                show('ageRange') && effectiveAgeRange && { label: t('books.ageRange'), value: effectiveAgeRange },
              ].filter(Boolean);

              // Add custom field values — variant override merged with base.
              {
                const rawCF = book.category?.parent?.parent?.parent?.customFields || book.category?.parent?.parent?.customFields || book.category?.parent?.customFields || book.category?.customFields;
                let cfDefs = [];
                if (rawCF) { try { cfDefs = JSON.parse(rawCF); } catch {} }
                cfDefs.forEach((def) => {
                  // Custom fields are gated by the corner's detailFields config
                  // (`cf_<key>`). When admin unchecks a CF in Edit Corner →
                  // hide it on the storefront, even if a value is stored.
                  if (!show(`cf_${def.key}`)) return;
                  const val = effectiveCustomFieldValues[def.key];
                  if (val && (val.value || val.valueAr)) {
                    items.push({ label: language === 'ar' && def.nameAr ? def.nameAr : def.name, value: language === 'ar' && val.valueAr ? val.valueAr : val.value });
                  }
                });
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
              show('author') && effectiveAuthor && effectiveAuthor !== 'Unknown' && effectiveAuthor.trim() !== '' && { label: t('books.author'), value: effectiveAuthor },
              show('publisher') && effectivePublisher && { label: t('book.publisher'), value: effectivePublisher },
              show('pages') && effectivePages && { label: t('book.pages'), value: effectivePages },
              show('isbn') && effectiveIsbn && { label: t('book.isbn'), value: effectiveIsbn },
              show('barcode') && effectiveSku && { label: t('books.barcode'), value: effectiveSku },
              show('language') && effectiveLanguage && { label: t('books.language'), value: effectiveLanguage === 'ar' ? t('books.langArabic') : t('books.langEnglish') },
              show('publishedDate') && effectivePublishedDate && { label: t('book.published'), value: language === 'ar' ? formatDateAr(effectivePublishedDate) : formatDate(effectivePublishedDate) },
              show('brand') && effectiveBrand && { label: t('books.brand'), value: effectiveBrand },
              show('color') && effectiveColor && { label: t('books.color'), value: effectiveColor },
              show('material') && effectiveMaterial && { label: t('books.material'), value: effectiveMaterial },
              show('dimensions') && effectiveDimensions && { label: t('books.dimensions'), value: effectiveDimensions },
              show('ageRange') && effectiveAgeRange && { label: t('books.ageRange'), value: effectiveAgeRange },
            ].filter(Boolean);

            // Add custom field values — variant override merged with base.
            {
              const rawCF = book.category?.parent?.parent?.parent?.customFields || book.category?.parent?.parent?.customFields || book.category?.parent?.customFields || book.category?.customFields;
              let cfDefs = [];
              if (rawCF) { try { cfDefs = JSON.parse(rawCF); } catch {} }
              cfDefs.forEach((def) => {
                // Custom fields are gated by the corner's detailFields config
                // (`cf_<key>`). When admin unchecks a CF in Edit Corner →
                // hide it on the storefront, even if a value is stored.
                if (!show(`cf_${def.key}`)) return;
                const val = effectiveCustomFieldValues[def.key];
                if (val && (val.value || val.valueAr)) {
                  items.push({ label: language === 'ar' && def.nameAr ? def.nameAr : def.name, value: language === 'ar' && val.valueAr ? val.valueAr : val.value });
                }
              });
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

      {/* Return policy modal — opens from the icon button in the action row.
          Lazy-loads the policy text from /settings/public the first time. */}
      {returnPolicyOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50" onClick={() => setReturnPolicyOpen(false)}>
          <div
            className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto bg-surface rounded-2xl shadow-xl p-6 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setReturnPolicyOpen(false)}
              className="absolute top-3 end-3 w-8 h-8 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-surface-alt transition-colors"
              aria-label={t('common.close')}
            >
              <FiX size={18} />
            </button>
            <h3 className="text-lg sm:text-xl font-display font-bold text-foreground mb-4 pe-8">
              {t('footer.returnPolicy')}
            </h3>
            {returnPolicyText ? (
              <div className="text-sm sm:text-[15px] text-foreground/85 leading-relaxed whitespace-pre-line">
                {returnPolicyText}
              </div>
            ) : (
              <p className="text-sm text-foreground/50">{t('common.noContentYet')}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default BookDetail;
