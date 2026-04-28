import { Link } from 'react-router-dom';
import Image from '../common/Image';
import useLanguageStore from '../../stores/useLanguageStore';

// Per-corner promotional ad row.
//
// Layout: a "magazine" grid on desktop where positions 1 & 3 are tall feature
// tiles spanning 2 rows, and positions 2/4/5/6 are small tiles. On smaller
// screens it gracefully degrades to a flat grid (3 cols on tablet, 2 cols on
// mobile) so the asymmetric desktop layout never breaks on narrow viewports.
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

  // 6-tile magazine layout — same 4-col × 2-row grid at every breakpoint.
  // Tiles 1 and 3 span both rows (the wider columns), tiles 2/4/5/6 fill the
  // narrow columns. Cells scale proportionally on small screens — no separate
  // mobile/tablet branches.
  //
  //   col1     col2     col3     col4
  // ┌────────┬────────┬────────┬────────┐
  // │  T1    │   T2   │   T3   │   T4   │
  // │ (tall) ├────────┤ (tall) ├────────┤
  // │        │   T5   │        │   T6   │
  // └────────┴────────┴────────┴────────┘
  const [t1, t2, t3, t4, t5, t6] = ordered;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="mb-6 sm:mb-8"
    >
      <div
        className="grid gap-2 sm:gap-3 lg:gap-4 3xl:gap-5 aspect-[12/5] lg:aspect-[3/1] 3xl:aspect-[7/2]"
        style={{
          gridTemplateColumns: '1.4fr 1fr 1.4fr 1fr',
          gridTemplateRows: '1fr 1fr',
        }}
      >
        <div style={{ gridColumn: '1', gridRow: '1 / span 2' }}>{renderTile(t1, true)}</div>
        <div style={{ gridColumn: '2', gridRow: '1' }}>{renderTile(t2, false)}</div>
        <div style={{ gridColumn: '3', gridRow: '1 / span 2' }}>{renderTile(t3, true)}</div>
        <div style={{ gridColumn: '4', gridRow: '1' }}>{renderTile(t4, false)}</div>
        <div style={{ gridColumn: '2', gridRow: '2' }}>{renderTile(t5, false)}</div>
        <div style={{ gridColumn: '4', gridRow: '2' }}>{renderTile(t6, false)}</div>
      </div>
    </div>
  );
};

export default AdBannerGrid;
