import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiChevronUp, FiChevronDown, FiX, FiPlus, FiSearch, FiGrid, FiLayers, FiStar, FiTrendingUp, FiClock, FiAward, FiGlobe, FiEye, FiEyeOff, FiEdit2, FiCheck } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const GLOBAL_SECTION_META = {
  featured:     { icon: FiStar,       labelKey: 'books.featured' },
  newArrivals:  { icon: FiClock,      labelKey: 'books.newArrival' },
  bestsellers:  { icon: FiAward,      labelKey: 'books.bestseller' },
  trending:     { icon: FiTrendingUp, labelKey: 'books.trending' },
  comingSoon:   { icon: FiGlobe,      labelKey: 'books.comingSoon' },
};

const SECTION_TYPES = ['featured', 'bestsellers', 'newArrivals', 'trending', 'comingSoon'];
const DEFAULT_CORNER_CONFIG = SECTION_TYPES.map((type) => ({ type, enabled: true }));

export default function HomeLayout() {
  const { t, language } = useLanguageStore();
  const [sections, setSections] = useState([]);
  // cornerPicks is now { [cornerId]: { [sectionType]: [book objects] } }
  const [cornerPicks, setCornerPicks] = useState({});
  // cornerSectionConfig is { [cornerSlug]: [{type, enabled}, ...] } — per-corner section order + visibility
  const [cornerSectionConfig, setCornerSectionConfig] = useState({});
  const [corners, setCorners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null); // cornerId
  const [activeTab, setActiveTab] = useState({}); // { [cornerId]: sectionType }
  const [editingTitle, setEditingTitle] = useState(null); // { slug, type } | null — only one row editing at a time
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/home/config');
      setSections(res.data.sections || []);
      // Normalize cornerPicks — if server sends a flat array (old shape), bucket it as 'featured'
      const rawPicks = res.data.cornerPicks || {};
      const normalizedPicks = {};
      Object.entries(rawPicks).forEach(([cornerId, v]) => {
        if (Array.isArray(v)) {
          normalizedPicks[cornerId] = { featured: v, bestsellers: [], newArrivals: [], trending: [], comingSoon: [] };
        } else if (v && typeof v === 'object') {
          normalizedPicks[cornerId] = {
            featured:    Array.isArray(v.featured)    ? v.featured    : [],
            bestsellers: Array.isArray(v.bestsellers) ? v.bestsellers : [],
            newArrivals: Array.isArray(v.newArrivals) ? v.newArrivals : [],
            trending:    Array.isArray(v.trending)    ? v.trending    : [],
            comingSoon:  Array.isArray(v.comingSoon)  ? v.comingSoon  : [],
          };
        } else {
          normalizedPicks[cornerId] = { featured: [], bestsellers: [], newArrivals: [], trending: [], comingSoon: [] };
        }
      });
      setCornerPicks(normalizedPicks);
      setCornerSectionConfig(res.data.cornerSectionConfig || {});
      setCorners(res.data.corners || []);
    } catch {
      toast.error(t('homeLayout.loadFailed') || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const cornersById = Object.fromEntries(corners.map((c) => [c.id, c]));
  const cornerName = (c) => (language === 'ar' && c?.nameAr) ? c.nameAr : c?.name;
  const sectionLabel = (type) => {
    const meta = GLOBAL_SECTION_META[type];
    return meta ? t(meta.labelKey) : type;
  };

  const moveSection = (idx, dir) => {
    setSections((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const toggleSectionEnabled = (idx) => {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, enabled: !s.enabled } : s));
  };

  const moveBook = (cornerId, sectionType, idx, dir) => {
    setCornerPicks((prev) => {
      const bucket = prev[cornerId]?.[sectionType] || [];
      const arr = [...bucket];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...prev, [cornerId]: { ...prev[cornerId], [sectionType]: arr } };
    });
  };

  const removeBook = (cornerId, sectionType, bookId) => {
    setCornerPicks((prev) => {
      const bucket = prev[cornerId]?.[sectionType] || [];
      return { ...prev, [cornerId]: { ...prev[cornerId], [sectionType]: bucket.filter((b) => b.id !== bookId) } };
    });
  };

  const addBook = (cornerId, sectionType, book) => {
    setCornerPicks((prev) => {
      const bucket = prev[cornerId]?.[sectionType] || [];
      if (bucket.some((b) => b.id === book.id)) return prev;
      return { ...prev, [cornerId]: { ...prev[cornerId], [sectionType]: [...bucket, book] } };
    });
  };

  // Per-corner section order/visibility controls
  const moveCornerSection = (slug, idx, dir) => {
    setCornerSectionConfig((prev) => {
      const current = Array.isArray(prev[slug]) ? prev[slug] : DEFAULT_CORNER_CONFIG;
      const next = [...current];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, [slug]: next };
    });
  };

  const toggleCornerSectionEnabled = (slug, sectionType) => {
    setCornerSectionConfig((prev) => {
      const current = Array.isArray(prev[slug]) ? prev[slug] : DEFAULT_CORNER_CONFIG;
      return {
        ...prev,
        [slug]: current.map((s) => s.type === sectionType ? { ...s, enabled: !s.enabled } : s),
      };
    });
  };

  const updateCornerSectionTitle = (slug, sectionType, lang, value) => {
    setCornerSectionConfig((prev) => {
      const current = Array.isArray(prev[slug]) ? prev[slug] : DEFAULT_CORNER_CONFIG.map((s) => ({ ...s }));
      const field = lang === 'ar' ? 'titleAr' : 'titleEn';
      return {
        ...prev,
        [slug]: current.map((s) => s.type === sectionType ? { ...s, [field]: value } : s),
      };
    });
  };

  // Debounced book search
  useEffect(() => {
    if (!expanded) { setSearchResults([]); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/admin/home/books-search', { params: { q: searchQ, cornerId: expanded } });
        setSearchResults(res.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => searchTimerRef.current && clearTimeout(searchTimerRef.current);
  }, [searchQ, expanded]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Flatten picks from {cornerId: {sectionType: [book]}} → {cornerId: {sectionType: [bookId]}}.
      // Every book shown in the list becomes an explicit pick. Flag-merged books are
      // promoted to explicit picks on save; the server's two-way sync keeps flags in step,
      // and the flag-uncheck path on the product edit page cleans up picks if the admin
      // later changes their mind.
      const flatPicks = {};
      Object.entries(cornerPicks).forEach(([cornerId, buckets]) => {
        flatPicks[cornerId] = {};
        Object.entries(buckets).forEach(([sectionType, books]) => {
          flatPicks[cornerId][sectionType] = books.map((b) => b.id);
        });
      });
      await api.put('/admin/home/config', { sections, cornerPicks: flatPicks, cornerSectionConfig });
      toast.success(t('homeLayout.saved') || 'Saved');
    } catch {
      toast.error(t('homeLayout.saveFailed') || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(7)].map((_, i) => <div key={i} className="h-14 bg-admin-bg border border-admin-border rounded-lg animate-pulse" />)}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm mb-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-lg 3xl:text-xl font-bold text-admin-text">{t('homeLayout.title') || 'Home Layout'}</h2>
            <p className="text-xs 3xl:text-sm text-admin-muted mt-1">{t('homeLayout.description') || 'Reorder sections and pick products shown under each corner on the Home page.'}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-admin-accent text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {sections.map((s, idx) => {
          // Global sections (Featured / Bestsellers / etc.) were removed from the
          // storefront home page — hide them from admin too so the UI is honest.
          if (s.type !== 'corner') return null;
          const isCorner = s.type === 'corner';
          const meta = !isCorner ? GLOBAL_SECTION_META[s.type] : null;
          const Icon = isCorner ? FiLayers : (meta?.icon || FiGrid);
          const corner = isCorner ? cornersById[s.cornerId] : null;
          const label = isCorner ? (corner ? cornerName(corner) : (t('homeLayout.unknownCorner') || 'Unknown corner')) : (meta ? t(meta.labelKey) : s.type);
          const cornerBuckets = isCorner ? (cornerPicks[s.cornerId] || {}) : null;
          const totalPicks = isCorner ? SECTION_TYPES.reduce((sum, t) => sum + (cornerBuckets[t]?.length || 0), 0) : 0;
          const isOpen = isCorner && expanded === s.cornerId;
          const currentTab = isCorner ? (activeTab[s.cornerId] || 'featured') : null;
          const cornerConfigArr = isCorner && corner ? (Array.isArray(cornerSectionConfig[corner.slug]) ? cornerSectionConfig[corner.slug] : DEFAULT_CORNER_CONFIG) : null;

          return (
            <div key={isCorner ? `c-${s.cornerId}` : `g-${s.type}`} className={`bg-admin-card border rounded-lg transition-colors ${s.enabled ? 'border-admin-border' : 'border-admin-border/50 opacity-70'}`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-[11px] font-semibold text-admin-muted w-6 text-center select-none">{String(idx + 1).padStart(2, '0')}</span>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="p-1 text-admin-muted hover:text-admin-accent disabled:opacity-25 transition-colors"><FiChevronUp size={14} /></button>
                  <button onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1} className="p-1 text-admin-muted hover:text-admin-accent disabled:opacity-25 transition-colors"><FiChevronDown size={14} /></button>
                </div>
                <input type="checkbox" checked={s.enabled !== false} onChange={() => toggleSectionEnabled(idx)} className="w-4 h-4 rounded border-gray-300 text-admin-accent focus:ring-admin-accent flex-shrink-0 cursor-pointer" />
                <div className="w-8 h-8 rounded-lg bg-admin-accent/10 text-admin-accent flex items-center justify-center flex-shrink-0">
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-admin-text truncate">{label}</p>
                  <p className="text-[11px] text-admin-muted mt-0.5">
                    {isCorner
                      ? `${totalPicks} ${t('homeLayout.picks') || 'picks'} across 5 sections`
                      : (t('homeLayout.global') || 'global section')}
                  </p>
                </div>
                {isCorner && (
                  <button
                    onClick={() => { setExpanded(isOpen ? null : s.cornerId); setSearchQ(''); }}
                    className="px-3 py-1.5 text-xs font-medium text-admin-accent bg-admin-accent/10 hover:bg-admin-accent/20 rounded-lg transition-colors"
                  >
                    {isOpen ? (t('homeLayout.close') || 'Close') : (t('homeLayout.managePicks') || 'Manage Picks')}
                  </button>
                )}
              </div>

              {isOpen && corner && (
                <div className="px-4 pb-4 pt-2 border-t border-admin-border space-y-4">
                  {/* Per-corner section order + visibility */}
                  <div>
                    <h4 className="text-xs font-semibold text-admin-muted uppercase tracking-wider mb-2">
                      {t('homeLayout.sectionOrder') || 'Section order on corner page'}
                    </h4>
                    <div className="space-y-1.5">
                      {cornerConfigArr.map((entry, eIdx) => {
                        const isEditingThis = editingTitle?.slug === corner.slug && editingTitle?.type === entry.type;
                        const hasCustomTitle = (entry.titleEn && entry.titleEn.trim()) || (entry.titleAr && entry.titleAr.trim());
                        return (
                        <div key={entry.type} className={`flex items-center gap-3 px-3 py-2 border border-admin-border rounded-lg ${entry.enabled ? 'bg-admin-bg' : 'bg-admin-bg/40 opacity-60'}`}>
                          <span className="text-[11px] font-semibold text-admin-muted w-5 text-center select-none">{eIdx + 1}</span>
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveCornerSection(corner.slug, eIdx, -1)} disabled={eIdx === 0} className="p-0.5 text-admin-muted hover:text-admin-accent disabled:opacity-25"><FiChevronUp size={12} /></button>
                            <button onClick={() => moveCornerSection(corner.slug, eIdx, 1)} disabled={eIdx === cornerConfigArr.length - 1} className="p-0.5 text-admin-muted hover:text-admin-accent disabled:opacity-25"><FiChevronDown size={12} /></button>
                          </div>
                          <button
                            onClick={() => toggleCornerSectionEnabled(corner.slug, entry.type)}
                            className={`p-1.5 rounded-md border transition-all duration-150 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-admin-accent/40 ${
                              entry.enabled
                                ? 'text-admin-accent bg-admin-accent/10 border-admin-accent/20 hover:bg-admin-accent/20 hover:border-admin-accent/40'
                                : 'text-admin-muted bg-admin-bg border-admin-border hover:bg-admin-accent/10 hover:text-admin-accent hover:border-admin-accent/30'
                            }`}
                            title={entry.enabled ? (t('homeLayout.hideSection') || 'Hide section') : (t('homeLayout.showSection') || 'Show section')}
                          >
                            {entry.enabled ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                          </button>

                          {isEditingThis ? (
                            <>
                              <div className="flex-1 min-w-0">
                                <label className="block text-[10px] font-semibold text-admin-muted uppercase tracking-wider mb-0.5">
                                  {t('homeLayout.labelEnglish') || 'English title'}
                                </label>
                                <input
                                  type="text"
                                  value={entry.titleEn || ''}
                                  onChange={(e) => updateCornerSectionTitle(corner.slug, entry.type, 'en', e.target.value)}
                                  maxLength={80}
                                  placeholder={sectionLabel(entry.type)}
                                  autoFocus
                                  className="w-full px-2 py-1 text-sm bg-white border border-admin-border rounded-md focus:outline-none focus:border-admin-accent"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <label className="block text-[10px] font-semibold text-admin-muted uppercase tracking-wider mb-0.5">
                                  {t('homeLayout.labelArabic') || 'Arabic title'}
                                </label>
                                <input
                                  type="text"
                                  dir="rtl"
                                  value={entry.titleAr || ''}
                                  onChange={(e) => updateCornerSectionTitle(corner.slug, entry.type, 'ar', e.target.value)}
                                  maxLength={80}
                                  placeholder={sectionLabel(entry.type)}
                                  className="w-full px-2 py-1 text-sm bg-white border border-admin-border rounded-md focus:outline-none focus:border-admin-accent"
                                />
                              </div>
                              <button
                                onClick={() => setEditingTitle(null)}
                                className="self-end p-1.5 rounded-md text-admin-accent bg-admin-accent/10 border border-admin-accent/20 hover:bg-admin-accent/20 hover:border-admin-accent/40 transition-colors"
                                title={t('common.done') || 'Done'}
                              >
                                <FiCheck size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-admin-text truncate">{sectionLabel(entry.type)}</p>
                                {hasCustomTitle && (
                                  <p className="text-[11px] text-admin-muted truncate mt-0.5">
                                    {[entry.titleEn?.trim(), entry.titleAr?.trim()].filter(Boolean).join(' · ')}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => setEditingTitle({ slug: corner.slug, type: entry.type })}
                                className="p-1.5 rounded-md text-admin-muted bg-admin-bg border border-admin-border hover:text-admin-accent hover:bg-admin-accent/10 hover:border-admin-accent/30 transition-colors"
                                title={t('homeLayout.renameSection') || 'Rename section'}
                              >
                                <FiEdit2 size={14} />
                              </button>
                              <p className="text-[11px] text-admin-muted flex-shrink-0 whitespace-nowrap">{cornerBuckets[entry.type]?.length || 0} {t('homeLayout.picks') || 'picks'}</p>
                            </>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section tabs for picks */}
                  <div>
                    <h4 className="text-xs font-semibold text-admin-muted uppercase tracking-wider mb-2">
                      {t('homeLayout.pickPerSection') || 'Pick products per section'}
                    </h4>
                    <p className="text-[11px] text-admin-muted mb-2 leading-snug">
                      {t('homeLayout.flagMergeHint') || 'Books flagged via the product page (Featured / Bestseller / etc.) appear here automatically under the matching tab. Rearrange or remove as needed — your save becomes the explicit pick order.'}
                    </p>
                    <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                      {SECTION_TYPES.map((type) => {
                        const count = cornerBuckets[type]?.length || 0;
                        const isActive = currentTab === type;
                        return (
                          <button
                            key={type}
                            onClick={() => setActiveTab((prev) => ({ ...prev, [s.cornerId]: type }))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                              isActive
                                ? 'bg-admin-accent text-white border-admin-accent'
                                : 'bg-admin-bg text-admin-text border-admin-border hover:border-admin-accent hover:text-admin-accent'
                            }`}
                          >
                            {sectionLabel(type)}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isActive ? 'bg-white/20' : 'bg-admin-accent/10 text-admin-accent'}`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Current picks for the active tab */}
                    {(() => {
                      const picks = cornerBuckets[currentTab] || [];
                      return (
                        <>
                          {picks.length === 0 ? (
                            <p className="text-sm text-admin-muted italic mb-3">{t('homeLayout.noPicksInSection') || 'No products picked for this section yet. The storefront will fall back to flag-based books if this section is enabled.'}</p>
                          ) : (
                            <div className="space-y-1.5 mb-3">
                              {picks.map((book, bIdx) => (
                                <div key={book.id} className="flex items-center gap-3 px-3 py-2 bg-admin-bg border border-admin-border rounded-lg">
                                  <div className="flex flex-col gap-0.5">
                                    <button onClick={() => moveBook(s.cornerId, currentTab, bIdx, -1)} disabled={bIdx === 0} className="p-0.5 text-admin-muted hover:text-admin-accent disabled:opacity-25"><FiChevronUp size={12} /></button>
                                    <button onClick={() => moveBook(s.cornerId, currentTab, bIdx, 1)} disabled={bIdx === picks.length - 1} className="p-0.5 text-admin-muted hover:text-admin-accent disabled:opacity-25"><FiChevronDown size={12} /></button>
                                  </div>
                                  {book.coverImage ? (
                                    <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/${book.coverImage}`} alt="" width="32" height="40" className="w-8 h-10 object-cover rounded flex-shrink-0" />
                                  ) : (
                                    <div className="w-8 h-10 bg-admin-accent/10 rounded flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="text-sm font-medium text-admin-text truncate">{language === 'ar' && book.titleAr ? book.titleAr : book.title}</p>
                                      {book.isActive === false && (
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">{t('homeLayout.inactive') || 'Inactive'}</span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-admin-muted mt-0.5 truncate">{book.sku || '—'}</p>
                                  </div>
                                  <button onClick={() => removeBook(s.cornerId, currentTab, book.id)} className="p-1.5 text-admin-muted hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><FiX size={14} /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Search + add (adds to the currently active tab) */}
                    <div className="relative mb-2">
                      <FiSearch className="absolute start-3 top-1/2 -translate-y-1/2 text-admin-muted" size={14} />
                      <input
                        type="text"
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder={`${t('homeLayout.searchPlaceholder') || 'Search by title or barcode'} (${sectionLabel(currentTab)})`}
                        className="w-full ps-9 pe-3 py-2 bg-white border border-admin-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent"
                      />
                    </div>
                    {searching ? (
                      <p className="text-xs text-admin-muted">{t('common.loading') || 'Loading...'}</p>
                    ) : searchResults.length === 0 ? (
                      <p className="text-xs text-admin-muted">{t('homeLayout.noResults') || 'No matching products in this corner.'}</p>
                    ) : (
                      <div className="space-y-1.5 max-h-72 overflow-y-auto">
                        {searchResults.map((book) => {
                          const isAdded = (cornerBuckets[currentTab] || []).some((p) => p.id === book.id);
                          return (
                            <div key={book.id} className={`flex items-center gap-3 px-3 py-2 bg-white border border-admin-border rounded-lg ${isAdded ? 'opacity-50' : ''}`}>
                              {book.coverImage ? (
                                <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/${book.coverImage}`} alt="" width="32" height="40" className="w-8 h-10 object-cover rounded flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-10 bg-admin-accent/10 rounded flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-admin-text truncate">{language === 'ar' && book.titleAr ? book.titleAr : book.title}</p>
                                <p className="text-[11px] text-admin-muted mt-0.5 truncate">{book.sku || '—'}</p>
                              </div>
                              <button
                                onClick={() => addBook(s.cornerId, currentTab, book)}
                                disabled={isAdded}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-admin-accent bg-admin-accent/10 hover:bg-admin-accent/20 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <FiPlus size={12} /> {isAdded ? (t('homeLayout.added') || 'Added') : (t('common.add') || 'Add')}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
