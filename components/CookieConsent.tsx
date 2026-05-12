import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Cookie } from 'lucide-react';

const CONSENT_KEY = 'cookie_consent';

export const CookieConsent: React.FC = () => {
  const [hydrated, setHydrated] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const portalRoot = useMemo(() => (typeof document !== 'undefined' ? document.body : null), []);

  useEffect(() => {
    setHydrated(true);
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setShowBanner(false);
  };

  if (!hydrated || !showBanner || !portalRoot) return null;

  return createPortal(
    <div
      role="region"
      aria-label="Çerez bildirimi"
      className="riso-kantin cd-cookie-banner pointer-events-none fixed bottom-4 left-4 right-4 z-[120] md:left-auto md:right-6 md:bottom-6 md:w-[26rem]"
    >
      <div className="pointer-events-auto border-2 border-carbon bg-paper p-4 riso-shadow-md">
        <div className="flex items-start gap-3">
          <div className="hidden shrink-0 border-2 border-carbon bg-riso-mustard p-2.5 text-carbon sm:flex">
            <Cookie size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-carbon-muted font-riso-mono">
              Sistem bilgisi
            </p>
            <h3 className="mb-1.5 text-base font-bold uppercase tracking-[0.08em] text-carbon font-riso-display">
              Çerez Kullanımı
            </h3>
            <p className="mb-3 break-words text-xs leading-5 text-carbon-soft sm:text-[13px] font-riso-body">
              Deneyim ve konum doğrulaması için gerekli çerezleri kullanıyoruz.
            </p>
            <button
              type="button"
              onClick={handleAccept}
              className="riso-focus riso-press w-full border-2 border-carbon bg-riso-pink text-carbon py-2.5 text-sm font-bold uppercase tracking-[0.1em] font-riso-display transition-all riso-shadow-sm hover:-translate-y-[1px]"
            >
              Anladım
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalRoot
  );
};
