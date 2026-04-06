import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiDownload, FiUpload, FiFileText, FiUsers, FiShoppingBag, FiPackage, FiLayers, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

export default function DataManagement() {
  const { t } = useLanguageStore();
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

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
      toast.success(`${type} exported`);
    } catch {
      toast.error(`Failed to export ${type}`);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/admin/data/import/products', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/admin/data/import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'product-import-template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template');
    }
  };

  const exportItems = [
    { type: 'products', label: 'Products', icon: FiFileText, color: 'bg-blue-600', hasExcel: true },
    { type: 'customers', label: 'Customers', icon: FiUsers, color: 'bg-emerald-600' },
    { type: 'orders', label: 'Orders', icon: FiShoppingBag, color: 'bg-amber-500' },
    { type: 'inventory', label: 'Inventory', icon: FiPackage, color: 'bg-purple-600' },
    { type: 'categories', label: 'Categories', icon: FiLayers, color: 'bg-rose-600' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

      {/* Export Section */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm mb-6 3xl:mb-8">
        <h2 className="text-lg 3xl:text-xl font-bold text-admin-text mb-1">Export Data</h2>
        <p className="text-xs 3xl:text-sm text-admin-muted mb-5">Download your data as CSV or Excel files</p>
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
                <button
                  onClick={() => exportData(item.type)}
                  className="px-3 py-1.5 3xl:px-4 3xl:py-2 bg-white border border-admin-border text-admin-text text-xs 3xl:text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  CSV
                </button>
                {item.hasExcel && (
                  <button
                    onClick={() => exportData(item.type, 'excel')}
                    className="px-3 py-1.5 3xl:px-4 3xl:py-2 bg-green-600 text-white text-xs 3xl:text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Excel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-6 3xl:p-8 shadow-sm">
        <h2 className="text-lg 3xl:text-xl font-bold text-admin-text mb-1">Import Products</h2>
        <p className="text-xs 3xl:text-sm text-admin-muted mb-5">Upload a CSV file to add multiple products at once</p>

        <div className="flex flex-col sm:flex-row items-start gap-4 mb-5">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 3xl:px-5 3xl:py-3 bg-admin-bg border border-admin-border text-admin-text text-sm 3xl:text-base font-medium rounded-xl hover:bg-gray-100 transition-colors"
          >
            <FiDownload size={16} /> Download Template
          </button>
          <div className="text-xs 3xl:text-sm text-admin-muted max-w-md">
            <p>1. Download the CSV template</p>
            <p>2. Fill in your product data (title and price are required)</p>
            <p>3. Use category slug for the <code className="bg-gray-100 px-1 rounded">categorySlug</code> column</p>
            <p>4. Upload the filled CSV file below</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-6 py-3 3xl:px-8 3xl:py-3.5 bg-admin-accent text-white text-sm 3xl:text-base font-medium rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <FiUpload size={16} /> {importing ? 'Importing...' : 'Upload CSV'}
          </button>
        </div>

        {/* Import Results */}
        {importResult && (
          <div className="mt-5 bg-admin-bg border border-admin-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${importResult.errors.length === 0 ? 'bg-green-100' : 'bg-amber-100'}`}>
                {importResult.errors.length === 0 ? <FiCheck className="w-4 h-4 text-green-600" /> : <FiAlertCircle className="w-4 h-4 text-amber-600" />}
              </div>
              <div>
                <p className="text-sm 3xl:text-base font-semibold text-admin-text">{importResult.message}</p>
                <p className="text-xs text-admin-muted">{importResult.created} of {importResult.total} products imported successfully</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-red-600 mb-2">{importResult.errors.length} error(s):</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                      <span className="font-medium whitespace-nowrap">Row {err.row}:</span>
                      <span>{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
