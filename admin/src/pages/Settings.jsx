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
      <h2 className="text-2xl font-bold text-admin-text mb-6">{t('nav.settings')}</h2>

      <div className="bg-admin-card rounded-xl border border-admin-border p-6 shadow-sm">
        <div className="text-admin-muted text-sm py-12 text-center">
          Settings panel coming soon
        </div>
      </div>
    </motion.div>
  );
}
