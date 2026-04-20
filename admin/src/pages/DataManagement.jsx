import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiDownload, FiUpload, FiFileText, FiUsers, FiShoppingBag, FiPackage, FiLayers, FiCheck, FiAlertCircle, FiLock, FiX, FiEdit2, FiChevronUp, FiChevronDown, FiMenu, FiColumns } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

export default function DataManagement() {
  const { t, language } = useLanguageStore();
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState(null);
  const [password, setPassword] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [categories, setCategories] = useState([]);
  const [templateCategory, setTemplateCategory] = useState('');
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [templateInfoLoading, setTemplateInfoLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    api.get('/admin/categories').then((res) => {
      const all = res.data.data || res.data;
      setCategories(all.filter((c) => !c.parentId));
    }).catch(() => {});
  }, []);

  const exportData = async (type, format = 'csv') => {
    try {
      const res = await api.get(`/admin/data/export/${type}?format=${format}`, { responseType: 'blob' });
      const ext = format === 'excel' ? 'xlsx' : 'csv';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type} ${t('data.exported')}`);
    } catch {
      toast.error(`${t('data.failedExport')} ${type}`);
    }
  };

  const handlePreview = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error(t('data.uploadCsvOnly')); return; }

    setImporting(true);
    setPreview(null);
    setImportResult(null);
    setPassword('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/admin/data/import/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || t('data.failedParse'));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!password.trim()) { toast.error(t('data.passwordRequired')); return; }
    if (!preview?.valid?.length) return;

    setConfirming(true);
    try {
      const res = await api.post('/admin/data/import/confirm', {
        products: preview.valid,
        password,
      });
      setImportResult(res.data);
      setPreview(null);
      setPassword('');
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || t('data.importFailed'));
    } finally {
      setConfirming(false);
    }
  };

  const exportDuplicates = () => {
    if (!preview?.duplicates?.length) return;
    const hasBarcode = preview.duplicates.some((d) => d.barcode && String(d.barcode).trim() !== '');
    const headers = (hasBarcode ? 'barcode,' : '') + 'nameEn,nameAr,purchasePrice,sellingPrice,mainCategory,subCategory,subSubCategory\n';
    const rows = preview.duplicates.map((d) => {
      const rest = `"${d.nameEn}","${d.nameAr}",${d.purchasePrice || ''},${d.sellingPrice},${d.mainCategory},${d.subCategory},${d.subSubCategory || ''}`;
      return hasBarcode ? `${d.barcode || ''},${rest}` : rest;
    }).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'duplicate-products.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = async () => {
    try {
      const params = templateCategory ? `?category=${templateCategory}` : '';
      const res = await api.get(`/admin/data/import/template${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'product-import-template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t('data.failedTemplate'));
    }
  };

  const downloadFullTemplate = async () => {
    try {
      const res = await api.get('/admin/data/import/template-all', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Product-Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t('data.failedTemplate'));
    }
  };

  const applySavedOrder = (baseItems, savedOrder) => {
    const byId = Object.fromEntries(baseItems.map((it) => [it.id, it]));
    const ordered = [];
    const seen = new Set();
    for (const id of savedOrder) {
      if (seen.has(id)) continue;
      const it = byId[id];
      if (it) { ordered.push({ ...it, checked: true }); seen.add(id); }
    }
    for (const it of baseItems) {
      if (!seen.has(it.id)) ordered.push({ ...it, checked: it.locked });
    }
    return ordered;
  };

  const openEditTemplate = async () => {
    if (!templateCategory) { toast.error(t('data.pickCategory')); return; }
    setTemplateInfoLoading(true);
    setEditTemplateOpen(true);
    try {
      const res = await api.get(`/admin/data/import/template-info?category=${templateCategory}`);
      const { required, optional, savedOrder } = res.data;
      const baseItems = [
        ...required.map((name) => ({ id: name, locked: true, checked: true, labelEn: name, labelAr: name, columns: [name] })),
        ...optional.map((f) => ({ id: f.id, locked: false, checked: false, labelEn: f.labelEn, labelAr: f.labelAr, columns: f.columns })),
      ];
      const items = Array.isArray(savedOrder) && savedOrder.length ? applySavedOrder(baseItems, savedOrder) : baseItems;
      setOrderItems(items);
    } catch {
      toast.error(t('data.failedTemplate'));
      setEditTemplateOpen(false);
    } finally {
      setTemplateInfoLoading(false);
    }
  };

  const moveItem = (idx, dir) => setOrderItems((prev) => {
    const next = [...prev];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return prev;
    [next[idx], next[target]] = [next[target], next[idx]];
    return next;
  });

  const toggleItemChecked = (idx) => setOrderItems((prev) => prev.map((it, i) => i === idx ? { ...it, checked: !it.checked } : it));

  const saveTemplateConfig = async () => {
    setSavingTemplate(true);
    try {
      const order = orderItems.filter((it) => it.locked || it.checked).map((it) => it.id);
      await api.post('/admin/data/import/template-config', { categoryId: templateCategory, order });
      toast.success(t('data.templateSaved'));
      setEditTemplateOpen(false);
    } catch {
      toast.error(t('data.failedSave'));
    } finally {
      setSavingTemplate(false);
    }
  };

  const exportItems = [
    { type: 'products', label: t('data.products'), icon: FiFileText, color: 'bg-blue-600', hasExcel: true },
    { type: 'customers', label: t('data.customers'), icon: FiUsers, color: 'bg-emerald-600' },
    { type: 'orders', label: t('data.ordersExport'), icon: FiShoppingBag, color: 'bg-amber-500' },
    { type: 'inventory', label: t('data.inventoryExport'), icon: FiPackage, color: 'bg-purple-600' },
    { type: 'categories', label: t('data.categoriesExport'), icon: FiLayers, color: 'bg-rose-600' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

      {/* Export Section */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm mb-6 3xl:mb-8">
        <h2 className="text-lg 3xl:text-xl font-bold text-admin-text mb-1">{t('data.exportData')}</h2>
        <p className="text-xs 3xl:text-sm text-admin-muted mb-5">{t('data.exportDesc')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 3xl:gap-5">
          {exportItems.map((item) => (
            <div key={item.type} className="bg-admin-bg border border-admin-border rounded-xl p-4 3xl:p-5 flex items-center gap-4">
              <div className={`w-11 h-11 3xl:w-13 3xl:h-13 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm 3xl:text-base font-semibold text-admin-text">{item.label}</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => exportData(item.type)} className="px-3 py-1.5 3xl:px-4 3xl:py-2 bg-white border border-admin-border text-admin-text text-xs 3xl:text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  {t('data.csv')}
                </button>
                {item.hasExcel && (
                  <button onClick={() => exportData(item.type, 'excel')} className="px-3 py-1.5 3xl:px-4 3xl:py-2 bg-green-600 text-white text-xs 3xl:text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                    {t('data.excel')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
        <h2 className="text-lg 3xl:text-xl font-bold text-admin-text mb-1">{t('data.importProducts')}</h2>
        <p className="text-xs 3xl:text-sm text-admin-muted mb-5">{t('data.importDesc')}</p>

        <div className="flex flex-col sm:flex-row items-start gap-4 mb-5">
          <div className="flex items-center gap-2">
            <select
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value)}
              className="px-3 py-2.5 3xl:px-4 3xl:py-3 bg-admin-bg border border-admin-border text-admin-text text-sm 3xl:text-base rounded-xl focus:outline-none focus:border-admin-accent cursor-pointer"
            >
              <option value="">{t('common.all')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{language === 'ar' && cat.nameAr ? cat.nameAr : cat.name}</option>
              ))}
            </select>
            <button
              onClick={openEditTemplate}
              disabled={!templateCategory}
              title={!templateCategory ? t('data.pickCategory') : ''}
              className="flex items-center gap-2 px-4 py-2.5 3xl:px-5 3xl:py-3 bg-admin-bg border border-admin-border text-admin-text text-sm 3xl:text-base font-medium rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FiEdit2 size={16} /> {t('data.editTemplate')}
            </button>
            <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 3xl:px-5 3xl:py-3 bg-admin-bg border border-admin-border text-admin-text text-sm 3xl:text-base font-medium rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap">
              <FiDownload size={16} /> {t('data.downloadTemplate')}
            </button>
          </div>
          <div className="text-xs 3xl:text-sm text-admin-muted max-w-md">
            <p>{t('data.step1')}</p>
            <p>{t('data.step2')}</p>
            <p>{t('data.step3')}</p>
          </div>
        </div>

        {!preview && !importResult && (
          <div className="flex items-center gap-4">
            <input ref={fileRef} type="file" accept=".csv" onChange={handlePreview} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={importing} className="flex items-center gap-2 px-6 py-3 3xl:px-8 3xl:py-3.5 bg-admin-accent text-white text-sm 3xl:text-base font-medium rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50">
              <FiUpload size={16} /> {importing ? t('data.importing') : t('data.uploadCsv')}
            </button>
          </div>
        )}

        {/* Preview Results */}
        {preview && (() => {
          const hasBarcode = [...preview.valid, ...preview.duplicates].some((p) => p.barcode && String(p.barcode).trim() !== '');
          return (
          <div className="mt-5 space-y-4">
            {/* Valid Products */}
            {preview.valid.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FiCheck className="w-5 h-5 text-green-600" />
                  <h3 className="text-sm font-semibold text-green-800">{preview.valid.length} {t('data.productsReady')}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-green-700">
                        <th className="pb-2 pe-3">#</th>
                        {hasBarcode && <th className="pb-2 pe-3">{t('books.barcode')}</th>}
                        <th className="pb-2 pe-3">{t('books.titleEn')}</th>
                        <th className="pb-2 pe-3">{t('books.titleAr')}</th>
                        <th className="pb-2 pe-3">{t('books.price')}</th>
                        <th className="pb-2">{t('books.category')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.valid.slice(0, 20).map((p, i) => (
                        <tr key={i} className="border-t border-green-200">
                          <td className="py-1.5 pe-3 text-green-600">{p.row}</td>
                          {hasBarcode && <td className="py-1.5 pe-3 font-mono">{p.barcode}</td>}
                          <td className="py-1.5 pe-3">{p.nameEn}</td>
                          <td className="py-1.5 pe-3" dir="rtl">{p.nameAr}</td>
                          <td className="py-1.5 pe-3">{p.sellingPrice}</td>
                          <td className="py-1.5">{[p.mainCategory, p.subCategory, p.subSubCategory].filter(Boolean).join(' > ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.valid.length > 20 && (
                    <p className="text-xs text-green-600 mt-2">...{preview.valid.length - 20} {t('data.andMore')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Duplicate Products */}
            {preview.duplicates.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FiAlertCircle className="w-5 h-5 text-red-600" />
                    <h3 className="text-sm font-semibold text-red-800">{preview.duplicates.length} {t('data.duplicatesFound')}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasBarcode && (
                      <button
                        onClick={() => {
                          const generate13 = () => {
                            const digits = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('');
                            return digits;
                          };
                          const existingBarcodes = new Set([
                            ...preview.valid.map((v) => v.barcode).filter(Boolean),
                            ...preview.duplicates.map((d) => d.barcode).filter(Boolean),
                          ]);
                          const fixed = preview.duplicates.map((d) => {
                            let newBarcode;
                            do { newBarcode = generate13(); } while (existingBarcodes.has(newBarcode));
                            existingBarcodes.add(newBarcode);
                            return { ...d, barcode: newBarcode, duplicateReason: undefined, existingProduct: undefined };
                          });
                          setPreview((prev) => ({
                            ...prev,
                            valid: [...prev.valid, ...fixed],
                            duplicates: [],
                          }));
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        {t('data.generateBarcodes')}
                      </button>
                    )}
                    <button onClick={exportDuplicates} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors">
                      <FiDownload size={14} /> {t('data.exportDuplicates')}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-red-700">
                        {hasBarcode && <th className="pb-2 pe-3">{t('books.barcode')}</th>}
                        <th className="pb-2 pe-3">{t('books.titleEn')}</th>
                        <th className="pb-2 pe-3">{t('books.price')}</th>
                        <th className="pb-2">{t('data.reason')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.duplicates.map((d, i) => (
                        <tr key={i} className="border-t border-red-200">
                          {hasBarcode && <td className="py-1.5 pe-3 font-mono">{d.barcode}</td>}
                          <td className="py-1.5 pe-3">{d.nameEn}</td>
                          <td className="py-1.5 pe-3">{d.sellingPrice}</td>
                          <td className="py-1.5 text-red-600">
                            {d.duplicateReason === 'exists'
                              ? <span>{t('data.alreadyExists')} <strong>{d.existingProduct}</strong></span>
                              : <span>{t('data.duplicateInFile')}</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Errors */}
            {preview.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FiX className="w-5 h-5 text-red-600" />
                  <h3 className="text-sm font-semibold text-red-800">{preview.errors.length} {t('data.rowsWithErrors')}</h3>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {preview.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-red-600 bg-red-100 px-3 py-1.5 rounded-lg">
                      <span className="font-medium whitespace-nowrap">{t('data.row')} {err.row}:</span>
                      <span>{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm with Password */}
            {preview.valid.length > 0 && (
              <div className="bg-admin-bg border border-admin-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FiLock className="w-5 h-5 text-admin-muted" />
                  <h3 className="text-sm font-semibold text-admin-text">{t('data.confirmImport')}</h3>
                </div>
                <p className="text-xs text-admin-muted mb-3">{t('data.confirmImportDesc')} {preview.valid.length} {t('data.products').toLowerCase()}.</p>
                <div className="flex items-center gap-3">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('data.adminPassword')}
                    className="w-64 px-3 py-2.5 bg-white border border-admin-input-border rounded-lg text-sm text-admin-text focus:outline-none focus:border-admin-accent"
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  />
                  <button onClick={handleConfirm} disabled={confirming || !password.trim()} className="px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                    {confirming ? t('common.loading') : `${t('data.confirmBtn')} (${preview.valid.length})`}
                  </button>
                  <button onClick={() => { setPreview(null); setPassword(''); }} className="px-4 py-2.5 border border-admin-border text-admin-muted text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}

            {/* No valid products */}
            {preview.valid.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-admin-muted">{t('data.noValidProducts')}</p>
                <button onClick={() => setPreview(null)} className="mt-2 px-4 py-2 text-sm text-admin-accent hover:underline">
                  {t('data.tryAnotherFile')}
                </button>
              </div>
            )}
          </div>
          );
        })()}

        {/* Final Import Results */}
        {importResult && (
          <div className="mt-5 bg-admin-bg border border-admin-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${importResult.errors.length === 0 ? 'bg-green-100' : 'bg-amber-100'}`}>
                {importResult.errors.length === 0 ? <FiCheck className="w-4 h-4 text-green-600" /> : <FiAlertCircle className="w-4 h-4 text-amber-600" />}
              </div>
              <div>
                <p className="text-sm 3xl:text-base font-semibold text-admin-text">{importResult.message}</p>
                <p className="text-xs text-admin-muted">{importResult.created} / {importResult.total} {t('data.productsImported')}</p>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                    <span className="font-medium whitespace-nowrap">{t('data.row')} {err.row}:</span>
                    <span>{err.error}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setImportResult(null)} className="mt-3 text-sm text-admin-accent hover:underline">
              {t('data.importMore')}
            </button>
          </div>
        )}
      </div>

      {/* Edit Template Modal */}
      {editTemplateOpen && (() => {
        const selectedCategory = categories.find((c) => c.id === templateCategory);
        const categoryLabel = selectedCategory ? (language === 'ar' && selectedCategory.nameAr ? selectedCategory.nameAr : selectedCategory.name) : '';
        const activeItems = orderItems.filter((it) => it.locked || it.checked);
        const activeColumns = activeItems.flatMap((it) => it.columns);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditTemplateOpen(false)}>
            <div className="bg-admin-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-admin-border bg-gradient-to-b from-admin-card to-admin-bg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 3xl:w-11 3xl:h-11 rounded-xl bg-admin-accent/10 text-admin-accent flex items-center justify-center flex-shrink-0">
                    <FiColumns size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg 3xl:text-xl font-bold text-admin-text">{t('data.editTemplate')}</h3>
                    {categoryLabel && (
                      <p className="text-xs 3xl:text-sm text-admin-muted mt-0.5">
                        {t('data.forCategory')}: <span className="font-medium text-admin-text">{categoryLabel}</span>
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => setEditTemplateOpen(false)} className="p-2 text-admin-muted hover:text-admin-text hover:bg-gray-100 rounded-lg transition-colors">
                  <FiX size={18} />
                </button>
              </div>

              {/* CSV header preview (top) */}
              {!templateInfoLoading && activeColumns.length > 0 && (
                <div className="px-6 py-3 bg-admin-bg border-b border-admin-border">
                  <p className="text-[10px] font-semibold text-admin-muted uppercase tracking-wider mb-2">{t('data.csvPreview')}</p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {activeColumns.map((col, i) => (
                      <span key={`${col}-${i}`} className="px-2 py-0.5 bg-white border border-admin-border text-[11px] text-admin-text rounded font-mono">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {templateInfoLoading ? (
                  <div className="space-y-1.5">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-12 bg-admin-bg border border-admin-border rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-admin-muted mb-3">{t('data.editTemplateHelp')}</p>
                    <div className="space-y-1.5">
                      {orderItems.map((it, idx) => {
                        const isActive = it.locked || it.checked;
                        return (
                          <div
                            key={it.id}
                            className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                              isActive
                                ? it.locked
                                  ? 'bg-white border-admin-border border-s-4 border-s-admin-accent'
                                  : 'bg-white border-admin-border'
                                : 'bg-admin-bg/60 border-admin-border border-dashed'
                            }`}
                          >
                            {/* Position index */}
                            <span className="text-[11px] font-mono font-semibold text-admin-muted w-6 text-center select-none">
                              {String(idx + 1).padStart(2, '0')}
                            </span>

                            {/* Grip icon (visual cue) */}
                            <FiMenu size={14} className="text-admin-muted/60 flex-shrink-0 hidden sm:block" />

                            {/* Lock or checkbox */}
                            {it.locked ? (
                              <div className="flex items-center justify-center w-5 h-5 flex-shrink-0" title={t('data.requiredColumn')}>
                                <FiLock size={12} className="text-admin-accent" />
                              </div>
                            ) : (
                              <input
                                type="checkbox"
                                checked={it.checked}
                                onChange={() => toggleItemChecked(idx)}
                                className="w-4 h-4 rounded border-gray-300 text-admin-accent focus:ring-admin-accent focus:ring-2 focus:ring-offset-0 flex-shrink-0 cursor-pointer"
                              />
                            )}

                            {/* Label + column preview */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-sm font-medium ${isActive ? 'text-admin-text' : 'text-admin-muted'} ${it.locked ? 'font-mono' : ''}`}>
                                  {it.locked ? it.id : (language === 'ar' ? it.labelAr : it.labelEn)}
                                </p>
                                {it.locked && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-admin-accent bg-admin-accent/10 px-1.5 py-0.5 rounded">
                                    {t('data.required')}
                                  </span>
                                )}
                              </div>
                              {!it.locked && (
                                <p className="text-[11px] text-admin-muted font-mono mt-0.5 truncate">{it.columns.join('  ·  ')}</p>
                              )}
                            </div>

                            {/* Move arrows */}
                            <div className="flex flex-col gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => moveItem(idx, -1)}
                                disabled={idx === 0}
                                aria-label="Move up"
                                className="p-1 text-admin-muted hover:text-admin-accent hover:bg-admin-accent/5 rounded disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-admin-muted transition-colors"
                              >
                                <FiChevronUp size={14} />
                              </button>
                              <button
                                onClick={() => moveItem(idx, 1)}
                                disabled={idx === orderItems.length - 1}
                                aria-label="Move down"
                                className="p-1 text-admin-muted hover:text-admin-accent hover:bg-admin-accent/5 rounded disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-admin-muted transition-colors"
                              >
                                <FiChevronDown size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-admin-border bg-admin-card">
                <p className="text-xs text-admin-muted hidden sm:block">{t('data.savePersistHint')}</p>
                <div className="flex items-center gap-2 ms-auto">
                  <button onClick={() => setEditTemplateOpen(false)} className="px-4 py-2 text-sm font-medium text-admin-text bg-white border border-admin-border rounded-lg hover:bg-gray-50 transition-colors">
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={saveTemplateConfig}
                    disabled={templateInfoLoading || savingTemplate || activeColumns.length === 0}
                    className="flex items-center gap-2 px-5 py-2 bg-admin-accent text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <FiCheck size={14} /> {savingTemplate ? t('data.saving') : t('data.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
}
