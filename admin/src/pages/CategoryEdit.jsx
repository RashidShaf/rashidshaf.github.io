import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiX, FiTrash2, FiPlus, FiEdit2, FiCheck } from 'react-icons/fi';
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
  const [filterFields, setFilterFields] = useState(FILTERABLE_KEYS);
  const [customFields, setCustomFields] = useState([]);
  const [newCustomField, setNewCustomField] = useState({ name: '', nameAr: '' });
  const [deleteFieldIdx, setDeleteFieldIdx] = useState(null);
  const [editFieldIdx, setEditFieldIdx] = useState(null);
  const [editFieldForm, setEditFieldForm] = useState({ name: '', nameAr: '' });

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
            if (cat.detailFields) {
              try {
                const parsed = JSON.parse(cat.detailFields);
                if (Array.isArray(parsed)) {
                  setDetailFields(parsed);
                  setFilterFields(parsed.filter((k) => FILTERABLE_KEYS.includes(k) || k.startsWith('cf_')));
                } else if (parsed.detail) {
                  setDetailFields(parsed.detail);
                  setFilterFields(parsed.filters || []);
                }
              } catch {}
            }
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
        fd.append('detailFields', JSON.stringify({ detail: detailFields, filters: filterFields }));
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
                            setFilterFields((prev) => prev.filter((f) => f !== field.key));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-admin-accent focus:ring-admin-accent"
                      />
                      <span className="text-sm 3xl:text-base text-admin-text group-hover:text-admin-accent transition-colors">{field.label}</span>
                      {FILTERABLE_KEYS.includes(field.key) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFilterFields((prev) => prev.includes(field.key) ? prev.filter((f) => f !== field.key) : [...prev, field.key]);
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${filterFields.includes(field.key) ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                        >
                          {t('categories.browseFilter')}
                        </button>
                      )}
                    </label>
                  ))}
                  {/* Custom fields shown alongside built-in fields */}
                  {customFields.map((cf) => {
                    const cfKey = `cf_${cf.key}`;
                    return (
                      <label key={cfKey} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={detailFields.includes(cfKey)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDetailFields([...detailFields, cfKey]);
                            } else {
                              setDetailFields(detailFields.filter((f) => f !== cfKey));
                              setFilterFields((prev) => prev.filter((f) => f !== cfKey));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-admin-accent focus:ring-admin-accent"
                        />
                        <span className="text-sm 3xl:text-base text-admin-text group-hover:text-admin-accent transition-colors">{isRTL && cf.nameAr ? cf.nameAr : cf.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFilterFields((prev) => prev.includes(cfKey) ? prev.filter((f) => f !== cfKey) : [...prev, cfKey]);
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${filterFields.includes(cfKey) ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                        >
                          {t('categories.browseFilter')}
                        </button>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Fields — only for top-level */}
            {isTopLevel && (
              <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm 3xl:text-base font-bold text-admin-text uppercase tracking-wider">{t('categories.customFieldsTitle')}</h3>
                  <p className="text-xs text-admin-muted mt-1">{t('categories.customFieldsHelp')}</p>
                </div>

                <div className="border border-admin-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50/80 border-b border-admin-border">
                      <tr>
                        <th className="text-start ps-4 pe-2 py-3 text-[10px] 3xl:text-xs font-semibold text-admin-muted uppercase tracking-wider w-10">#</th>
                        <th className="text-start px-3 py-3 text-[10px] 3xl:text-xs font-semibold text-admin-muted uppercase tracking-wider">{t('categories.fieldNameEn')}</th>
                        <th className="text-start px-3 py-3 text-[10px] 3xl:text-xs font-semibold text-admin-muted uppercase tracking-wider">{t('categories.fieldNameAr')}</th>
                        <th className="text-end pe-4 ps-2 py-3 text-[10px] 3xl:text-xs font-semibold text-admin-muted uppercase tracking-wider w-24">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customFields.map((cf, i) => {
                        return (
                          <tr key={cf.key} className={`border-b border-admin-border last:border-b-0 transition-colors ${editFieldIdx === i ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                            {editFieldIdx === i ? (
                              <>
                                <td className="ps-4 pe-2 py-2.5 text-xs text-admin-muted">{i + 1}</td>
                                <td className="px-3 py-2">
                                  <input type="text" value={editFieldForm.name} onChange={(e) => setEditFieldForm({ ...editFieldForm, name: e.target.value })} className="w-full px-2.5 py-1.5 bg-white border border-admin-accent/40 rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent" autoFocus />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" dir="rtl" value={editFieldForm.nameAr} onChange={(e) => setEditFieldForm({ ...editFieldForm, nameAr: e.target.value })} className="w-full px-2.5 py-1.5 bg-white border border-admin-accent/40 rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent" />
                                </td>
                                <td className="pe-4 ps-2 py-2 text-end">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button type="button" disabled={!editFieldForm.name.trim() || !editFieldForm.nameAr.trim()} onClick={() => { setCustomFields(customFields.map((c, j) => j === i ? { ...c, name: editFieldForm.name.trim(), nameAr: editFieldForm.nameAr.trim() } : c)); setEditFieldIdx(null); }} className="p-1.5 rounded-md bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-30">
                                      <FiCheck size={14} />
                                    </button>
                                    <button type="button" onClick={() => setEditFieldIdx(null)} className="p-1.5 rounded-md bg-gray-50 text-admin-muted hover:bg-gray-100 transition-colors">
                                      <FiX size={14} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="ps-4 pe-2 py-3 text-xs text-admin-muted font-medium">{i + 1}</td>
                                <td className="px-3 py-3 font-medium text-admin-text">{cf.name}</td>
                                <td className="px-3 py-3 text-admin-muted" dir="rtl">{cf.nameAr || '—'}</td>
                                <td className="pe-4 ps-2 py-3 text-end">
                                  <div className="flex items-center justify-end gap-1">
                                    <button type="button" onClick={() => { setEditFieldIdx(i); setEditFieldForm({ name: cf.name, nameAr: cf.nameAr || '' }); }} className="p-1.5 rounded-md text-admin-muted hover:text-admin-accent hover:bg-gray-100 transition-colors" title={t('common.edit')}>
                                      <FiEdit2 size={14} />
                                    </button>
                                    <button type="button" onClick={() => setDeleteFieldIdx(i)} className="p-1.5 rounded-md text-admin-muted hover:text-red-500 hover:bg-red-50 transition-colors" title={t('common.delete')}>
                                      <FiTrash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                      {/* Add row */}
                      <tr className="bg-gray-50/40">
                        <td className="ps-4 pe-2 py-2.5 text-xs text-admin-muted">
                          <FiPlus size={12} className="text-admin-accent" />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={newCustomField.name}
                            onChange={(e) => setNewCustomField({ ...newCustomField, name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (!newCustomField.name.trim() || !newCustomField.nameAr.trim()) return;
                                const key = newCustomField.name.trim().toLowerCase().replace(/\s+/g, '_');
                                if (customFields.some((cf) => cf.key === key)) return;
                                setCustomFields([...customFields, { key, name: newCustomField.name.trim(), nameAr: newCustomField.nameAr.trim() }]);
                                setDetailFields((prev) => [...prev, `cf_${key}`]);
                                setFilterFields((prev) => [...prev, `cf_${key}`]);
                                setNewCustomField({ name: '', nameAr: '' });
                              }
                            }}
                            placeholder="e.g. Size"
                            className="w-full px-2.5 py-1.5 bg-white border border-dashed border-admin-input-border rounded-lg text-sm text-admin-text placeholder:text-admin-muted/50 focus:outline-none focus:border-admin-accent"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={newCustomField.nameAr}
                            onChange={(e) => setNewCustomField({ ...newCustomField, nameAr: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (!newCustomField.name.trim() || !newCustomField.nameAr.trim()) return;
                                const key = newCustomField.name.trim().toLowerCase().replace(/\s+/g, '_');
                                if (customFields.some((cf) => cf.key === key)) return;
                                setCustomFields([...customFields, { key, name: newCustomField.name.trim(), nameAr: newCustomField.nameAr.trim() }]);
                                setDetailFields((prev) => [...prev, `cf_${key}`]);
                                setFilterFields((prev) => [...prev, `cf_${key}`]);
                                setNewCustomField({ name: '', nameAr: '' });
                              }
                            }}
                            placeholder="مثال: الحجم"
                            dir="rtl"
                            className="w-full px-2.5 py-1.5 bg-white border border-dashed border-admin-input-border rounded-lg text-sm text-admin-text placeholder:text-admin-muted/50 focus:outline-none focus:border-admin-accent"
                          />
                        </td>
                        <td className="pe-4 ps-2 py-2 text-end">
                          <button
                            type="button"
                            disabled={!newCustomField.name.trim() || !newCustomField.nameAr.trim()}
                            onClick={() => {
                              if (!newCustomField.name.trim() || !newCustomField.nameAr.trim()) return;
                              const key = newCustomField.name.trim().toLowerCase().replace(/\s+/g, '_');
                              if (customFields.some((cf) => cf.key === key)) return;
                              setCustomFields([...customFields, { key, name: newCustomField.name.trim(), nameAr: newCustomField.nameAr.trim() }]);
                              setDetailFields((prev) => [...prev, `cf_${key}`]);
                              setFilterFields((prev) => [...prev, `cf_${key}`]);
                              setNewCustomField({ name: '', nameAr: '' });
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-admin-accent text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-40"
                          >
                            <FiPlus size={12} /> {t('common.add')}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {customFields.length === 0 && (
                  <p className="text-xs text-admin-muted text-center py-1">{t('common.noItems')}</p>
                )}
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
          const deletedKey = `cf_${customFields[deleteFieldIdx].key}`;
          setCustomFields(customFields.filter((_, j) => j !== deleteFieldIdx));
          setDetailFields((prev) => prev.filter((f) => f !== deletedKey));
          setFilterFields((prev) => prev.filter((f) => f !== deletedKey));
          setDeleteFieldIdx(null);
        }}
        onCancel={() => setDeleteFieldIdx(null)}
      />
    </div>
  );
}
