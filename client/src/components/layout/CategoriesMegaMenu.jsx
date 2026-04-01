import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBookOpen, FiArrowRight } from 'react-icons/fi';
import api from '../../utils/api';
import useLanguageStore from '../../stores/useLanguageStore';

const CategoriesMegaMenu = ({ onClose }) => {
  const [categories, setCategories] = useState([]);
  const { t, language } = useLanguageStore();

  useEffect(() => {
    api.get('/categories')
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  const getName = (cat) => (language === 'ar' && cat.nameAr) ? cat.nameAr : cat.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[480px] bg-surface border border-muted/15 rounded-2xl shadow-2xl overflow-hidden z-50"
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {t('nav.categories')}
          </h3>
          <Link
            to="/books"
            onClick={onClose}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-light transition-colors"
          >
            {t('common.viewAll')}
            <FiArrowRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/books?category=${cat.slug}`}
              onClick={onClose}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-alt transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                <FiBookOpen size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                  {getName(cat)}
                </p>
                <p className="text-xs text-foreground/60">
                  {cat._count?.books || 0} {t('nav.books').toLowerCase()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default CategoriesMegaMenu;
