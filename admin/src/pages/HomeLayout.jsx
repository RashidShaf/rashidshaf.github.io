import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiChevronUp, FiChevronDown, FiX, FiPlus, FiSearch, FiGrid, FiLayers, FiStar, FiTrendingUp, FiClock, FiAward, FiGlobe } from 'react-icons/fi';
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

export default function HomeLayout() {
  const { t, language } = useLanguageStore();
  const [sections, setSections] = useState([]);
  const [cornerPicks, setCornerPicks] = useState({}); // cornerId -> [book objects]
  const [corners, setCorners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null); // cornerId
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/home/config');
      setSections(res.data.sections || []);
      setCornerPicks(res.data.cornerPicks || {});
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

  const moveBook = (cornerId, idx, dir) => {
    setCornerPicks((prev) => {
      const arr = [...(prev[cornerId] || [])];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...prev, [cornerId]: arr };
    });
  };

  const removeBook = (cornerId, bookId) => {
    setCornerPicks((prev) => ({ ...prev, [cornerId]: (prev[cornerId] || []).filter((b) => b.id !== bookId) }));
  };

  const addBook = (cornerId, book) => {
    setCornerPicks((prev) => {
      const arr = prev[cornerId] || [];
      if (arr.some((b) => b.id === book.id)) return prev;
      return { ...prev, [cornerId]: [...arr, book] };
    });
  };

  // Debounced search when a corner is expanded
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
      const payload = {
        sections,
        cornerPicks: Object.fromEntries(
          Object.entries(cornerPicks).map(([cornerId, books]) => [cornerId, books.map((b) => b.id)])
        ),
      };
      await api.put('/admin/home/config', payload);
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
          const isCorner = s.type === 'corner';
          const meta = !isCorner ? GLOBAL_SECTION_META[s.type] : null;
          const Icon = isCorner ? FiLayers : (meta?.icon || FiGrid);
          const corner = isCorner ? cornersById[s.cornerId] : null;
          const label = isCorner ? (corner ? cornerName(corner) : (t('homeLayout.unknownCorner') || 'Unknown corner')) : (meta ? t(meta.labelKey) : s.type);
          const picks = isCorner ? (cornerPicks[s.cornerId] || []) : null;
          const isOpen = isCorner && expanded === s.cornerId;

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
                      ? `${picks.length} ${t('homeLayout.picks') || 'picks'}`
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

              {isOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-admin-border space-y-3">
                  {/* Current picks */}
                  <div>
                    <h4 className="text-xs font-semibold text-admin-muted uppercase tracking-wider mb-2">{t('homeLayout.currentPicks') || 'Current picks'}</h4>
                    {picks.length === 0 ? (
                      <p className="text-sm text-admin-muted italic">{t('homeLayout.noPicks') || 'No products picked for this corner yet.'}</p>
                    ) : (
                      <div className="space-y-1.5">
                        {picks.map((book, bIdx) => (
                          <div key={book.id} className="flex items-center gap-3 px-3 py-2 bg-admin-bg border border-admin-border rounded-lg">
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => moveBook(s.cornerId, bIdx, -1)} disabled={bIdx === 0} className="p-0.5 text-admin-muted hover:text-admin-accent disabled:opacity-25"><FiChevronUp size={12} /></button>
                              <button onClick={() => moveBook(s.cornerId, bIdx, 1)} disabled={bIdx === picks.length - 1} className="p-0.5 text-admin-muted hover:text-admin-accent disabled:opacity-25"><FiChevronDown size={12} /></button>
                            </div>
                            {book.coverImage ? (
                              <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/${book.coverImage}`} alt="" width="32" height="40" className="w-8 h-10 object-cover rounded flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-10 bg-admin-accent/10 rounded flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-admin-text truncate">{language === 'ar' && book.titleAr ? book.titleAr : book.title}</p>
                                {book.isActive === false && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">{t('homeLayout.inactive')}</span>
                                )}
                              </div>
                              <p className="text-[11px] text-admin-muted mt-0.5 truncate">{book.sku || '—'}</p>
                            </div>
                            <button onClick={() => removeBook(s.cornerId, book.id)} className="p-1.5 text-admin-muted hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><FiX size={14} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Search + add */}
                  <div>
                    <h4 className="text-xs font-semibold text-admin-muted uppercase tracking-wider mb-2">{t('homeLayout.addProduct') || 'Add product'}</h4>
                    <div className="relative mb-2">
                      <FiSearch className="absolute start-3 top-1/2 -translate-y-1/2 text-admin-muted" size={14} />
                      <input
                        type="text"
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder={t('homeLayout.searchPlaceholder') || 'Search by title or barcode'}
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
                          const isAdded = picks.some((p) => p.id === book.id);
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
                                onClick={() => addBook(s.cornerId, book)}
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
