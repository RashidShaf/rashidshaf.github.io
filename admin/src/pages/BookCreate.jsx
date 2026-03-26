import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import useLanguageStore from '../stores/useLanguageStore';

export default function BookCreate() {
  const t = useLanguageStore((s) => s.t);
  const isRTL = useLanguageStore((s) => s.isRTL);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/books"
          className="p-2 rounded-lg text-admin-muted hover:text-admin-text hover:bg-gray-100 transition-colors"
        >
          <FiArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
        </Link>
        <h2 className="text-xl font-semibold text-admin-text">{t('books.addBook')}</h2>
      </div>

      <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
        <div className="text-admin-muted text-sm py-12 text-center">
          Book creation form coming soon
        </div>
      </div>
    </motion.div>
  );
}
