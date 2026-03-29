import { useRef, useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const BookCarousel = ({ children }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [children]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(':scope > *')?.offsetWidth || 260;
    const gap = 12;
    const scrollAmount = (cardWidth + gap) * 3;
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="relative group/carousel">
      {/* Left Arrow — outside cards */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute -left-5 rtl:-left-auto rtl:-right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 hidden lg:flex items-center justify-center rounded-full bg-background border border-muted/20 shadow-lg text-foreground hover:bg-accent hover:text-white hover:border-accent transition-all duration-200 opacity-0 group-hover/carousel:opacity-100"
        >
          <FiChevronLeft size={20} />
        </button>
      )}

      {/* Right Arrow — outside cards */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute -right-5 rtl:-right-auto rtl:-left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 hidden lg:flex items-center justify-center rounded-full bg-background border border-muted/20 shadow-lg text-foreground hover:bg-accent hover:text-white hover:border-accent transition-all duration-200 opacity-0 group-hover/carousel:opacity-100"
        >
          <FiChevronRight size={20} />
        </button>
      )}

      {/* Scrollable Row */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div key={i} className="flex-shrink-0 w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(20%-10px)] 2xl:w-[calc(16.666%-10px)]">
                {child}
              </div>
            ))
          : children
        }
      </div>
    </div>
  );
};

export default BookCarousel;
