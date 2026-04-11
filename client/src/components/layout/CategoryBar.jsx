import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import useLanguageStore from '../../stores/useLanguageStore';

// Cascading menu item — recursive: shows children in a flyout. Direction inherited from parent.
// `direction` is 'right' or 'left' — the side flyouts open toward, fixed for the entire chain.
const CascadeItem = ({ item, getName, language, onLinkClick, level = 2, direction = 'right' }) => {
  const [hovered, setHovered] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  const fontSize = level === 2 ? 'text-[13px] 3xl:text-base font-medium' : level === 3 ? 'text-[12px] 3xl:text-[15px]' : 'text-[11px] 3xl:text-[14px]';

  const opensRight = direction === 'right';
  const flyoutPositionClass = opensRight ? 'left-full ps-1' : 'right-full pe-1';
  const chevronRotation = opensRight ? '' : 'rotate-180';

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        to={`/books?category=${item.slug}`}
        onClick={onLinkClick}
        className={`group relative flex items-center gap-3 mx-1.5 my-0.5 px-3 py-2 3xl:px-4 3xl:py-2.5 rounded-md ${fontSize} transition-all duration-150 ${
          opensRight ? 'justify-between' : 'flex-row-reverse justify-between'
        } ${
          hovered
            ? 'bg-accent text-white shadow-sm'
            : 'text-foreground/80 hover:bg-accent/8 hover:text-accent'
        }`}
      >
        <span className="break-words leading-tight">{getName(item)}</span>
        {hasChildren && (
          <FiChevronRight
            size={13}
            className={`flex-shrink-0 transition-transform ${chevronRotation} ${
              hovered ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'
            }`}
          />
        )}
      </Link>
      {hasChildren && hovered && (
        <div className={`absolute top-[-6px] ${flyoutPositionClass} z-50`}>
          <div className="min-w-[210px] max-w-[260px] 3xl:min-w-[280px] 3xl:max-w-[340px] bg-surface border border-muted/10 rounded-xl shadow-2xl py-1.5 3xl:py-2 ring-1 ring-black/5">
            {item.children.map((child) => (
              <CascadeItem
                key={child.id}
                item={child}
                getName={getName}
                language={language}
                onLinkClick={onLinkClick}
                level={level + 1}
                direction={direction}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CategoryBar = ({ categories = [] }) => {
  const { t, language } = useLanguageStore();
  const [searchParams] = useSearchParams();
  const [hoveredId, setHoveredId] = useState(null);
  const closeTimeout = useRef(null);
  const itemRefs = useRef({});
  const barRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});
  const [menuDirection, setMenuDirection] = useState('right');

  const location = useLocation();
  const hoverDisabled = useRef(false);
  const currentCategory = searchParams.get('category') || '';
  const getName = (cat) => language === 'ar' && cat.nameAr ? cat.nameAr : cat.name;

  useEffect(() => {
    setHoveredId(null);
    hoverDisabled.current = true;
    const timer = setTimeout(() => { hoverDisabled.current = false; }, 300);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  const handleEnter = (id) => {
    if (hoverDisabled.current) return;
    clearTimeout(closeTimeout.current);
    setHoveredId(id);
  };

  const handleLeave = () => {
    setHoveredId(null);
  };

  const handleClick = () => {
    clearTimeout(closeTimeout.current);
    setHoveredId(null);
  };

  const hoveredCat = categories.find((c) => c.id === hoveredId);

  // Position the dropdown under the hovered L1 item, and decide flyout direction
  useEffect(() => {
    if (!hoveredId) { setMenuStyle({}); return; }
    const itemEl = itemRefs.current[hoveredId];
    const barEl = barRef.current;
    if (!itemEl || !barEl) return;

    const cat = categories.find((c) => c.id === hoveredId);
    if (!cat) return;

    // Find max depth of children tree to calculate space needed
    const getMaxDepth = (node, depth = 0) => {
      if (!node.children || node.children.length === 0) return depth;
      return Math.max(...node.children.map((c) => getMaxDepth(c, depth + 1)));
    };
    const maxDepth = getMaxDepth(cat); // 1 = L2 only, 2 = L3, 3 = L4

    const itemRect = itemEl.getBoundingClientRect();
    const barRect = barEl.getBoundingClientRect();
    // Larger dropdowns at 3xl breakpoint (1920px+)
    const is3xl = window.innerWidth >= 1920;
    const menuWidth = is3xl ? 300 : 230;
    const flyoutWidth = is3xl ? 280 : 230;
    const padding = 16;
    const barWidth = barRect.width;
    const viewportWidth = window.innerWidth;

    let left = itemRect.left - barRect.left;
    if (left + menuWidth > barWidth - padding) left = barWidth - padding - menuWidth;
    if (left < padding) left = padding;

    setMenuStyle({ left });

    // Total width needed = L2 menu + each cascading flyout (maxDepth - 1)
    const totalRightWidth = menuWidth + (maxDepth - 1) * flyoutWidth;
    const menuLeftAbsolute = barRect.left + left;
    const isRTL = language === 'ar';

    if (isRTL) {
      // RTL prefers left; flip to right if no room on left
      const spaceOnLeft = menuLeftAbsolute + menuWidth; // available space going left from menu's right edge
      const requiredLeft = (maxDepth - 1) * flyoutWidth + padding;
      setMenuDirection(spaceOnLeft >= requiredLeft + menuWidth ? 'left' : 'right');
    } else {
      // LTR prefers right; flip to left if no room
      const spaceOnRight = viewportWidth - menuLeftAbsolute;
      setMenuDirection(spaceOnRight >= totalRightWidth + padding ? 'right' : 'left');
    }
  }, [hoveredId, language, categories]);

  if (categories.length === 0) return null;

  return (
    <div ref={barRef} className="hidden lg:block bg-primary relative" onMouseLeave={handleLeave}>
      <div className="mx-auto px-2 sm:px-4 lg:px-4 xl:px-4 3xl:px-10">
        <div className={`flex items-center ${categories.length < 5 ? 'justify-center gap-8' : 'justify-between gap-1'}`}>
          {categories.map((cat) => {
            const selectedSlugs = currentCategory ? currentCategory.split(',').filter(Boolean) : [];
            const isActive = selectedSlugs.includes(cat.slug) ||
              cat.children?.some((sub) => selectedSlugs.includes(sub.slug) ||
                sub.children?.some((l3) => selectedSlugs.includes(l3.slug) || l3.children?.some((l4) => selectedSlugs.includes(l4.slug))));
            return (
              <div
                key={cat.id}
                ref={(el) => { itemRefs.current[cat.id] = el; }}
                className={categories.length >= 5 ? 'flex-1' : ''}
                onMouseEnter={() => handleEnter(cat.id)}
              >
                <Link
                  to={`/books?category=${cat.slug}`}
                  onClick={handleClick}
                  className={`block text-center px-2 py-3 text-[13px] 3xl:text-[15px] font-semibold uppercase tracking-wider transition-all duration-200 border-b-2 ${
                    isActive
                      ? 'text-white border-white'
                      : 'text-white/70 border-transparent hover:text-white hover:border-white/50'
                  }`}
                >
                  {getName(cat)}
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mega menu — cascading dropdown */}
      {hoveredCat && hoveredCat.children && hoveredCat.children.length > 0 && (
        <div
          className="absolute top-full z-40 pt-1"
          style={menuStyle}
          onMouseEnter={() => handleEnter(hoveredCat.id)}
        >
          <div className="bg-surface border border-muted/10 rounded-xl shadow-2xl py-1.5 3xl:py-2 min-w-[230px] max-w-[280px] 3xl:min-w-[300px] 3xl:max-w-[360px] ring-1 ring-black/5">
            {hoveredCat.children.map((sub) => (
              <CascadeItem
                key={sub.id}
                item={sub}
                getName={getName}
                language={language}
                onLinkClick={handleClick}
                level={2}
                direction={menuDirection}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryBar;
