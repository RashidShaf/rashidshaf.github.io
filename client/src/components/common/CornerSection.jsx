import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiArrowLeft, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import 'swiper/css';
import BookCard from '../books/BookCard';
import useLanguageStore from '../../stores/useLanguageStore';

// Single per-corner section (Featured, Bestseller, New Arrival, Trending, Coming Soon).
//
// Rendering strategy — keeps book card sizes CONSISTENT no matter how many books:
//   - 0 books                    → "No products yet" placeholder (but section header still shows)
//   - 1–3 books (<= grid target) → fixed 3-column grid; fewer books occupy fewer slots, others stay empty
//   - 4+ books                   → Swiper carousel with auto-scroll + arrows
//
// This avoids Swiper's tendency to stretch a single slide to fill the viewport.
const CornerSection = ({ title, books, seeAllUrl, comingSoon = false }) => {
  const { language } = useLanguageStore();
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const isRTL = language === 'ar';
  const SeeAllArrow = isRTL ? FiArrowLeft : FiArrowRight;

  const safeBooks = Array.isArray(books) ? books : [];
  const useCarousel = safeBooks.length > 3;

  const Header = (
    <header className="flex items-center gap-2 mb-3 3xl:mb-4">
      <h3 className="text-base sm:text-lg 3xl:text-xl font-display font-bold text-foreground flex-shrink-0 min-w-0 truncate">
        {title}
      </h3>
      <div className="flex items-center gap-1 ms-auto">
        {useCarousel && (
          <>
            <button
              ref={prevRef}
              type="button"
              aria-label="Previous"
              className="w-7 h-7 3xl:w-9 3xl:h-9 flex items-center justify-center rounded-full border border-muted/20 text-foreground/70 hover:text-accent hover:border-accent transition-colors"
            >
              {isRTL ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
            </button>
            <button
              ref={nextRef}
              type="button"
              aria-label="Next"
              className="w-7 h-7 3xl:w-9 3xl:h-9 flex items-center justify-center rounded-full border border-muted/20 text-foreground/70 hover:text-accent hover:border-accent transition-colors"
            >
              {isRTL ? <FiChevronLeft size={14} /> : <FiChevronRight size={14} />}
            </button>
          </>
        )}
        {seeAllUrl && (
          <Link
            to={seeAllUrl}
            className="ms-2 inline-flex items-center gap-1 text-xs sm:text-sm 3xl:text-base font-medium text-accent hover:text-accent-light transition-colors"
          >
            <span className="whitespace-nowrap">{language === 'ar' ? 'عرض الكل' : 'See All'}</span>
            <SeeAllArrow size={14} />
          </Link>
        )}
      </div>
    </header>
  );

  // Empty state — section shown but zero books (flag-based fallback also produced nothing)
  if (safeBooks.length === 0) {
    return (
      <section className="bg-surface rounded-xl border border-muted/10 p-4 3xl:p-6 overflow-hidden">
        {Header}
        <div className="h-32 sm:h-40 flex items-center justify-center text-sm text-foreground/50 italic">
          {language === 'ar' ? 'لا توجد منتجات بعد' : 'No products yet'}
        </div>
      </section>
    );
  }

  // 1–3 books: fixed 3-column grid. Book cards keep their natural size.
  if (!useCarousel) {
    return (
      <section className="bg-surface rounded-xl border border-muted/10 p-4 3xl:p-6 overflow-hidden">
        {Header}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 3xl:gap-4">
          {safeBooks.map((book) => (
            <BookCard key={book.id} book={book} comingSoon={comingSoon} />
          ))}
          {/* Fill remaining slots with invisible placeholders so the grid slots stay equal */}
          {Array.from({ length: 3 - safeBooks.length }).map((_, i) => (
            <div key={`empty-${i}`} aria-hidden />
          ))}
        </div>
      </section>
    );
  }

  // 4+ books: Swiper carousel
  return (
    <section className="bg-surface rounded-xl border border-muted/10 p-4 3xl:p-6 overflow-hidden">
      {Header}
      <Swiper
        key={`${isRTL ? 'rtl' : 'ltr'}-${safeBooks.length}`}
        modules={[Autoplay, Navigation]}
        dir={isRTL ? 'rtl' : 'ltr'}
        spaceBetween={12}
        slidesPerView={3}
        loop={safeBooks.length >= 6}
        autoplay={{ delay: 6000, pauseOnMouseEnter: true, disableOnInteraction: false }}
        navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
        onBeforeInit={(swiper) => {
          swiper.params.navigation.prevEl = prevRef.current;
          swiper.params.navigation.nextEl = nextRef.current;
        }}
        className="!overflow-visible"
      >
        {safeBooks.map((book) => (
          <SwiperSlide key={book.id}>
            <BookCard book={book} comingSoon={comingSoon} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
};

export default CornerSection;
