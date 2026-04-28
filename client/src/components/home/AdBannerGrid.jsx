import { Link } from 'react-router-dom';
import Image from '../common/Image';
import useLanguageStore from '../../stores/useLanguageStore';

// Per-corner promotional ad row.
//
// Layout: a "magazine" grid on md+ where positions 1 & 3 are tall feature
// tiles spanning 2 rows, and positions 2/4/5/6 are small tiles. On mobile
// (< md) the same 6 tiles are rearranged into a 2-col × 4-row mirror so the
// magazine doesn't get squashed: T1 (feature) top-right with T2/T4 stacked
// on its left, T3 (feature) bottom-left with T5/T6 stacked on its right.
//
// If the corner has fewer than 6 active tiles, we fall back to a simple grid
// at every breakpoint — the magazine layout only makes sense at exactly 6.
const AdBannerGrid = ({ tiles }) => {
  const { language } = useLanguageStore();
  const isRTL = language === 'ar';

  if (!Array.isArray(tiles) || tiles.length === 0) return null;

  const visible = tiles.filter((t) => t && t.image);
  if (visible.length === 0) return null;

  // Sort by position so tile 1 is always the left hero, etc.
  const ordered = [...visible].sort((a, b) => (a.position || 0) - (b.position || 0));
  const isMagazine = ordered.length === 6;

  const renderTile = (tile, isFeature) => {
    const title = isRTL && tile.titleAr ? tile.titleAr : tile.title;
    const target = tile.book?.slug
      ? `/books/${tile.book.slug}`
      : (tile.externalLink && tile.externalLink.length > 0 ? tile.externalLink : null);
    const isExternal = target && /^https?:\/\//i.test(target);

    const inner = (
      <>
        <Image
          src={tile.image}
          alt={title || ''}
          width={isFeature ? 800 : 400}
          height={isFeature ? 1000 : 400}
          widths={[400, 800, 1600]}
          sizes={isFeature
            ? '(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 28vw'
            : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 18vw'}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {title && (
          <div className="absolute inset-x-0 bottom-0 px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/55">
            <p className={`${isFeature ? 'text-sm sm:text-base' : 'text-[11px] sm:text-xs'} font-semibold text-white line-clamp-1`}>
              {title}
            </p>
          </div>
        )}
      </>
    );

    const wrapperClass = `group relative block w-full h-full rounded-xl overflow-hidden bg-surface-alt border border-muted/10 focus:outline-none ${target ? 'hover:ring-2 hover:ring-[#560736]/50 focus-visible:ring-2 focus-visible:ring-[#560736]/60 transition-all' : 'pointer-events-none opacity-70'}`;

    if (!target) return <div className={wrapperClass}>{inner}</div>;
    if (isExternal) {
      return (
        <a href={target} target="_blank" rel="noopener noreferrer" className={wrapperClass}>
          {inner}
        </a>
      );
    }
    return <Link to={target} className={wrapperClass}>{inner}</Link>;
  };

  // Fallback simple grid when we don't have exactly 6 tiles
  if (!isMagazine) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 3xl:gap-6 mb-6 sm:mb-8"
      >
        {ordered.map((tile) => (
          <div key={tile.id || `${tile.position}`} className="aspect-[2/1]">
            {renderTile(tile, false)}
          </div>
        ))}
      </div>
    );
  }

  // 6-tile layout. Mobile (< md): 2 cols × 4 rows mirror.
  //
  //   col1       col2
  // ┌──────────┬──────────┐
  // │   T2     │          │
  // ├──────────┤  T1 ★    │
  // │   T4     │          │
  // ├──────────┼──────────┤
  // │          │   T5     │
  // │  T3 ★    ├──────────┤
  // │          │   T6     │
  // └──────────┴──────────┘
  //
  // md+: original magazine — T1/T3 tall in cols 1 & 3; T2/T4/T5/T6 in 2 & 4.
  const [t1, t2, t3, t4, t5, t6] = ordered;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="mb-6 sm:mb-8"
    >
      <div
        className="grid gap-2 sm:gap-3 lg:gap-4 3xl:gap-5
          grid-cols-2 grid-rows-4
          md:grid-cols-[1.4fr_1fr_1.4fr_1fr] md:grid-rows-2
          aspect-[2/3] md:aspect-[12/5] lg:aspect-[3/1] 3xl:aspect-[7/2]"
      >
        <div className="col-start-2 row-start-1 row-span-2 md:col-start-1 md:row-start-1 md:row-span-2">{renderTile(t1, true)}</div>
        <div className="col-start-1 row-start-1 md:col-start-2 md:row-start-1">{renderTile(t2, false)}</div>
        <div className="col-start-1 row-start-3 row-span-2 md:col-start-3 md:row-start-1 md:row-span-2">{renderTile(t3, true)}</div>
        <div className="col-start-1 row-start-2 md:col-start-4 md:row-start-1">{renderTile(t4, false)}</div>
        <div className="col-start-2 row-start-3 md:col-start-2 md:row-start-2">{renderTile(t5, false)}</div>
        <div className="col-start-2 row-start-4 md:col-start-4 md:row-start-2">{renderTile(t6, false)}</div>
      </div>
    </div>
  );
};

export default AdBannerGrid;
