/**
 * Modal — Riso Kantin primitive.
 *
 * Dim backdrop + a centered Card with offset shadows. Closes on backdrop
 * click, Escape key, or explicit close button. Uses framer-motion for the
 * "stamped down" entrance animation (offset shadow appears as the modal
 * settles into place — mirrors the Button press idiom).
 *
 * Body scroll is locked while open.
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Show the X close button in the header. */
  showClose?: boolean;
  children: React.ReactNode;
  /** Optional footer (typically action buttons). */
  footer?: React.ReactNode;
  /** Width preset. */
  size?: 'sm' | 'md' | 'lg';
  'data-testid'?: string;
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  showClose = true,
  children,
  footer,
  size = 'md',
  'data-testid': testId,
}) => {
  // Esc-to-close + body scroll lock while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = original;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          data-testid={testId}
        >
          {/* Backdrop — ink with halftone dots */}
          <button
            type="button"
            aria-label="Modal'ı kapat"
            onClick={onClose}
            className="absolute inset-0 bg-carbon/85 cursor-default"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={[
              'relative w-full bg-paper border-2 border-carbon',
              'riso-shadow-md riso-halftone',
              SIZE_CLASS[size],
            ].join(' ')}
          >
            {(title || showClose) && (
              <div className="flex items-start justify-between gap-4 border-b-2 border-carbon p-5 sm:p-6">
                {title && (
                  <h2
                    id="modal-title"
                    className="font-riso-display text-2xl sm:text-3xl text-carbon"
                  >
                    {title}
                  </h2>
                )}
                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Kapat"
                    className="riso-focus shrink-0 border-2 border-carbon bg-paper p-1.5 text-carbon hover:bg-riso-pink hover:text-carbon transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
            <div className="p-5 sm:p-6">{children}</div>
            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-3 border-t-2 border-carbon bg-paper-deep p-4 sm:p-5">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
