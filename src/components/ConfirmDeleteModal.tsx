import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  employeeName: string;
  isDeleting: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  employeeName,
  isDeleting,
}) => {
  const [confirmText, setConfirmText] = useState('');

  // Reset confirmation text when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  const isValid = confirmText.trim().toUpperCase() === 'DELETE';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-10"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              {/* Alert Icon */}
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 mb-4 animate-bounce-subtle">
                <AlertTriangle size={24} />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Delete Evaluation Report
              </h3>

              {/* Description */}
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 px-1">
                Are you sure you want to delete the evaluation report for{' '}
                <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                  {employeeName}
                </strong>
                ? This action is irreversible and all associated scores, feedback, and audit history will be permanently lost.
              </p>

              {/* Secure Confirmation Prompt */}
              <div className="w-full mt-5 text-left bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  To confirm, type <span className="text-red-500 font-bold">DELETE</span> below:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isDeleting}
                  placeholder='Type "DELETE" to confirm'
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="w-full flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={!isValid || isDeleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-xl text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-red-500/10"
                >
                  <Trash2 size={15} />
                  {isDeleting ? 'Deleting...' : 'Delete Report'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
