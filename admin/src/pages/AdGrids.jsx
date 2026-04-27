import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FiUpload, FiX, FiSearch, FiTrash2, FiImage } from 'react-icons/fi';
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
  bookId: null,
  book: null,
  externalLink: '',
  title: '',
  titleAr: '',
  isActive: true,
  isPlaceholder: true,
});

// Inline book search/picker — wraps a small dropdown over the admin books list endpoint.
function BookPicker({ value, book, onSelect, onClear }) {
  const { language } = useLanguageStore();
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
          placeholder="Search product..."
          className="w-full ps-7 pe-2 py-2 bg-white border border-admin-input-border rounded-md text-xs text-admin-text focus:outline-none focus:border-admin-accent"
        />
      </div>
      {open && (query.trim().length >= 2) && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {loading && <p className="p-2 text-xs text-admin-muted">Loading...</p>}
          {!loading && results.length === 0 && <p className="p-2 text-xs text-admin-muted">No matches</p>}
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

function TileCard({ tile, onChange, position, cornerId, onUploaded }) {
  const fileRef = useRef(null);

  const handlePickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({ imageFile: file, imagePreview: URL.createObjectURL(file) });
  };

  const handleUploadNow = async () => {
    if (!tile.imageFile) return;
    const fd = new FormData();
    fd.append('image', tile.imageFile);
    try {
      const res = await api.post(`/admin/ad-grids/${cornerId}/tile/${position}/image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(res.data.image);
      toast.success(`Tile ${position} image uploaded`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }
  };

  const previewSrc = tile.imagePreview || (tile.image ? `${API_BASE}/${tile.image}` : null);

  return (
    <div className="bg-white border border-admin-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-admin-muted">Tile {position}</span>
        <label className="flex items-center gap-1.5 text-[11px] text-admin-muted">
          <input
            type="checkbox"
            checked={tile.isActive}
            onChange={(e) => onChange({ isActive: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-admin-input-border text-admin-accent focus:ring-admin-accent"
          />
          Active
        </label>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        className="relative aspect-square w-full bg-gray-100 border-2 border-dashed border-admin-border rounded-md cursor-pointer hover:border-admin-accent transition-colors overflow-hidden flex items-center justify-center"
      >
        {previewSrc ? (
          <img src={previewSrc} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-admin-muted text-[11px] flex flex-col items-center gap-1">
            <FiImage size={20} />
            Click to upload
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handlePickImage} className="hidden" />
      {tile.imageFile && (
        <button
          type="button"
          onClick={handleUploadNow}
          className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-admin-success text-white rounded-md text-[11px] font-semibold hover:bg-green-600"
        >
          <FiUpload size={11} /> Upload now
        </button>
      )}

      <div>
        <label className="block text-[10px] font-medium text-admin-muted mb-1">Linked product</label>
        <BookPicker
          value={tile.bookId}
          book={tile.book}
          onSelect={(b) => onChange({ bookId: b.id, book: b, externalLink: '' })}
          onClear={() => onChange({ bookId: null, book: null })}
        />
      </div>

      <div>
        <label className="block text-[10px] font-medium text-admin-muted mb-1">External link (fallback)</label>
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
          <label className="block text-[10px] font-medium text-admin-muted mb-1">Title EN</label>
          <input
            type="text"
            value={tile.title || ''}
            onChange={(e) => onChange({ title: e.target.value })}
            className="w-full px-2 py-1.5 bg-white border border-admin-input-border rounded-md text-[11px] text-admin-text focus:outline-none focus:border-admin-accent"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-admin-muted mb-1">Title AR</label>
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
    }).catch(() => toast.error('Failed to load corners'));
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
        bookId: t.bookId || null,
        book: t.book || null,
        externalLink: t.externalLink || '',
        title: t.title || '',
        titleAr: t.titleAr || '',
        isActive: t.isActive !== false,
        isPlaceholder: !!t.isPlaceholder,
      }));
      // Ensure exactly 6 entries 1..6 in order
      const map = new Map(padded.map((p) => [p.position, p]));
      setTiles(POSITIONS.map((p) => map.get(p) || blankTile(p)));
    }).catch(() => toast.error('Failed to load tiles')).finally(() => setLoading(false));
  }, [selectedCornerId]);

  const updateTile = (position, patch) => {
    setTiles((prev) => prev.map((t) => t.position === position ? { ...t, ...patch } : t));
  };

  const onTileImageUploaded = (position, serverImagePath) => {
    setTiles((prev) => prev.map((t) => t.position === position
      ? { ...t, image: serverImagePath, imageFile: null, imagePreview: null }
      : t));
  };

  // Save: PUT all 6 tiles. Image must already be uploaded via "Upload now" — the
  // PUT only persists metadata + linkage. Tiles with no image AND no existing
  // server image are treated as empty slots (sent as inactive placeholders, or
  // simply omitted so the server deletes them).
  const handleSave = async () => {
    if (!selectedCornerId) return;
    setSaving(true);
    try {
      // Auto-upload any pending image files first
      const pending = tiles.filter((t) => t.imageFile);
      for (const t of pending) {
        const fd = new FormData();
        fd.append('image', t.imageFile);
        try {
          const res = await api.post(`/admin/ad-grids/${selectedCornerId}/tile/${t.position}/image`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          onTileImageUploaded(t.position, res.data.image);
          // Update local copy so the PUT below has the right path
          t.image = res.data.image;
          t.imageFile = null;
        } catch {
          toast.warning(`Tile ${t.position}: image upload failed`);
        }
      }

      // Build the tiles payload — only those with an image survive
      const payload = tiles
        .filter((t) => t.image && t.image.length > 0)
        .map((t) => ({
          position: t.position,
          image: t.image,
          bookId: t.bookId || null,
          externalLink: t.externalLink || null,
          title: t.title || null,
          titleAr: t.titleAr || null,
          isActive: t.isActive,
        }));

      const res = await api.put(`/admin/ad-grids/${selectedCornerId}`, { tiles: payload });
      // Refresh from response so deletes/positions sync
      const fresh = res.data?.tiles || [];
      const map = new Map(fresh.map((p) => [p.position, p]));
      setTiles(POSITIONS.map((p) => {
        const t = map.get(p);
        if (!t) return blankTile(p);
        return {
          position: t.position,
          image: t.image || '',
          imageFile: null,
          imagePreview: null,
          bookId: t.bookId || null,
          book: t.book || null,
          externalLink: t.externalLink || '',
          title: t.title || '',
          titleAr: t.titleAr || '',
          isActive: t.isActive !== false,
          isPlaceholder: false,
        };
      }));
      toast.success('Ad grid saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTile = async (position) => {
    if (!selectedCornerId) return;
    if (!confirm(`Delete tile ${position}?`)) return;
    try {
      await api.delete(`/admin/ad-grids/${selectedCornerId}/tile/${position}`);
      setTiles((prev) => prev.map((t) => t.position === position ? blankTile(position) : t));
      toast.success(`Tile ${position} deleted`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const cornerName = (c) => language === 'ar' && c.nameAr ? c.nameAr : c.name;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl 3xl:text-3xl font-bold text-admin-text">Ad Grids</h2>
        <p className="text-sm text-admin-muted mt-1">
          Up to 6 promotional tiles per corner. Each tile shows above that corner's section blocks on the home page.
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Corner picker */}
        <div className="lg:col-span-1">
          <div className="bg-admin-card rounded-xl border border-admin-border p-4 shadow-sm">
            <h3 className="text-sm font-bold text-admin-text uppercase tracking-wider mb-3">Corner</h3>
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

        {/* Tile editor */}
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
                    <div key={tile.position} className="relative">
                      <TileCard
                        tile={tile}
                        position={tile.position}
                        cornerId={selectedCornerId}
                        onChange={(patch) => updateTile(tile.position, patch)}
                        onUploaded={(path) => onTileImageUploaded(tile.position, path)}
                      />
                      {!tile.isPlaceholder && tile.image && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTile(tile.position)}
                          className="absolute top-2 end-2 p-1.5 bg-white border border-red-200 text-red-500 rounded-md hover:bg-red-50 shadow-sm"
                          title="Delete tile"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-admin-accent text-white font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
                  >
                    {saving ? 'Saving...' : 'Save grid'}
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
