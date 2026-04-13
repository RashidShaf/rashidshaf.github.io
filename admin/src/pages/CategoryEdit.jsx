import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiX, FiTrash2, FiPlus } from 'react-icons/fi';
import { toast } from 'react-toastify';
import ConfirmModal from '../components/ConfirmModal';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');

export default function CategoryEdit() {
  const { id } = useParams();
  const t = useLanguageStore((s) => s.t);
  const isRTL = useLanguageStore((s) => s.isRTL);
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTopLevel, setIsTopLevel] = useState(false);
  const [backUrl, setBackUrl] = useState('/categories?tab=top');
  const FILTERABLE_KEYS = ['author', 'publisher', 'language', 'brand', 'color', 'material'];
  const ALL_DETAIL_FIELDS = [
    { key: 'author', label: t('books.author') },
    { key: 'publisher', label: t('books.publisher') },
    { key: 'pages', label: t('books.pages') },
    { key: 'isbn', label: t('books.isbn') },
    { key: 'language', label: t('books.language') },
    { key: 'publishedDate', label: t('books.publishedDate') },
    { key: 'brand', label: t('books.brand') },
    { key: 'color', label: t('books.color') },
    { key: 'material', label: t('books.material') },
    { key: 'dimensions', label: t('books.dimensions') },
    { key: 'ageRange', label: t('books.ageRange') },
  ];
  const [form, setForm] = useState({ name: '', nameAr: '', parentId: '' });
  const [detailFields, setDetailFields] = useState(ALL_DETAIL_FIELDS.map((f) => f.key));
  const [customFields, setCustomFields] = useState([]);
  const [newCustomField, setNewCustomField] = useState({ name: '', nameAr: '' });
  const [deleteFieldIdx, setDeleteFieldIdx] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await api.get('/admin/categories');
        const allCats = catRes.data.data || catRes.data;
        setCategories(allCats.filter((c) => c.id !== id));

        const cat = allCats.find((c) => c.id === id);
        if (cat) {
          setIsTopLevel(!cat.parentId);
          setForm({
            name: cat.name || '',
            nameAr: cat.nameAr || cat.name_ar || '',
            parentId: cat.parentId || '',
          });
          if (cat.image) setImagePreview(`${API_BASE}/${cat.image}`);
          if (!cat.parentId) {
            if (cat.detailFields) { try { setDetailFields(JSON.parse(cat.detailFields)); } catch {} }
            if (cat.customFields) { try { setCustomFields(JSON.parse(cat.customFields)); } catch {} }
          }
          // Compute back URL based on hierarchy
          const getAncestors = (c) => {
            const chain = [];
            let cur = c;
            while (cur.parentId) {
              cur = allCats.find((p) => p.id === cur.parentId);
              if (cur) chain.unshift(cur.id);
              else break;
            }
            return chain;
          };
          if (!cat.parentId) {
            setBackUrl('/categories?tab=top');
          } else {
            const ancestors = getAncestors(cat);
            if (ancestors.length >= 3) {
              setBackUrl(`/categories?tab=${ancestors[0]}&sub=${ancestors[1]}&sub2=${ancestors[2]}`);
            } else if (ancestors.length === 2) {
              setBackUrl(`/categories?tab=${ancestors[0]}&sub=${ancestors[1]}`);
            } else {
              setBackUrl(`/categories?tab=${cat.parentId}`);
            }
          }
        } else {
          toast.error(t('categories.notFound'));
          navigate('/categories');
        }
      } catch {
        toast.error(t('categories.failedLoad'));
        navigate('/categories');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error(t('categories.nameRequired')); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      if (form.nameAr) fd.append('nameAr', form.nameAr);
      if (!isTopLevel) fd.append('parentId', form.parentId || '');
      if (isTopLevel) {
        fd.append('detailFields', JSON.stringify(detailFields));
        fd.append('customFields', JSON.stringify(customFields));
      }
      if (imageFile) fd.append('image', imageFile);

      await api.put(`/admin/categories/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('categories.updated'));
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || t('categories.failedUpdate'));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 3xl:px-4 3xl:py-3 bg-white border border-admin-input-border rounded-lg text-sm 3xl:text-base text-admin-text focus:outline-none focus:border-admin-accent';
  const labelClass = 'block text-sm 3xl:text-base font-medium text-admin-text mb-1.5';

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-admin-accent/30 border-t-admin-accent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 3xl:mb-8">
        <Link to={backUrl} className="p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100 transition-colors">
          <FiArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
        </Link>
        <h2 className="text-2xl 3xl:text-3xl font-bold text-admin-text">
          {isTopLevel ? t('categories.editCorner') : t('categories.editSubCategory')}
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6 3xl:gap-8">
          <div className="lg:col-span-2 space-y-6 3xl:space-y-8">
            {/* Parent Category — at top (only for sub-categories) */}
            {!isTopLevel && (
              <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
                <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">{t('categories.parentCategory')}</h3>
                <div>
                  <label className={labelClass}>{t('categories.selectParent')}</label>
                  <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} required className={inputClass}>
                    {categories.filter((c) => !c.parentId).map((topCat) => {
                      const l2 = categories.filter((c) => c.parentId === topCat.id && c.id !== id);
                      return (
                        <optgroup key={topCat.id} label={topCat.name}>
                          <option value={topCat.id}>{topCat.name}</option>
                          {l2.map((child) => {
                            const l3 = categories.filter((c) => c.parentId === child.id && c.id !== id);
                            return [
                              <option key={child.id} value={child.id}>&nbsp;&nbsp;└ {child.name}</option>,
                              ...l3.map((gc) => (
                                <option key={gc.id} value={gc.id}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ {gc.name}</option>
                              )),
                            ];
                          })}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}

            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">{t('categories.categoryDetails')}</h3>
              <div className="grid sm:grid-cols-2 gap-4 3xl:gap-6">
                <div>
                  <label className={labelClass}>{t('categories.nameEn')}</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('categories.nameAr')}</label>
                  <input type="text" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} dir="rtl" className={inputClass} />
                </div>
              </div>
            </div>

            {/* Detail Fields — only for top-level categories */}
            {isTopLevel && (
              <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
                <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">{t('categories.detailFields')}</h3>
                <p className="text-xs text-admin-muted">{t('categories.detailFieldsHelp')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {ALL_DETAIL_FIELDS.map((field) => (
                    <label key={field.key} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={detailFields.includes(field.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDetailFields([...detailFields, field.key]);
                          } else {
                            setDetailFields(detailFields.filter((f) => f !== field.key));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-admin-accent focus:ring-admin-accent"
                      />
                      <span className="text-sm 3xl:text-base text-admin-text group-hover:text-admin-accent transition-colors">{field.label}</span>
                      {FILTERABLE_KEYS.includes(field.key) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-medium">{t('categories.browseFilter')}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Fields — only for top-level */}
            {isTopLevel && (
              <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">{t('categories.customFieldsTitle')}</h3>
                    <p className="text-xs text-admin-muted mt-1">{t('categories.customFieldsHelp')}</p>
                  </div>
                </div>

                {/* Existing custom fields table */}
                {customFields.length > 0 && (
                  <div className="border border-admin-border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_1fr_auto] bg-gray-50 border-b border-admin-border px-4 py-2">
                      <span className="text-xs font-medium text-admin-muted uppercase tracking-wider">{t('categories.fieldNameEn')}</span>
                      <span className="text-xs font-medium text-admin-muted uppercase tracking-wider">{t('categories.fieldNameAr')}</span>
                      <span className="text-xs font-medium text-admin-muted uppercase tracking-wider w-8"></span>
                    </div>
                    {customFields.map((cf, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center px-4 py-2.5 border-b border-admin-border last:border-b-0 hover:bg-gray-50/50">
                        <span className="text-sm text-admin-text font-medium">{cf.name}</span>
                        <span className="text-sm text-admin-muted" dir="rtl">{cf.nameAr || '—'}</span>
                        <button type="button" onClick={() => setDeleteFieldIdx(i)} className="p-1.5 text-admin-muted hover:text-red-500 transition-colors">
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new custom field */}
                <div className="flex items-end gap-2 pt-1">
                  <div className="flex-1">
                    <label className="block text-xs text-admin-muted mb-1">{t('categories.fieldNameEn')}</label>
                    <input
                      type="text"
                      value={newCustomField.name}
                      onChange={(e) => setNewCustomField({ ...newCustomField, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!newCustomField.name.trim()) return;
                          const key = newCustomField.name.trim().toLowerCase().replace(/\s+/g, '_');
                          if (customFields.some((cf) => cf.key === key)) return;
                          setCustomFields([...customFields, { key, name: newCustomField.name.trim(), nameAr: newCustomField.nameAr.trim() }]);
                          setNewCustomField({ name: '', nameAr: '' });
                        }
                      }}
                      placeholder="e.g. Size"
                      className="w-full px-3 py-2 bg-white border border-admin-input-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-admin-muted mb-1">{t('categories.fieldNameAr')}</label>
                    <input
                      type="text"
                      value={newCustomField.nameAr}
                      onChange={(e) => setNewCustomField({ ...newCustomField, nameAr: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!newCustomField.name.trim()) return;
                          const key = newCustomField.name.trim().toLowerCase().replace(/\s+/g, '_');
                          if (customFields.some((cf) => cf.key === key)) return;
                          setCustomFields([...customFields, { key, name: newCustomField.name.trim(), nameAr: newCustomField.nameAr.trim() }]);
                          setNewCustomField({ name: '', nameAr: '' });
                        }
                      }}
                      placeholder="مثال: الحجم"
                      dir="rtl"
                      className="w-full px-3 py-2 bg-white border border-admin-input-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCustomField.name.trim()) return;
                      const key = newCustomField.name.trim().toLowerCase().replace(/\s+/g, '_');
                      if (customFields.some((cf) => cf.key === key)) return;
                      setCustomFields([...customFields, { key, name: newCustomField.name.trim(), nameAr: newCustomField.nameAr.trim() }]);
                      setNewCustomField({ name: '', nameAr: '' });
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-admin-accent text-white text-sm rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
                  >
                    <FiPlus size={14} /> {t('common.add')}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 3xl:space-y-8">
            {/* Image */}
            <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
              <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider mb-4">{t('categories.image')}</h3>
              <div
                onClick={() => fileRef.current?.click()}
                className="relative w-full h-40 border-2 border-dashed border-admin-border rounded-xl cursor-pointer hover:border-admin-accent transition-colors flex items-center justify-center overflow-hidden"
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80">
                      <FiX size={14} />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <FiUpload className="w-6 h-6 text-admin-muted mx-auto mb-1" />
                    <p className="text-xs text-admin-muted">{t('common.clickToUpload')}</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </div>
          </div>
        </div>

        {/* Save / Cancel — bottom */}
        <div className="flex items-center gap-3 mt-6 3xl:mt-8 max-w-md">
          <button type="submit" disabled={saving} className="flex-1 py-3 3xl:py-3.5 bg-admin-accent text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm 3xl:text-base">
            {saving ? t('common.loading') : t('common.save')}
          </button>
          <Link to={backUrl} className="flex-1 py-3 3xl:py-3.5 text-center border border-admin-border text-admin-muted rounded-xl hover:bg-gray-50 transition-colors text-sm 3xl:text-base font-medium">
            {t('common.cancel')}
          </Link>
        </div>
      </form>

      <ConfirmModal
        open={deleteFieldIdx !== null}
        title={t('common.delete')}
        message={t('common.deleteConfirmText')}
        confirmText={t('common.delete')}
        onConfirm={() => {
          setCustomFields(customFields.filter((_, j) => j !== deleteFieldIdx));
          setDeleteFieldIdx(null);
        }}
        onCancel={() => setDeleteFieldIdx(null)}
      />
    </div>
  );
}
