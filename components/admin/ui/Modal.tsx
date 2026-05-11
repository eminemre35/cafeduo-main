import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional id for the title element (a11y). */
  titleId?: string;
}

const widthClass: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  eyebrow,
  size = 'md',
  children,
  footer,
  titleId = 'cc-modal-title',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handle);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handle);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1814]/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={
              `w-full ${widthClass[size]} max-h-[calc(100vh-2rem)] flex flex-col ` +
              'rounded-2xl bg-[#FAF7F0] shadow-[0_24px_80px_-12px_rgba(28,24,20,0.25)] ' +
              'border border-[#E8DCC9] overflow-hidden'
            }
          >
            <header className="flex items-start justify-between gap-4 px-8 pt-7 pb-5 border-b border-[#E8DCC9]">
              <div className="flex flex-col gap-1">
                {eyebrow && (
                  <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-[#C2622F] font-semibold">
                    {eyebrow}
                  </span>
                )}
                <h2
                  id={titleId}
                  className="cc-display text-[1.5rem] font-semibold text-[#1C1814] tracking-[-0.01em]"
                >
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Kapat"
                className="shrink-0 -m-2 p-2 rounded-lg text-[#6B5B4D] hover:bg-[#F2EBE0] hover:text-[#1C1814] transition-colors"
              >
                <X size={18} />
              </button>
            </header>
            <div className="px-8 py-6 overflow-y-auto">{children}</div>
            {footer && (
              <footer className="px-8 py-5 border-t border-[#E8DCC9] bg-[#F2EBE0]/40">
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
