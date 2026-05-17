/**
 * AvatarPickerModal — 4×4 DiceBear pixel-art grid.
 *
 * Surface matches the Riso Kantin redesign: paper ground, ink border, double
 * offset shadow. Each tile is a 2px-bordered square; the currently selected
 * seed gets a riso-pink double-offset ring so the user can spot their pick at
 * a glance.
 *
 * Wire-up: UserProfileModal opens this on demand. We don't need a context —
 * pass `currentSeed` (already parsed from `user.avatar_url`) and an
 * `onPick(seed)` callback that fires the PUT /users/:id request upstream.
 */
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AVATAR_SEEDS, getAvatarUrl, type AvatarSeed } from '../lib/avatars';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSeed: string | null;
  onPick: (seed: AvatarSeed) => Promise<void> | void;
  saving?: boolean;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentSeed,
  onPick,
  saving = false,
}) => {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="riso-kantin fixed inset-0 z-[125] flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Avatar seçimi"
    >
      <div className="absolute inset-0 bg-carbon/80" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md bg-paper border-2 border-carbon riso-shadow-md">
        <div className="flex items-center justify-between border-b-2 border-carbon px-5 py-3">
          <h3 className="font-riso-display text-lg uppercase tracking-widest text-carbon">
            Avatar Seç
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="riso-focus inline-flex h-8 w-8 items-center justify-center border-2 border-carbon bg-paper text-carbon hover:bg-paper-deep transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-5">
          <p className="mb-3 font-riso-mono text-[0.7rem] uppercase tracking-[0.16em] text-carbon-soft">
            16 seçenek · DiceBear pixel-art
          </p>
          <div className="grid grid-cols-4 gap-2 sm:gap-3" data-testid="avatar-grid">
            {AVATAR_SEEDS.map((seed) => {
              const isCurrent = currentSeed === seed;
              return (
                <button
                  key={seed}
                  type="button"
                  onClick={() => void onPick(seed)}
                  disabled={saving}
                  aria-label={`Avatar: ${seed}`}
                  aria-pressed={isCurrent}
                  data-testid={`avatar-option-${seed}`}
                  className={`riso-focus relative h-16 w-full border-2 border-carbon bg-paper-deep transition-transform hover:scale-[1.04] disabled:opacity-60 disabled:cursor-wait ${
                    isCurrent ? 'ring-2 ring-riso-pink ring-offset-2 ring-offset-paper' : ''
                  }`}
                >
                  <img
                    src={getAvatarUrl(seed)}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-contain p-1"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
,
    document.body
  );
};
