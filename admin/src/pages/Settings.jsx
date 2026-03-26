import { motion } from 'framer-motion';
import useLanguageStore from '../stores/useLanguageStore';

export default function Settings() {
  const t = useLanguageStore((s) => s.t);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-admin-text">{t('nav.settings')}</h2>
      </div>

      <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
        <div className="text-admin-muted text-sm py-12 text-center">
          Settings panel coming soon
        </div>
      </div>
    </motion.div>
  );
}
