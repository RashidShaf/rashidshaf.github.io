import { motion } from 'framer-motion';
import { FiGlobe } from 'react-icons/fi';
import useLanguageStore from '../../stores/useLanguageStore';

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguageStore();

  const toggle = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-muted/15 text-foreground hover:border-accent hover:text-accent transition-colors text-sm font-medium"
      aria-label="Switch language"
    >
      <FiGlobe className="w-4 h-4" />
      <span className="uppercase tracking-wide">{language === 'en' ? 'AR' : 'EN'}</span>
    </motion.button>
  );
};

export default LanguageSwitcher;
