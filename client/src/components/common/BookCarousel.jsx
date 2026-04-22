import { useRef, useState, useEffect, useCallback } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import useLanguageStore from '../../stores/useLanguageStore';

const BookCarousel = ({ children }) => {
  const { language } = useLanguageStore();
  const isRTL = language === 'ar';
  const scrollRef = useRef(null);
  const thumbRef = useRef(null);
  const trackRef = useRef(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    const progress = Math.abs(el.scrollLeft) / maxScroll;
    const thumbWidth = Math.max(20, (el.clientWidth / el.scrollWidth) * 100);
    thumb.style.width = `${thumbWidth}%`;
    thumb.style.marginLeft = `${progress * (100 - thumbWidth)}%`;
  }, []);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // In RTL, scrollLeft can be negative (Chromium) — normalize to absolute progress.
    const scrolled = Math.abs(el.scrollLeft);
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollStart(scrolled > 4);
    setCanScrollEnd(scrolled < maxScroll - 4);
    updateThumb();
  }, [updateThumb]);

  useEffect(() => {
    const timeout = setTimeout(checkScroll, 100);
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      clearTimeout(timeout);
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [children, checkScroll]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(':scope > *')?.offsetWidth || 260;
    const gap = 12;
    const scrollAmount = (cardWidth + gap) * 3;
    // direction = 'start' means "scroll back to earlier cards"; in RTL that's positive scrollLeft.
    const baseDelta = direction === 'start' ? -scrollAmount : scrollAmount;
    el.scrollBy({ left: isRTL ? -baseDelta : baseDelta, behavior: 'smooth' });
  };

  const handleTrackClick = (e) => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const rect = track.getBoundingClientRect();
    const clickPos = (e.clientX - rect.left) / rect.width;
    el.scrollTo({ left: clickPos * (el.scrollWidth - el.clientWidth), behavior: 'smooth' });
  };

  const handleThumbDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const startX = e.touches ? e.touches[0].clientX : e.clientX;
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const startScroll = el.scrollLeft;
    const trackWidth = track.clientWidth;
    const maxScroll = el.scrollWidth - el.clientWidth;

    const onMove = (ev) => {
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const delta = clientX - startX;
      const signed = isRTL ? -delta : delta;
      el.scrollLeft = startScroll + (signed / trackWidth) * maxScroll;
    };

    const onUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onUp);
  };

  const hasOverflow = canScrollStart || canScrollEnd;
  const StartIcon = isRTL ? FiChevronRight : FiChevronLeft;
  const EndIcon = isRTL ? FiChevronLeft : FiChevronRight;

  return (
    <div className="relative group/carousel">
      {canScrollStart && (
        <button
          onClick={() => scroll('start')}
          aria-label="Previous"
          className="absolute start-[-1.25rem] top-1/2 -translate-y-1/2 z-10 w-10 h-10 hidden lg:flex items-center justify-center rounded-full bg-background border border-muted/20 shadow-lg text-foreground hover:bg-accent hover:text-white hover:border-accent transition-all duration-200 opacity-0 group-hover/carousel:opacity-100"
        >
          <StartIcon size={20} />
        </button>
      )}

      {canScrollEnd && (
        <button
          onClick={() => scroll('end')}
          aria-label="Next"
          className="absolute end-[-1.25rem] top-1/2 -translate-y-1/2 z-10 w-10 h-10 hidden lg:flex items-center justify-center rounded-full bg-background border border-muted/20 shadow-lg text-foreground hover:bg-accent hover:text-white hover:border-accent transition-all duration-200 opacity-0 group-hover/carousel:opacity-100"
        >
          <EndIcon size={20} />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div key={i} className="flex-shrink-0 w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(20%-10px)] xl:w-[calc(16.666%-10px)] 3xl:w-[calc(14.285%-10px)]">
                {child}
              </div>
            ))
          : children
        }
      </div>

      {hasOverflow && (
        <div className="mt-3 lg:hidden">
          <div
            ref={trackRef}
            onClick={handleTrackClick}
            className="w-full h-[2px] bg-gray-200 rounded-full cursor-pointer relative"
          >
            <div
              ref={thumbRef}
              onMouseDown={handleThumbDown}
              onTouchStart={handleThumbDown}
              className="absolute top-0 h-full rounded-full"
              style={{ backgroundColor: '#560736' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BookCarousel;
