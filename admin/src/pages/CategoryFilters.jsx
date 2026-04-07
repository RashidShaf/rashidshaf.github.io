import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const FILTER_OPTIONS = [
  { key: 'author', label: 'Author', labelAr: 'المؤلف' },
  { key: 'publisher', label: 'Publisher', labelAr: 'الناشر' },
  { key: 'language', label: 'Language', labelAr: 'اللغة' },
  { key: 'brand', label: 'Brand', labelAr: 'العلامة التجارية' },
  { key: 'color', label: 'Color', labelAr: 'اللون' },
  { key: 'material', label: 'Material', labelAr: 'المادة' },
];

export default function CategoryFilters() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { isRTL } = useLanguageStore();
  const [categoryName, setCategoryName] = useState('');
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  const fetchCategory = async () => {
    try {
      const res = await api.get('/admin/categories');
      const cats = res.data.data || res.data;
      const cat = cats.find((c) => c.id === categoryId);
      if (cat) setCategoryName(cat.name);
    } catch {}
  };

  const fetchFilters = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/categories/${categoryId}/filters`);
      setFilters(res.data);
    } catch {
      toast.error('Failed to fetch filters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategory();
    fetchFilters();
  }, [categoryId]);

  const isEnabled = (key) => filters.some((f) => f.fieldKey === key);
  const getFilterId = (key) => filters.find((f) => f.fieldKey === key)?.id;

  const handleToggle = async (option) => {
    setToggling(option.key);
    try {
      if (isEnabled(option.key)) {
        const id = getFilterId(option.key);
        await api.delete(`/admin/categories/filters/${id}`);
      } else {
        await api.post(`/admin/categories/${categoryId}/filters`, {
          name: option.label,
          nameAr: option.labelAr,
          fieldKey: option.key,
          isActive: true,
        });
      }
      await fetchFilters();
    } catch {
      toast.error('Failed to update filter');
    } finally {
      setToggling(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/categories')} className="p-2 text-admin-muted hover:text-admin-accent hover:bg-gray-100 rounded-lg transition-colors">
          <FiArrowLeft size={20} className={isRTL ? 'rotate-180' : ''} />
        </button>
        <div>
          <h1 className="text-xl 3xl:text-2xl font-bold text-admin-text">
            Filters for {categoryName || 'Category'}
          </h1>
          <p className="text-sm text-admin-muted mt-0.5">Select which filters to show on the browse page for this category</p>
        </div>
      </div>

      {/* Filter Toggles */}
      <div className="bg-admin-card rounded-xl border border-admin-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-admin-muted">Loading...</div>
        ) : (
          <div className="divide-y divide-admin-border">
            {FILTER_OPTIONS.map((option) => {
              const enabled = isEnabled(option.key);
              const isLoading = toggling === option.key;
              return (
                <div key={option.key} className="flex items-center justify-between px-6 py-4 3xl:px-8 3xl:py-5 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm 3xl:text-base font-medium text-admin-text">{option.label}</p>
                    <p className="text-xs 3xl:text-sm text-admin-muted mt-0.5">{option.labelAr}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(option)}
                    disabled={isLoading}
                    className={`w-11 h-6 rounded-full relative transition-colors ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'} ${enabled ? 'bg-admin-accent' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-admin-muted mt-3">
        {filters.length === 0
          ? 'No filters enabled — the browse page will show default filters for this category.'
          : `${filters.length} filter${filters.length > 1 ? 's' : ''} enabled for this category.`
        }
      </p>
    </motion.div>
  );
}
