import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiDownload, FiUpload, FiFileText, FiUsers, FiShoppingBag, FiPackage, FiLayers, FiCheck, FiAlertCircle, FiLock, FiX } from 'react-icons/fi';
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
    const headers = 'barcode,nameEn,nameAr,purchasePrice,sellingPrice,mainCategory,subCategory,subSubCategory\n';
    const rows = preview.duplicates.map((d) =>
      `${d.barcode},"${d.nameEn}","${d.nameAr}",${d.purchasePrice || ''},${d.sellingPrice},${d.mainCategory},${d.subCategory},${d.subSubCategory || ''}`
    ).join('\n');
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
        {preview && (
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
                        <th className="pb-2 pe-3">{t('books.barcode')}</th>
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
                          <td className="py-1.5 pe-3 font-mono">{p.barcode}</td>
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
                    <button
                      onClick={() => {
                        const generate13 = () => {
                          const digits = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('');
                          return digits;
                        };
                        const existingBarcodes = new Set([
                          ...preview.valid.map((v) => v.barcode),
                          ...preview.duplicates.map((d) => d.barcode),
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
                    <button onClick={exportDuplicates} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors">
                      <FiDownload size={14} /> {t('data.exportDuplicates')}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-red-700">
                        <th className="pb-2 pe-3">{t('books.barcode')}</th>
                        <th className="pb-2 pe-3">{t('books.titleEn')}</th>
                        <th className="pb-2 pe-3">{t('books.price')}</th>
                        <th className="pb-2">{t('data.reason')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.duplicates.map((d, i) => (
                        <tr key={i} className="border-t border-red-200">
                          <td className="py-1.5 pe-3 font-mono">{d.barcode}</td>
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
        )}

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
    </motion.div>
  );
}
