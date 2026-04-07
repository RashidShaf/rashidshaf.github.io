import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useLanguageStore from '../../stores/useLanguageStore';

const SubcategoryColumn = ({ sub, getName, language, onLinkClick }) => (
  <div className="min-w-[150px]">
    <Link
      to={`/books?category=${sub.slug}`}
      onClick={onLinkClick}
      className="text-sm 3xl:text-base font-semibold text-primary hover:text-accent transition-colors border-b border-primary/20 pb-1.5 mb-2 block"
    >
      {getName(sub)}
    </Link>
    {sub.children && sub.children.length > 0 && (
      <div className="mt-1.5 space-y-0.5">
        {sub.children.map((l3) => (
          <Link
            key={l3.id}
            to={`/books?category=${l3.slug}`}
            onClick={onLinkClick}
            className="block text-[13px] 3xl:text-sm text-foreground/60 hover:text-accent transition-colors py-0.5"
          >
            {getName(l3)}
          </Link>
        ))}
      </div>
    )}
    <Link
      to={`/books?category=${sub.slug}`}
      onClick={onLinkClick}
      className="block text-[13px] 3xl:text-sm text-accent hover:text-accent-light transition-colors py-0.5 mt-1.5 font-medium"
    >
      {language === 'ar' ? 'تصفح الكل ←' : 'Browse All →'}
    </Link>
  </div>
);

const CategoryBar = ({ categories = [] }) => {
  const { t, language } = useLanguageStore();
  const [searchParams] = useSearchParams();
  const [hoveredId, setHoveredId] = useState(null);
  const closeTimeout = useRef(null);
  const itemRefs = useRef({});
  const barRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});

  const currentCategory = searchParams.get('category') || '';
  const getName = (cat) => language === 'ar' && cat.nameAr ? cat.nameAr : cat.name;

  const handleEnter = (id) => {
    clearTimeout(closeTimeout.current);
    setHoveredId(id);
  };

  const handleLeave = () => {
    closeTimeout.current = setTimeout(() => setHoveredId(null), 200);
  };

  const handleClick = () => {
    clearTimeout(closeTimeout.current);
    setHoveredId(null);
  };

  const hoveredCat = categories.find((c) => c.id === hoveredId);
  const subCount = hoveredCat?.children?.length || 0;
  const isCompact = subCount > 0 && subCount <= 3;

  // Calculate position for compact menus, clamped to viewport
  useEffect(() => {
    if (!isCompact || !hoveredId) { setMenuStyle({}); return; }
    const itemEl = itemRefs.current[hoveredId];
    const barEl = barRef.current;
    if (!itemEl || !barEl) return;

    const itemRect = itemEl.getBoundingClientRect();
    const barRect = barEl.getBoundingClientRect();
    const itemCenter = itemRect.left + itemRect.width / 2 - barRect.left;

    // Estimate menu width: ~180px per subcategory + padding + gaps
    const estimatedWidth = subCount * 180 + (subCount - 1) * 32 + 48;
    const barWidth = barRect.width;
    const padding = 16;

    let left = itemCenter - estimatedWidth / 2;
    // Clamp: don't overflow left
    if (left < padding) left = padding;
    // Clamp: don't overflow right
    if (left + estimatedWidth > barWidth - padding) left = barWidth - padding - estimatedWidth;
    // Safety: if menu wider than bar, just use left padding
    if (left < padding) left = padding;

    setMenuStyle({ left });
  }, [hoveredId, isCompact, subCount]);

  if (categories.length === 0) return null;

  return (
    <div ref={barRef} className="hidden lg:block bg-primary relative">
      <div className="mx-auto px-2 sm:px-4 lg:px-4 xl:px-4 3xl:px-10">
        <div className={`flex items-center ${categories.length < 5 ? 'justify-center gap-8' : 'justify-between gap-1'}`}>
          {categories.map((cat) => {
            const selectedSlugs = currentCategory ? currentCategory.split(',').filter(Boolean) : [];
            const isActive = selectedSlugs.includes(cat.slug) ||
              cat.children?.some((sub) => selectedSlugs.includes(sub.slug) ||
                sub.children?.some((l3) => selectedSlugs.includes(l3.slug)));
            return (
              <div
                key={cat.id}
                ref={(el) => { itemRefs.current[cat.id] = el; }}
                className={categories.length >= 5 ? 'flex-1' : ''}
                onMouseEnter={() => handleEnter(cat.id)}
                onMouseLeave={handleLeave}
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

      {/* Mega menu */}
      {hoveredCat && hoveredCat.children && hoveredCat.children.length > 0 && (
        isCompact ? (
          /* Compact: positioned under the hovered category, sized to content */
          <div
            className="absolute top-full z-40 pt-2"
            style={menuStyle}
            onMouseEnter={() => handleEnter(hoveredCat.id)}
            onMouseLeave={handleLeave}
          >
            <div className="bg-surface border border-muted/15 rounded-2xl shadow-2xl p-6">
              <div className="flex gap-8">
                {hoveredCat.children.map((sub) => (
                  <SubcategoryColumn key={sub.id} sub={sub} getName={getName} language={language} onLinkClick={handleClick} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Full width: for 4+ subcategories */
          <div
            className="absolute top-full left-0 right-0 z-40 px-4 sm:px-6 lg:px-6 xl:px-6 3xl:px-12 pt-2"
            onMouseEnter={() => handleEnter(hoveredCat.id)}
            onMouseLeave={handleLeave}
          >
            <div className="bg-surface border border-muted/15 rounded-2xl shadow-2xl p-6">
              <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-6">
                {hoveredCat.children.map((sub) => (
                  <SubcategoryColumn key={sub.id} sub={sub} getName={getName} language={language} onLinkClick={handleClick} />
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default CategoryBar;
