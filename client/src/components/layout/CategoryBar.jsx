import { useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useLanguageStore from '../../stores/useLanguageStore';

const CategoryBar = ({ categories = [] }) => {
  const { t, language } = useLanguageStore();
  const [searchParams] = useSearchParams();
  const [hoveredId, setHoveredId] = useState(null);
  const closeTimeout = useRef(null);

  const currentCategory = searchParams.get('category') || '';
  const getName = (cat) => language === 'ar' && cat.nameAr ? cat.nameAr : cat.name;

  const handleEnter = (id) => {
    clearTimeout(closeTimeout.current);
    setHoveredId(id);
  };

  const handleLeave = () => {
    closeTimeout.current = setTimeout(() => setHoveredId(null), 200);
  };

  const hoveredCat = categories.find((c) => c.id === hoveredId);

  if (categories.length === 0) return null;

  return (
    <div className="hidden lg:block bg-surface/50 border-t border-muted/10 border-b border-b-gray-300 mb-0.5 relative">
      <div className="mx-auto px-4 sm:px-6 lg:px-6 xl:px-6 3xl:px-12">
        <div className="flex items-center justify-between overflow-x-auto scrollbar-hide">
          {categories.map((cat) => {
            const selectedSlugs = currentCategory ? currentCategory.split(',').filter(Boolean) : [];
            const isActive = selectedSlugs.includes(cat.slug) ||
              cat.children?.some((sub) => selectedSlugs.includes(sub.slug) ||
                sub.children?.some((l3) => selectedSlugs.includes(l3.slug)));
            return (
              <div
                key={cat.id}
                className="flex-1 min-w-0"
                onMouseEnter={() => handleEnter(cat.id)}
                onMouseLeave={handleLeave}
              >
                <Link
                  to={`/books?category=${cat.slug}`}
                  className={`block text-center px-3 py-3 text-[13px] 3xl:text-[15px] font-semibold uppercase tracking-wider whitespace-nowrap transition-all duration-200 border-b-2 truncate ${
                    isActive
                      ? 'text-accent border-accent'
                      : 'text-foreground/60 border-transparent hover:text-accent hover:border-accent'
                  }`}
                >
                  {getName(cat)}
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mega menu for hovered category */}
      {hoveredCat && hoveredCat.children && hoveredCat.children.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 z-40 px-4 sm:px-6 lg:px-6 xl:px-6 3xl:px-12 pt-2"
          onMouseEnter={() => handleEnter(hoveredCat.id)}
          onMouseLeave={handleLeave}
        >
          <div className="bg-surface border border-muted/15 rounded-2xl shadow-2xl p-6">
            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-6">
              {hoveredCat.children.map((sub) => (
                <div key={sub.id}>
                  <Link
                    to={`/books?category=${sub.slug}`}
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
                          className="block text-[13px] 3xl:text-sm text-foreground/60 hover:text-accent transition-colors py-0.5"
                        >
                          {getName(l3)}
                        </Link>
                      ))}
                    </div>
                  )}
                  <Link
                    to={`/books?category=${sub.slug}`}
                    className="block text-[13px] 3xl:text-sm text-accent hover:text-accent-light transition-colors py-0.5 mt-1.5 font-medium"
                  >
                    {language === 'ar' ? 'تصفح الكل ←' : 'Browse All →'}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryBar;
