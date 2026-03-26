import { motion } from 'framer-motion';
import useThemeStore from '../../stores/useThemeStore';
import { FiType } from 'react-icons/fi';

const ThemeSwitcher = () => {
  const { fontSet, setFontSet } = useThemeStore();
  const isSetB = fontSet === 'set-b';

  const toggle = () => {
    setFontSet(isSetB ? 'set-a' : 'set-b');
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border border-muted/30 text-foreground hover:border-accent/50 transition-all duration-200"
      aria-label="Switch font"
    >
      <FiType size={14} />
      <span className="hidden sm:inline">
        {isSetB ? 'Serif' : 'Sans'}
      </span>
    </motion.button>
  );
};

export default ThemeSwitcher;
