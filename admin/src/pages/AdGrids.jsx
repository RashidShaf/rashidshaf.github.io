import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiSearch, FiPlus } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');
const POSITIONS = [1, 2, 3, 4, 5, 6];

const blankTile = (position) => ({
  position,
  image: '',
  imageFile: null,
  imagePreview: null,
  imageMarkedForRemoval: false,
  bookId: null,
  book: null,
  externalLink: '',
  title: '',
  titleAr: '',
  isActive: true,
  isPlaceholder: true,
});

// Inline product picker — wraps a small dropdown over the admin books endpoint.
function BookPicker({ value, book, onSelect, onClear }) {
  const { t, language } = useLanguageStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const tid = setTimeout(async () => {
      try {
        const res = await api.get('/admin/books', { params: { search: query.trim(), limit: 8 } });
        if (cancelled) return;
        const data = res.data?.data || res.data?.books || res.data || [];
        setResults(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(tid); };
  }, [query, open]);

  const displayName = (b) => language === 'ar' && b.titleAr ? b.titleAr : b.title;

  if (book && value) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-2 bg-blue-50 border border-blue-200 rounded-md">
        <span className="flex-1 text-xs text-admin-text font-medium truncate" title={displayName(book)}>
          {displayName(book)}
        </span>
        <button type="button" onClick={onClear} className="text-admin-muted hover:text-red-500" aria-label="clear">
          <FiX size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <FiSearch className="absolute start-2 top-1/2 -translate-y-1/2 text-admin-muted pointer-events-none" size={12} />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={t('books.searchProduct')}
          className="w-full ps-7 pe-2 py-2 bg-white border border-admin-input-border rounded-md text-xs text-admin-text focus:outline-none focus:border-admin-accent"
        />
      </div>
      {open && (query.trim().length >= 2) && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {loading && <p className="p-2 text-xs text-admin-muted">{t('books.loadingDots')}</p>}
          {!loading && results.length === 0 && <p className="p-2 text-xs text-admin-muted">{t('books.noMatches')}</p>}
          {!loading && results.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => { onSelect(b); setQuery(''); setOpen(false); }}
              className="w-full text-start px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-100 last:border-0 truncate"
            >
              {displayName(b)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TileCard({ tile, onChange, position }) {
  const { t } = useLanguageStore();
  const fileRef = useRef(null);

  const handlePickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
      imageMarkedForRemoval: false,
    });
    // Allow re-picking the same file later
    if (fileRef.current) fileRef.current.value = '';
  };

  const previewSrc = tile.imageMarkedForRemoval
    ? null
    : (tile.imagePreview || (tile.image ? `${API_BASE}/${tile.image}` : null));
  const hasImage = !!previewSrc;
  const hasMetadata = !!(tile.bookId || tile.externalLink || tile.title || tile.titleAr);
  const hasContent = hasImage || hasMetadata;

  const clearImage = () => {
    if (tile.imagePreview) {
      try { URL.revokeObjectURL(tile.imagePreview); } catch {}
    }
    onChange({
      imageFile: null,
      imagePreview: null,
      // If a server-saved image existed, mark it for deferred removal on Save grid.
      // (If the tile was newly added in this session, no server cleanup needed.)
      imageMarkedForRemoval: !!tile.image,
    });
  };

  // Truly empty slot (no image, no metadata): compact placeholder so corners
  // with <6 tiles don't show 6 full-size empty editors.
  if (!hasContent) {
    return (
      <div className="bg-white border border-admin-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-admin-muted">
            {t('books.tileLabel').replace('{{n}}', position)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative aspect-[5/3] w-full bg-gray-50 border-2 border-dashed border-admin-border rounded-md cursor-pointer hover:border-admin-accent hover:bg-gray-100 transition-colors overflow-hidden flex items-center justify-center text-admin-muted text-[11px]"
        >
          <div className="flex flex-col items-center gap-1">
            <FiPlus size={20} />
            <span>{t('books.addTile')}</span>
          </div>
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePickImage} className="hidden" />
      </div>
    );
  }

  // Tile with content — full editor. The image area shows either the actual
  // image (with X to remove) or an empty dropzone when image was cleared
  // but the tile still has link/title metadata.
  return (
    <div className="bg-white border border-admin-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider text-admin-muted">
          {t('books.tileLabel').replace('{{n}}', position)}
        </span>
        <label className="flex items-center gap-1.5 text-[11px] text-admin-muted">
          <input
            type="checkbox"
            checked={tile.isActive}
            onChange={(e) => onChange({ isActive: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-admin-input-border text-admin-accent focus:ring-admin-accent"
          />
          {t('common.active')}
        </label>
      </div>

      {hasImage ? (
        <div className="relative aspect-square w-full bg-gray-100 border border-admin-border rounded-md overflow-hidden">
          <img src={previewSrc} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-1.5 end-1.5 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
            aria-label={t('books.removeImage')}
            title={t('books.removeImage')}
          >
            <FiX size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative aspect-square w-full bg-gray-50 border-2 border-dashed border-admin-border rounded-md cursor-pointer hover:border-admin-accent hover:bg-gray-100 transition-colors overflow-hidden flex items-center justify-center text-admin-muted text-[11px]"
        >
          <div className="flex flex-col items-center gap-1">
            <FiPlus size={20} />
            <span>{t('books.addTile')}</span>
          </div>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={handlePickImage} className="hidden" />

      <div>
        <label className="block text-[10px] font-medium text-admin-muted mb-1">{t('books.linkedProduct')}</label>
        <BookPicker
          value={tile.bookId}
          book={tile.book}
          onSelect={(b) => onChange({ bookId: b.id, book: b, externalLink: '' })}
          onClear={() => onChange({ bookId: null, book: null })}
        />
      </div>

      <div>
        <label className="block text-[10px] font-medium text-admin-muted mb-1">{t('books.externalLink')}</label>
        <input
          type="text"
          value={tile.externalLink || ''}
          onChange={(e) => onChange({ externalLink: e.target.value })}
          placeholder="https://..."
          disabled={!!tile.bookId}
          className="w-full px-2.5 py-1.5 bg-white border border-admin-input-border rounded-md text-[11px] text-admin-text focus:outline-none focus:border-admin-accent disabled:bg-gray-100 disabled:text-admin-muted"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-medium text-admin-muted mb-1">{t('books.tileTitleEn')}</label>
          <input
            type="text"
            value={tile.title || ''}
            onChange={(e) => onChange({ title: e.target.value })}
            className="w-full px-2 py-1.5 bg-white border border-admin-input-border rounded-md text-[11px] text-admin-text focus:outline-none focus:border-admin-accent"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-admin-muted mb-1">{t('books.tileTitleAr')}</label>
          <input
            type="text"
            value={tile.titleAr || ''}
            onChange={(e) => onChange({ titleAr: e.target.value })}
            dir="rtl"
            className="w-full px-2 py-1.5 bg-white border border-admin-input-border rounded-md text-[11px] text-admin-text focus:outline-none focus:border-admin-accent"
          />
        </div>
      </div>
    </div>
  );
}

export default function AdGrids() {
  const { t, language } = useLanguageStore();
  const [corners, setCorners] = useState([]);
  const [selectedCornerId, setSelectedCornerId] = useState('');
  const [tiles, setTiles] = useState(POSITIONS.map(blankTile));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load all parent (L1) categories — those are the corners
  useEffect(() => {
    api.get('/admin/categories').then((res) => {
      const all = res.data?.data || res.data || [];
      const parents = all.filter((c) => !c.parentId).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setCorners(parents);
      if (!selectedCornerId && parents.length > 0) setSelectedCornerId(parents[0].id);
    }).catch(() => toast.error(t('books.failedLoadCorners')));
    // eslint-disable-next-line
  }, []);

  // When corner changes, fetch its tiles (padded to 6)
  useEffect(() => {
    if (!selectedCornerId) return;
    setLoading(true);
    api.get(`/admin/ad-grids/${selectedCornerId}`).then((res) => {
      const padded = (res.data?.tiles || []).map((t) => ({
        position: t.position,
        image: t.image || '',
        imageFile: null,
        imagePreview: null,
        imageMarkedForRemoval: false,
        bookId: t.bookId || null,
        book: t.book || null,
        externalLink: t.externalLink || '',
        title: t.title || '',
        titleAr: t.titleAr || '',
        isActive: t.isActive !== false,
        isPlaceholder: !!t.isPlaceholder,
      }));
      const map = new Map(padded.map((p) => [p.position, p]));
      setTiles(POSITIONS.map((p) => map.get(p) || blankTile(p)));
    }).catch(() => toast.error(t('books.failedLoadTiles'))).finally(() => setLoading(false));
  }, [selectedCornerId, t]);

  const updateTile = (position, patch) => {
    setTiles((prev) => prev.map((tt) => tt.position === position ? { ...tt, ...patch } : tt));
  };

  const onTileImageUploaded = (position, serverImagePath) => {
    setTiles((prev) => prev.map((tt) => tt.position === position
      ? { ...tt, image: serverImagePath, imageFile: null, imagePreview: null, imageMarkedForRemoval: false, isPlaceholder: false }
      : tt));
  };

  // Save: upload any pending image files, then PUT the full grid. A tile with
  // its image cleared (X clicked, no replacement picked) is sent with image=null
  // so the row keeps its metadata while the storefront stops rendering it.
  const handleSave = async () => {
    if (!selectedCornerId) return;
    setSaving(true);
    try {
      // Upload any pending image files first so each tile's `image` ends up
      // pointing at the persisted path before the PUT.
      const pending = tiles.filter((tt) => tt.imageFile);
      for (const tt of pending) {
        const fd = new FormData();
        fd.append('image', tt.imageFile);
        try {
          const res = await api.post(`/admin/ad-grids/${selectedCornerId}/tile/${tt.position}/image`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          onTileImageUploaded(tt.position, res.data.image);
          tt.image = res.data.image;
          tt.imageFile = null;
          tt.imageMarkedForRemoval = false;
        } catch {
          toast.warning(t('books.uploadFailed') + ` (${tt.position})`);
        }
      }

      // Build payload. Skip pure placeholder slots (no image, no metadata).
      // Otherwise include the tile so the server keeps its metadata even
      // when the image was cleared via the X button.
      const hasContent = (tt) => (tt.image && !tt.imageMarkedForRemoval)
        || tt.bookId || tt.externalLink || tt.title || tt.titleAr;
      const payload = tiles
        .filter((tt) => hasContent(tt))
        .map((tt) => ({
          position: tt.position,
          image: tt.imageMarkedForRemoval ? null : (tt.image || null),
          bookId: tt.bookId || null,
          externalLink: tt.externalLink || null,
          title: tt.title || null,
          titleAr: tt.titleAr || null,
          isActive: tt.isActive,
        }));

      const res = await api.put(`/admin/ad-grids/${selectedCornerId}`, { tiles: payload });
      const fresh = res.data?.tiles || [];
      const map = new Map(fresh.map((p) => [p.position, p]));
      setTiles(POSITIONS.map((p) => {
        const tt = map.get(p);
        if (!tt) return blankTile(p);
        return {
          position: tt.position,
          image: tt.image || '',
          imageFile: null,
          imagePreview: null,
          imageMarkedForRemoval: false,
          bookId: tt.bookId || null,
          book: tt.book || null,
          externalLink: tt.externalLink || '',
          title: tt.title || '',
          titleAr: tt.titleAr || '',
          isActive: tt.isActive !== false,
          isPlaceholder: false,
        };
      }));
      toast.success(t('books.adGridSaved'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('books.failedSaveGrid'));
    } finally {
      setSaving(false);
    }
  };

  const cornerName = (c) => language === 'ar' && c.nameAr ? c.nameAr : c.name;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl 3xl:text-3xl font-bold text-admin-text">{t('books.adGridsTitle')}</h2>
        <p className="text-sm text-admin-muted mt-1">{t('books.adGridsHint')}</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-admin-card rounded-xl border border-admin-border p-4 shadow-sm">
            <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider mb-3">{t('nav.categories')}</h3>
            <div className="space-y-1">
              {corners.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCornerId(c.id)}
                  className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCornerId === c.id
                      ? 'bg-admin-accent text-white font-semibold'
                      : 'text-admin-text hover:bg-gray-100'
                  }`}
                >
                  {cornerName(c)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-admin-card rounded-xl border border-admin-border p-4 sm:p-6 shadow-sm">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {POSITIONS.map((p) => (
                  <div key={p} className="h-72 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {tiles.map((tile) => (
                    <TileCard
                      key={tile.position}
                      tile={tile}
                      position={tile.position}
                      onChange={(patch) => updateTile(tile.position, patch)}
                    />
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-admin-accent text-white font-semibold rounded-lg hover:bg-admin-accent/90 disabled:opacity-50 text-sm"
                  >
                    {saving ? t('common.saving') : t('books.saveGrid')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
