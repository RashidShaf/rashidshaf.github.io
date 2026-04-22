import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiArrowLeft, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import 'swiper/css';
import BookCard from '../books/BookCard';
import useLanguageStore from '../../stores/useLanguageStore';

// Single per-corner section (Featured, Bestseller, New Arrival, Trending, Coming Soon).
// Shows 3 products visible on desktop (2 on tablet, 1.5 on mobile), auto-scrolls every 6 s,
// loops endlessly, pauses on hover. Manual ← → arrows override auto-scroll.
const CornerSection = ({ title, books, seeAllUrl, comingSoon = false }) => {
  const { language } = useLanguageStore();
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const isRTL = language === 'ar';

  if (!books || books.length === 0) return null;

  const SeeAllArrow = isRTL ? FiArrowLeft : FiArrowRight;

  return (
    <section className="bg-surface rounded-xl border border-muted/10 p-4 3xl:p-6 overflow-hidden">
      <header className="flex items-center gap-2 mb-3 3xl:mb-4">
        <h3 className="text-base sm:text-lg 3xl:text-xl font-display font-bold text-foreground flex-shrink-0 min-w-0 truncate">
          {title}
        </h3>
        <div className="flex items-center gap-1 ms-auto">
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

      <Swiper
        key={`${isRTL ? 'rtl' : 'ltr'}-${books.length}`}
        modules={[Autoplay, Navigation]}
        dir={isRTL ? 'rtl' : 'ltr'}
        spaceBetween={12}
        slidesPerView={1.5}
        loop={books.length >= 3}
        autoplay={{ delay: 6000, pauseOnMouseEnter: true, disableOnInteraction: false }}
        navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
        onBeforeInit={(swiper) => {
          swiper.params.navigation.prevEl = prevRef.current;
          swiper.params.navigation.nextEl = nextRef.current;
        }}
        breakpoints={{
          640:  { slidesPerView: 2,   spaceBetween: 14 },
          1024: { slidesPerView: 3,   spaceBetween: 16 },
        }}
        className="!overflow-visible"
      >
        {books.map((book) => (
          <SwiperSlide key={book.id}>
            <BookCard book={book} comingSoon={comingSoon} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
};

export default CornerSection;
