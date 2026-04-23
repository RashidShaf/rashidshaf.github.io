import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import BookCard from '../books/BookCard';
import useLanguageStore from '../../stores/useLanguageStore';

// Single per-corner section (Featured, Bestseller, New Arrival, Trending, Coming Soon).
//
// Sizing rules — book cards stay the SAME size regardless of section width or book count.
//  - wide=false (half-row):  grid-cols-3, Swiper shows 3 slides
//  - wide=true  (full-row):  grid-cols-6, Swiper shows 6 slides
//  - Grid vs carousel: grid when books fit without scrolling, else Swiper.
//
// Header layout (per user request):
//   [Title]       [← dots →]       [See All →]
// Arrows and See All use the same FiArrow icon style.
const CornerSection = ({ title, books, seeAllUrl, comingSoon = false, wide = false }) => {
  const { language } = useLanguageStore();
  const paginationRef = useRef(null);
  const [swiperInst, setSwiperInst] = useState(null);
  const isRTL = language === 'ar';
  const PrevArrow = isRTL ? FiArrowRight : FiArrowLeft;
  const NextArrow = isRTL ? FiArrowLeft : FiArrowRight;

  const safeBooks = Array.isArray(books) ? books : [];
  const slotsPerRow = wide ? 6 : 3;
  const useCarousel = safeBooks.length > slotsPerRow;

  // slideNext / slidePrev respect slidesPerGroup, which we set to match slidesPerView
  // (via slidesPerGroupAuto below). So narrow sections advance by 3, wide by 6.
  const slidePrev = () => swiperInst?.slidePrev(400);
  const slideNext = () => swiperInst?.slideNext(400);

  const Header = (
    <header className="flex items-center gap-2 sm:gap-3 mb-3 3xl:mb-4">
      <h3 className="text-base sm:text-lg 3xl:text-xl font-display font-bold text-foreground flex-shrink-0 min-w-0 truncate">
        {title}
      </h3>
      <div className="flex-1 flex items-center justify-center">
        {useCarousel && (
          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              aria-label="Previous"
              onClick={slidePrev}
              className="flex items-center justify-center text-accent hover:text-accent-light transition-colors"
            >
              <PrevArrow size={16} />
            </button>
            <div
              ref={paginationRef}
              className="corner-section-pagination flex items-center gap-1"
            />
            <button
              type="button"
              aria-label="Next"
              onClick={slideNext}
              className="flex items-center justify-center text-accent hover:text-accent-light transition-colors"
            >
              <NextArrow size={16} />
            </button>
          </div>
        )}
      </div>
      {seeAllUrl && (
        <Link
          to={seeAllUrl}
          className="inline-flex items-center gap-1 text-xs sm:text-sm 3xl:text-base font-medium text-accent hover:text-accent-light transition-colors"
        >
          <span className="whitespace-nowrap">{language === 'ar' ? 'عرض الكل' : 'See All'}</span>
          {isRTL ? <FiArrowLeft size={14} /> : <FiArrowRight size={14} />}
        </Link>
      )}
    </header>
  );

  // Empty state — keep the section visible (so admin-ordered grid layout stays correct)
  if (safeBooks.length === 0) {
    return (
      <section className="overflow-hidden">
        {Header}
        <div className="h-32 sm:h-40 flex items-center justify-center text-sm text-foreground/50 italic">
          {language === 'ar' ? 'لا توجد منتجات بعد' : 'No products yet'}
        </div>
      </section>
    );
  }

  // Fixed-grid branch — cards stay same size; empty slots are invisible placeholders.
  if (!useCarousel) {
    return (
      <section className="overflow-hidden">
        {Header}
        {/* Mobile (<640px): horizontal scroll matches the carousel branch so mobile is consistent */}
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          className="sm:hidden flex gap-3 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {safeBooks.map((book) => (
            <div key={book.id} className="flex-shrink-0 w-[calc(50%-6px)]">
              <BookCard book={book} comingSoon={comingSoon} />
            </div>
          ))}
        </div>
        {/* Tablet+ (≥640): fixed grid with invisible slot placeholders */}
        <div className={`hidden sm:grid ${wide ? 'sm:grid-cols-4 lg:grid-cols-6' : 'sm:grid-cols-3'} gap-2 sm:gap-3 3xl:gap-4`}>
          {safeBooks.map((book) => (
            <BookCard key={book.id} book={book} comingSoon={comingSoon} />
          ))}
          {Array.from({ length: Math.max(0, slotsPerRow - safeBooks.length) }).map((_, i) => (
            <div key={`empty-${i}`} aria-hidden />
          ))}
        </div>
      </section>
    );
  }

  // Carousel branch — Swiper with auto-scroll + manual arrows + pagination dots.
  // Explicit slidesPerGroup at every breakpoint so autoplay/arrows advance by the full
  // visible group, and pagination bullet count == number of groups.
  const breakpoints = wide
    ? {
        640:  { slidesPerView: 3, slidesPerGroup: 3 },
        1024: { slidesPerView: 4, slidesPerGroup: 4 },
        1280: { slidesPerView: 6, slidesPerGroup: 6 },
      }
    : {
        640:  { slidesPerView: 3, slidesPerGroup: 3 },
        1024: { slidesPerView: 3, slidesPerGroup: 3 },
      };

  return (
    <section className="overflow-hidden">
      {Header}
      {/* Mobile (<640px): native horizontal scroll, no arrows, no dots */}
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="sm:hidden flex gap-3 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {safeBooks.map((book) => (
          <div key={book.id} className="flex-shrink-0 w-[calc(50%-6px)]">
            <BookCard book={book} comingSoon={comingSoon} />
          </div>
        ))}
      </div>
      {/* Tablet+ (≥640px): Swiper with autoplay + arrows + dots */}
      <div className="hidden sm:block">
        <Swiper
          key={`${isRTL ? 'rtl' : 'ltr'}-${wide ? 'w' : 'n'}-${safeBooks.length}`}
          modules={[Autoplay, Pagination]}
          dir={isRTL ? 'rtl' : 'ltr'}
          spaceBetween={12}
          slidesPerView={2}
          slidesPerGroup={2}
          loop={safeBooks.length >= slotsPerRow * 2}
          loopAddBlankSlides={false}
          autoplay={{ delay: 6000, pauseOnMouseEnter: true, disableOnInteraction: false }}
          pagination={{ el: paginationRef.current, clickable: true, type: 'bullets' }}
          breakpoints={breakpoints}
          onBeforeInit={(swiper) => {
            if (swiper.params.pagination) swiper.params.pagination.el = paginationRef.current;
          }}
          onSwiper={(s) => setSwiperInst(s)}
        >
          {safeBooks.map((book) => (
            <SwiperSlide key={book.id}>
              <BookCard book={book} comingSoon={comingSoon} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default CornerSection;
