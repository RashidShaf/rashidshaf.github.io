import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle } from 'react-icons/fi';
import useLanguageStore from '../../stores/useLanguageStore';

const ConfirmModal = ({ open, title, message, onConfirm, onCancel, confirmText, danger = true }) => {
  const t = useLanguageStore((s) => s.t);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <div className="bg-surface rounded-2xl border border-muted/15 shadow-2xl w-full max-w-sm p-6 text-center">
              <div className={`w-14 h-14 rounded-full ${danger ? 'bg-red-100' : 'bg-accent/10'} flex items-center justify-center mx-auto mb-4`}>
                <FiAlertTriangle className={`w-7 h-7 ${danger ? 'text-red-500' : 'text-accent'}`} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{title || t('common.confirm')}</h3>
              <p className="text-sm text-foreground/60 mb-6">{message}</p>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 border border-muted/20 rounded-xl text-sm font-medium text-foreground/70 hover:bg-surface-alt transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                    danger ? 'bg-red-500 hover:bg-red-600' : 'bg-accent hover:bg-accent-light'
                  }`}
                >
                  {confirmText || t('common.confirm')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
