import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiImage, FiCheckCircle, FiTrash2, FiEdit2, FiPlus, FiX, FiArrowUp, FiArrowDown, FiRefreshCw, FiUpload } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');

const emptyForm = { title: '', titleAr: '', link: '', sortOrder: 0, isActive: true, showLogo: true, logoPosition: 'center-left' };

const LOGO_POSITIONS = [
  { value: 'top-left', label: 'TL' },
  { value: 'top-center', label: 'TC' },
  { value: 'top-right', label: 'TR' },
  { value: 'center-left', label: 'CL' },
  { value: 'center', label: 'C' },
  { value: 'center-right', label: 'CR' },
  { value: 'bottom-left', label: 'BL' },
  { value: 'bottom-center', label: 'BC' },
  { value: 'bottom-right', label: 'BR' },
];

export default function Banners() {
  const { t } = useLanguageStore();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [desktopFile, setDesktopFile] = useState(null);
  const [mobileFile, setMobileFile] = useState(null);
  const [desktopPreview, setDesktopPreview] = useState(null);
  const [mobilePreview, setMobilePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const desktopRef = useRef(null);
  const mobileRef = useRef(null);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/banners');
      setBanners(res.data);
    } catch {
      toast.error('Failed to fetch banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBanners(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview(null);
    setMobilePreview(null);
    setFormOpen(true);
  };

  const openEdit = (banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title || '',
      titleAr: banner.titleAr || '',
      link: banner.link || '',
      sortOrder: banner.sortOrder || 0,
      isActive: banner.isActive,
      showLogo: banner.showLogo !== false,
      logoPosition: banner.logoPosition || 'center-left',
    });
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview(banner.desktopImage ? `${API_BASE}/${banner.desktopImage}` : null);
    setMobilePreview(banner.mobileImage ? `${API_BASE}/${banner.mobileImage}` : null);
    setFormOpen(true);
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'desktop') {
      setDesktopFile(file);
      setDesktopPreview(url);
    } else {
      setMobileFile(file);
      setMobilePreview(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingId && !desktopFile) {
      toast.error('Desktop image is required');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('titleAr', form.titleAr);
      fd.append('link', form.link);
      fd.append('sortOrder', form.sortOrder);
      fd.append('isActive', form.isActive);
      fd.append('showLogo', form.showLogo);
      fd.append('logoPosition', form.logoPosition);
      if (desktopFile) fd.append('desktopImage', desktopFile);
      if (mobileFile) fd.append('mobileImage', mobileFile);

      if (editingId) {
        await api.put(`/admin/banners/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Banner updated');
      } else {
        await api.post('/admin/banners', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Banner created');
      }
      setFormOpen(false);
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/banners/${deleteId}`);
      toast.success('Banner deleted');
      setDeleteId(null);
      fetchBanners();
    } catch {
      toast.error('Failed to delete banner');
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await api.put(`/admin/banners/${banner.id}/toggle`);
      toast.success(banner.isActive ? 'Banner deactivated' : 'Banner activated');
      fetchBanners();
    } catch {
      toast.error('Failed to toggle status');
    }
  };

  const handleReorder = async (banner, direction) => {
    const sorted = [...banners].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((b) => b.id === banner.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    try {
      await api.put('/admin/banners/reorder', { orderedIds: sorted.map((b) => b.id) });
      fetchBanners();
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const totalBanners = banners.length;
  const activeBanners = banners.filter((b) => b.isActive).length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 3xl:gap-6 mb-6 3xl:mb-8">
        {[
          { icon: FiImage, label: 'Total Banners', value: totalBanners, bg: 'bg-blue-600' },
          { icon: FiCheckCircle, label: 'Active Banners', value: activeBanners, bg: 'bg-emerald-600' },
        ].map((card, i) => (
          <div key={i} className="bg-admin-card rounded-xl border border-admin-border p-5 3xl:p-7 h-[140px] 3xl:h-[170px] flex flex-col items-center justify-center text-center shadow-sm hover:shadow-lg transition-shadow">
            <div className={`w-11 h-11 3xl:w-14 3xl:h-14 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl 3xl:text-3xl font-extrabold text-admin-text tracking-tight leading-none">{card.value}</p>
            <p className="text-xs 3xl:text-sm font-medium text-admin-muted mt-1.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 bg-admin-card border border-admin-border rounded-lg px-3 py-2">
        <div className="flex-1" />
        <button onClick={fetchBanners} className="flex items-center gap-1.5 px-3 py-2 3xl:px-4 3xl:py-2.5 text-admin-muted hover:text-admin-accent hover:bg-gray-100 rounded-lg transition-colors text-sm 3xl:text-base font-medium">
          <FiRefreshCw size={14} /> Refresh
        </button>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 3xl:px-5 3xl:py-2.5 bg-admin-accent text-white rounded-lg text-sm 3xl:text-base font-medium hover:bg-blue-600 transition-colors whitespace-nowrap">
          <FiPlus size={16} /> Add Banner
        </button>
      </div>

      {/* Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm 3xl:text-base">
            <thead className="bg-gray-50 border-b border-admin-border">
              <tr>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">Preview</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">Title (EN)</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">Title (AR)</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">Link</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">Logo</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">Order</th>
                <th className="text-left px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.status')}</th>
                <th className="text-right px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : banners.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-admin-muted">No banners yet. Click "Add Banner" to create one.</td></tr>
              ) : (
                banners.map((banner) => (
                  <tr key={banner.id} className="border-b border-admin-border hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <div className="w-24 h-14 3xl:w-32 3xl:h-18 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {banner.desktopImage ? (
                          <img src={`${API_BASE}/${banner.desktopImage}`} alt={banner.title || 'Banner'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400"><FiImage size={20} /></div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-text">{banner.title || '-'}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted" dir="rtl">{banner.titleAr || '-'}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs max-w-[200px] truncate">{banner.link || '-'}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      {banner.showLogo !== false ? (
                        <span className="text-xs font-medium text-green-700">{(banner.logoPosition || 'center-left').toUpperCase().replace('-', ' ')}</span>
                      ) : (
                        <span className="text-xs text-gray-400">Off</span>
                      )}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted">{banner.sortOrder}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <button
                        onClick={() => handleToggleActive(banner)}
                        className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${banner.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {banner.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleReorder(banner, 'up')} className="p-1.5 text-admin-muted hover:text-admin-accent transition-colors" title="Move up">
                          <FiArrowUp size={15} />
                        </button>
                        <button onClick={() => handleReorder(banner, 'down')} className="p-1.5 text-admin-muted hover:text-admin-accent transition-colors" title="Move down">
                          <FiArrowDown size={15} />
                        </button>
                        <button onClick={() => openEdit(banner)} className="p-1.5 text-admin-muted hover:text-admin-accent transition-colors" title={t('common.edit')}>
                          <FiEdit2 size={15} />
                        </button>
                        <button onClick={() => setDeleteId(banner.id)} className="p-1.5 text-admin-muted hover:text-red-500 transition-colors" title={t('common.delete')}>
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setFormOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl 3xl:max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg 3xl:text-xl font-bold text-admin-text">{editingId ? 'Edit Banner' : 'Add Banner'}</h2>
              <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title EN / AR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">Title (EN)</label>
                  <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-4 py-2.5 3xl:py-3 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" placeholder="Optional title" />
                </div>
                <div>
                  <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">Title (AR)</label>
                  <input type="text" dir="rtl" value={form.titleAr} onChange={(e) => setForm((f) => ({ ...f, titleAr: e.target.value }))} className="w-full px-4 py-2.5 3xl:py-3 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" placeholder="عنوان اختياري" />
                </div>
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">Link URL</label>
                <input type="text" value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} className="w-full px-4 py-2.5 3xl:py-3 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" placeholder="https://... (optional)" />
              </div>

              {/* Desktop Image */}
              <div>
                <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">
                  Desktop Image {!editingId && <span className="text-red-500">*</span>}
                </label>
                <p className="text-xs text-admin-muted mb-2">Recommended: 1920 x 500px</p>
                <input ref={desktopRef} type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'desktop')} className="hidden" />
                {desktopPreview ? (
                  <div className="relative group">
                    <img src={desktopPreview} alt="Desktop preview" className="w-full h-32 3xl:h-40 object-cover rounded-lg border border-admin-border" />
                    <button type="button" onClick={() => desktopRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-sm font-medium">
                      Change Image
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => desktopRef.current?.click()} className="w-full h-32 3xl:h-40 border-2 border-dashed border-admin-border rounded-lg flex flex-col items-center justify-center text-admin-muted hover:border-admin-accent hover:text-admin-accent transition-colors">
                    <FiUpload size={24} className="mb-2" />
                    <span className="text-sm">Click to upload desktop image</span>
                  </button>
                )}
              </div>

              {/* Mobile Image */}
              <div>
                <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">Mobile Image</label>
                <p className="text-xs text-admin-muted mb-2">Recommended: 750 x 500px (optional, falls back to desktop)</p>
                <input ref={mobileRef} type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'mobile')} className="hidden" />
                {mobilePreview ? (
                  <div className="relative group">
                    <img src={mobilePreview} alt="Mobile preview" className="w-48 h-32 3xl:h-40 object-cover rounded-lg border border-admin-border" />
                    <div className="absolute inset-0 w-48">
                      <button type="button" onClick={() => mobileRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-sm font-medium">
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => mobileRef.current?.click()} className="w-48 h-32 3xl:h-40 border-2 border-dashed border-admin-border rounded-lg flex flex-col items-center justify-center text-admin-muted hover:border-admin-accent hover:text-admin-accent transition-colors">
                    <FiUpload size={20} className="mb-2" />
                    <span className="text-xs">Upload mobile image</span>
                  </button>
                )}
              </div>

              {/* Animated Logo */}
              <div className="bg-admin-bg border border-admin-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm 3xl:text-base font-medium text-admin-text">Animated Logo</p>
                    <p className="text-xs text-admin-muted mt-0.5">Show the rotating Arkaan logo on this banner</p>
                  </div>
                  <div
                    onClick={() => setForm((f) => ({ ...f, showLogo: !f.showLogo }))}
                    className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${form.showLogo ? 'bg-admin-accent' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.showLogo ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                  </div>
                </div>
                {form.showLogo && (
                  <div>
                    <p className="text-xs font-medium text-admin-text mb-2">Logo Position</p>
                    <div className="inline-grid grid-cols-3 gap-1.5">
                      {LOGO_POSITIONS.map((pos) => (
                        <button
                          key={pos.value}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, logoPosition: pos.value }))}
                          className={`w-12 h-9 3xl:w-14 3xl:h-10 rounded-lg text-xs font-bold transition-all ${
                            form.logoPosition === pos.value
                              ? 'bg-admin-accent text-white shadow-md'
                              : 'bg-white border border-admin-border text-admin-muted hover:text-admin-text hover:border-admin-accent'
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sort Order + Active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">Sort Order</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-2.5 3xl:py-3 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                      className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${form.isActive ? 'bg-admin-accent' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm 3xl:text-base font-medium text-admin-text">{form.isActive ? 'Active' : 'Inactive'}</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setFormOpen(false)} className="px-5 py-2.5 3xl:px-6 3xl:py-3 text-sm 3xl:text-base font-medium text-admin-muted hover:text-admin-text border border-admin-border rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 3xl:px-6 3xl:py-3 bg-admin-accent text-white rounded-lg text-sm 3xl:text-base font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : editingId ? 'Update Banner' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Delete Banner"
        message="This will permanently delete this banner. This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
}
