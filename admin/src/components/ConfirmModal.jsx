import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle } from 'react-icons/fi';

const ConfirmModal = ({ open, title, message, onConfirm, onCancel, confirmText = 'Delete', danger = true }) => {
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
            <div className="bg-admin-card rounded-2xl border border-admin-border shadow-2xl w-full max-w-sm p-6 text-center">
              <div className={`w-14 h-14 rounded-full ${danger ? 'bg-red-100' : 'bg-blue-100'} flex items-center justify-center mx-auto mb-4`}>
                <FiAlertTriangle className={`w-7 h-7 ${danger ? 'text-red-500' : 'text-blue-500'}`} />
              </div>
              <h3 className="text-lg font-bold text-admin-text mb-2">{title || 'Are you sure?'}</h3>
              <p className="text-sm text-admin-muted mb-6">{message || 'This action cannot be undone.'}</p>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 border border-admin-border rounded-xl text-sm font-medium text-admin-muted hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                    danger ? 'bg-red-500 hover:bg-red-600' : 'bg-admin-accent hover:bg-blue-600'
                  }`}
                >
                  {confirmText}
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
