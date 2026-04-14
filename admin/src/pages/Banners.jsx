import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiImage, FiCheckCircle, FiTrash2, FiEdit2, FiPlus, FiX, FiArrowUp, FiArrowDown, FiRefreshCw, FiUpload, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');

const emptyForm = { title: '', titleAr: '', link: '', sortOrder: 0, isActive: true, showLogo: true, showMobileLogo: true, logoPosition: 'center-left', categoryId: '' };

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
  const { t, language } = useLanguageStore();
  const [banners, setBanners] = useState([]);
  const [placeholderUploading, setPlaceholderUploading] = useState(null);
  const placeholderRefs = useRef({});
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
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [filterDropOpen, setFilterDropOpen] = useState(false);
  const [formCatDropOpen, setFormCatDropOpen] = useState(false);
  const filterDropRef = useRef(null);
  const formCatDropRef = useRef(null);
  const desktopRef = useRef(null);
  const mobileRef = useRef(null);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/banners');
      setBanners(res.data);
    } catch {
      toast.error(t('banners.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
    api.get('/admin/categories').then((res) => {
      const all = res.data.data || res.data;
      setCategories(all.filter((c) => !c.parentId));
    }).catch(() => {});
  }, []);

  // Close custom dropdowns on click outside
  useEffect(() => {
    const handler = (e) => {
      if (filterDropRef.current && !filterDropRef.current.contains(e.target)) setFilterDropOpen(false);
      if (formCatDropRef.current && !formCatDropRef.current.contains(e.target)) setFormCatDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
      showMobileLogo: banner.showMobileLogo !== false,
      logoPosition: banner.logoPosition || 'center-left',
      categoryId: banner.categoryId || '',
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
      toast.error(t('banners.desktopRequired'));
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
      fd.append('showMobileLogo', form.showMobileLogo);
      fd.append('logoPosition', form.logoPosition);
      fd.append('categoryId', form.categoryId || '');
      if (desktopFile) fd.append('desktopImage', desktopFile);
      if (mobileFile) fd.append('mobileImage', mobileFile);

      if (editingId) {
        await api.put(`/admin/banners/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success(t('banners.bannerUpdated'));
      } else {
        await api.post('/admin/banners', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success(t('banners.bannerCreated'));
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
      toast.success(t('banners.bannerDeleted'));
      setDeleteId(null);
      fetchBanners();
    } catch {
      toast.error(t('banners.deleteFailed'));
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await api.put(`/admin/banners/${banner.id}/toggle`);
      toast.success(banner.isActive ? t('banners.deactivated') : t('banners.activated'));
      fetchBanners();
    } catch {
      toast.error(t('banners.toggleFailed'));
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
      toast.error(t('banners.reorderFailed'));
    }
  };

  const filteredBanners = banners.filter((b) => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'home') return !b.categoryId;
    return b.categoryId === categoryFilter;
  });

  const totalBanners = banners.length;
  const activeBanners = banners.filter((b) => b.isActive).length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 3xl:gap-6 mb-6 3xl:mb-8">
        {[
          { icon: FiImage, label: t('banners.allBanners'), value: totalBanners, bg: 'bg-blue-600' },
          { icon: FiCheckCircle, label: t('banners.activeBanners'), value: activeBanners, bg: 'bg-emerald-600' },
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
        <div className="relative" ref={filterDropRef}>
          <button
            type="button"
            onClick={() => setFilterDropOpen(!filterDropOpen)}
            className="flex items-center gap-2 px-3 py-2 3xl:px-4 3xl:py-2.5 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent min-w-[160px]"
          >
            <span className="flex-1 text-start">
              {categoryFilter === 'all' ? t('banners.allBanners') : categoryFilter === 'home' ? t('banners.homePage') : categories.find((c) => c.id === categoryFilter)?.name || 'Select'}
            </span>
            <FiChevronDown size={14} className={`transition-transform ${filterDropOpen ? 'rotate-180' : ''}`} />
          </button>
          {filterDropOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-admin-border rounded-lg shadow-lg z-50 min-w-[160px] py-1 max-h-60 overflow-y-auto">
              {[{ value: 'all', label: t('banners.allBanners') }, { value: 'home', label: t('banners.homePage') }, ...categories.map((c) => ({ value: c.id, label: c.name }))].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setCategoryFilter(opt.value); setFilterDropOpen(false); }}
                  className={`w-full text-start px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${categoryFilter === opt.value ? 'text-admin-accent font-medium' : 'text-admin-text'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1" />
        <button onClick={fetchBanners} className="flex items-center gap-1.5 px-3 py-2 3xl:px-4 3xl:py-2.5 text-admin-muted hover:text-admin-accent hover:bg-gray-100 rounded-lg transition-colors text-sm 3xl:text-base font-medium">
          <FiRefreshCw size={14} /> {t('common.refresh')}
        </button>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 3xl:px-5 3xl:py-2.5 bg-admin-accent text-white rounded-lg text-sm 3xl:text-base font-medium hover:bg-blue-600 transition-colors whitespace-nowrap">
          <FiPlus size={16} /> {t('banners.addBanner')}
        </button>
      </div>

      {/* Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm 3xl:text-base">
            <thead className="bg-gray-50 border-b border-admin-border">
              <tr>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('banners.preview')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('banners.titleEn')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('banners.titleAr')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('books.category')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('banners.link')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('banners.logo')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('banners.order')}</th>
                <th className="text-start px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.status')}</th>
                <th className="text-end px-4 py-3 3xl:px-5 3xl:py-4 font-medium text-admin-muted">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}><td colSpan={9} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : filteredBanners.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-admin-muted">{banners.length === 0 ? t('banners.noBanners') : t('banners.noMatch')}</td></tr>
              ) : (
                filteredBanners.map((banner) => (
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
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${banner.categoryId ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {banner.category?.name || t('banners.homePage')}
                      </span>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted text-xs max-w-[200px] truncate">{banner.link || '-'}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      {banner.showLogo !== false ? (
                        <span className="text-xs font-medium text-green-700">{(banner.logoPosition || 'center-left').toUpperCase().replace('-', ' ')}</span>
                      ) : (
                        <span className="text-xs text-gray-400">{t('banners.logoOff')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-admin-muted">{banner.sortOrder}</td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4">
                      <button
                        onClick={() => handleToggleActive(banner)}
                        className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${banner.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        {banner.isActive ? t('common.active') : t('common.inactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3 3xl:px-5 3xl:py-4 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleReorder(banner, 'up')} className="p-1.5 text-admin-muted hover:text-admin-accent transition-colors" title={t('categories.moveUp')}>
                          <FiArrowUp size={15} />
                        </button>
                        <button onClick={() => handleReorder(banner, 'down')} className="p-1.5 text-admin-muted hover:text-admin-accent transition-colors" title={t('categories.moveDown')}>
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
              <h2 className="text-lg 3xl:text-xl font-bold text-admin-text">{editingId ? t('banners.editBanner') : t('banners.addBanner')}</h2>
              <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title EN / AR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('banners.titleEn')}</label>
                  <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-4 py-2.5 3xl:py-3 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" placeholder={t('banners.optionalTitle')} />
                </div>
                <div>
                  <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('banners.titleAr')}</label>
                  <input type="text" dir="rtl" value={form.titleAr} onChange={(e) => setForm((f) => ({ ...f, titleAr: e.target.value }))} className="w-full px-4 py-2.5 3xl:py-3 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" placeholder={t('banners.optionalTitleAr')} />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('books.category')}</label>
                <div className="relative" ref={formCatDropRef}>
                  <button
                    type="button"
                    onClick={() => setFormCatDropOpen(!formCatDropOpen)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 3xl:py-3 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent"
                  >
                    <span className="flex-1 text-start">
                      {form.categoryId ? categories.find((c) => c.id === form.categoryId)?.name || 'Select' : t('banners.homePage')}
                    </span>
                    <FiChevronDown size={14} className={`transition-transform ${formCatDropOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {formCatDropOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-admin-border rounded-lg shadow-lg z-50 w-full py-1 max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => { setForm((f) => ({ ...f, categoryId: '' })); setFormCatDropOpen(false); }}
                        className={`w-full text-start px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${!form.categoryId ? 'text-admin-accent font-medium' : 'text-admin-text'}`}
                      >
                        {t('banners.homePage')}
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => { setForm((f) => ({ ...f, categoryId: cat.id })); setFormCatDropOpen(false); }}
                          className={`w-full text-start px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${form.categoryId === cat.id ? 'text-admin-accent font-medium' : 'text-admin-text'}`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-admin-muted mt-1">{t('banners.homePageHelper')}</p>
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('banners.linkUrl')}</label>
                <input type="text" value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} className="w-full px-4 py-2.5 3xl:py-3 bg-admin-bg border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent" placeholder={t('banners.optionalLink')} />
              </div>

              {/* Desktop Image */}
              <div>
                <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">
                  {t('banners.desktopImage')} {!editingId && <span className="text-red-500">*</span>}
                </label>
                <p className="text-xs text-admin-muted mb-2">{t('banners.desktopRecommended')}</p>
                <input ref={desktopRef} type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'desktop')} className="hidden" />
                {desktopPreview ? (
                  <div className="relative group">
                    <img src={desktopPreview} alt="Desktop preview" className="w-full h-32 3xl:h-40 object-cover rounded-lg border border-admin-border" />
                    <button type="button" onClick={() => desktopRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-sm font-medium">
                      {t('banners.changeImage')}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => desktopRef.current?.click()} className="w-full h-32 3xl:h-40 border-2 border-dashed border-admin-border rounded-lg flex flex-col items-center justify-center text-admin-muted hover:border-admin-accent hover:text-admin-accent transition-colors">
                    <FiUpload size={24} className="mb-2" />
                    <span className="text-sm">{t('banners.clickToUploadDesktop')}</span>
                  </button>
                )}
              </div>

              {/* Mobile Image */}
              <div>
                <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('banners.mobileImage')}</label>
                <p className="text-xs text-admin-muted mb-2">{t('banners.mobileRecommended')}</p>
                <input ref={mobileRef} type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'mobile')} className="hidden" />
                {mobilePreview ? (
                  <div className="relative group">
                    <img src={mobilePreview} alt="Mobile preview" className="w-48 h-32 3xl:h-40 object-cover rounded-lg border border-admin-border" />
                    <div className="absolute inset-0 w-48">
                      <button type="button" onClick={() => mobileRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-sm font-medium">
                        {t('banners.change')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => mobileRef.current?.click()} className="w-48 h-32 3xl:h-40 border-2 border-dashed border-admin-border rounded-lg flex flex-col items-center justify-center text-admin-muted hover:border-admin-accent hover:text-admin-accent transition-colors">
                    <FiUpload size={20} className="mb-2" />
                    <span className="text-xs">{t('banners.clickToUploadMobile')}</span>
                  </button>
                )}
              </div>

              {/* Animated Logo */}
              <div className="bg-admin-bg border border-admin-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm 3xl:text-base font-medium text-admin-text">{t('banners.animatedLogo')}</p>
                    <p className="text-xs text-admin-muted mt-0.5">{t('banners.showLogo')}</p>
                  </div>
                  <div
                    onClick={() => setForm((f) => ({ ...f, showLogo: !f.showLogo }))}
                    className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${form.showLogo ? 'bg-admin-accent' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.showLogo ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                  </div>
                </div>
                {form.showLogo && (
                  <>
                    {/* Mobile Logo Toggle */}
                    <div className="flex items-center justify-between mb-3 pt-2 border-t border-admin-border">
                      <div>
                        <p className="text-sm font-medium text-admin-text">{t('banners.mobileLogo')}</p>
                        <p className="text-xs text-admin-muted mt-0.5">{t('banners.showMobileLogo')}</p>
                      </div>
                      <div
                        onClick={() => setForm((f) => ({ ...f, showMobileLogo: !f.showMobileLogo }))}
                        className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${form.showMobileLogo ? 'bg-admin-accent' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.showMobileLogo ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                      </div>
                    </div>
                    {/* Logo Position */}
                    <div>
                      <p className="text-xs font-medium text-admin-text mb-2">{t('banners.logoPosition')}</p>
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
                  </>
                )}
              </div>

              {/* Sort Order + Active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm 3xl:text-base font-medium text-admin-text mb-1.5">{t('banners.order')}</label>
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
                    <span className="text-sm 3xl:text-base font-medium text-admin-text">{form.isActive ? t('common.active') : t('common.inactive')}</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setFormOpen(false)} className="px-5 py-2.5 3xl:px-6 3xl:py-3 text-sm 3xl:text-base font-medium text-admin-muted hover:text-admin-text border border-admin-border rounded-lg transition-colors">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 3xl:px-6 3xl:py-3 bg-admin-accent text-white rounded-lg text-sm 3xl:text-base font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
                  {saving ? t('common.saving') : editingId ? t('banners.updateBanner') : t('banners.createBanner')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Placeholder Images */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm mt-6 3xl:mt-8">
        <h2 className="text-lg 3xl:text-xl font-bold text-admin-text mb-1">{language === 'ar' ? 'صور المنتجات الافتراضية' : 'Category Placeholder Images'}</h2>
        <p className="text-xs 3xl:text-sm text-admin-muted mb-5">{language === 'ar' ? 'صورة تظهر للمنتجات التي لا تحتوي على صورة غلاف في كل قسم' : 'Fallback image shown for products without a cover image in each category'}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 3xl:gap-5">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-admin-bg border border-admin-border rounded-xl overflow-hidden">
              <div className="relative aspect-[4/5] bg-gray-100 flex items-center justify-center group">
                {cat.placeholderImage ? (
                  <>
                    <img src={`${API_BASE}/${cat.placeholderImage}`} alt={cat.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={() => placeholderRefs.current[cat.id]?.click()} className="p-2 bg-white rounded-lg text-admin-text hover:bg-gray-100 transition-colors">
                        <FiEdit2 size={16} />
                      </button>
                      <button onClick={async () => { try { await api.delete(`/admin/categories/${cat.id}/placeholder`); setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, placeholderImage: null } : c)); toast.success(language === 'ar' ? 'تم الحذف' : 'Removed'); } catch { toast.error(t('common.saveFailed')); } }} className="p-2 bg-white rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => placeholderRefs.current[cat.id]?.click()} disabled={placeholderUploading === cat.id} className="flex flex-col items-center justify-center gap-2 text-admin-muted hover:text-admin-accent transition-colors w-full h-full">
                    <FiUpload size={24} />
                    <span className="text-xs font-medium">{placeholderUploading === cat.id ? t('common.loading') : t('common.clickToUpload')}</span>
                  </button>
                )}
                <input
                  ref={(el) => { placeholderRefs.current[cat.id] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPlaceholderUploading(cat.id);
                    try {
                      const fd = new FormData();
                      fd.append('image', file);
                      const res = await api.put(`/admin/categories/${cat.id}/placeholder`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                      setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, placeholderImage: res.data.placeholderImage } : c));
                      toast.success(language === 'ar' ? 'تم الرفع' : 'Uploaded');
                    } catch { toast.error(t('common.saveFailed')); }
                    finally { setPlaceholderUploading(null); if (e.target) e.target.value = ''; }
                  }}
                />
              </div>
              <div className="px-3 py-2.5 text-center">
                <p className="text-sm 3xl:text-base font-medium text-admin-text">{language === 'ar' && cat.nameAr ? cat.nameAr : cat.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        open={!!deleteId}
        title={t('banners.deleteBanner')}
        message={t('banners.deleteBannerConfirm')}
        confirmText={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
}
