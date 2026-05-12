/**
 * CookieConsent — Riso Kantin paper modal that gates the app behind explicit
 * consent. The banner now offers BOTH accept and reject:
 *
 *   - "Kabul Et" → stores 'true', dismisses, app continues normally.
 *   - "Reddet"   → stores 'false', the modal stays as a full-screen blocker
 *                  and the app cannot be used (login/register suppressed
 *                  via consentState read from localStorage elsewhere).
 *
 * Stored values:
 *   localStorage.cookie_consent = 'true' | 'false'
 *
 * Other parts of the app (AuthModal submit handler) read `cookie_consent`
 * before allowing auth; if it's 'false' or missing, the user is told they
 * must accept cookies to continue.
 *
 * The legacy `.cd-cookie-banner` class is intentionally NOT applied — that
 * class had legacy cyber-dark !important CSS in index.css (cyan border, dark
 * bg) that overrode the Riso paper styling. The legacy block is being kept
 * around for other transitional pages; we just opt out by not using it.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Cookie, X } from 'lucide-react';

const CONSENT_KEY = 'cookie_consent';

export type CookieConsentValue = 'accepted' | 'rejected' | 'pending';

export const readCookieConsent = (): CookieConsentValue => {
  if (typeof window === 'undefined') return 'pending';
  const raw = window.localStorage.getItem(CONSENT_KEY);
  if (raw === 'true' || raw === 'accepted') return 'accepted';
  if (raw === 'false' || raw === 'rejected') return 'rejected';
  return 'pending';
};

export const CookieConsent: React.FC = () => {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<CookieConsentValue>('pending');
  const portalRoot = useMemo(() => (typeof document !== 'undefined' ? document.body : null), []);

  useEffect(() => {
    setHydrated(true);
    setState(readCookieConsent());

    // Re-read consent on the custom event AuthModal dispatches when it wipes
    // a rejected/missing value. Also listen to storage to stay in sync if
    // the user toggled consent in another tab.
    const refresh = () => setState(readCookieConsent());
    window.addEventListener('cookie-consent-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('cookie-consent-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setState('accepted');
    // No dispatch here — our own setState already reflects the new value,
    // and dispatching would round-trip via the event listener which re-
    // reads localStorage (in tests that's a mock that may not echo the
    // setItem call). External callers that change consent should dispatch
    // 'cookie-consent-changed' themselves to notify this component.
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setState('rejected');
  };

  if (!hydrated || !portalRoot) return null;

  // Accepted → don't render anything. (Pending or rejected → show the
  // modal so the user is asked again to make a choice / can re-accept.)
  if (state === 'accepted') return null;

  const isRejected = state === 'rejected';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Çerez bildirimi"
      className="riso-kantin fixed inset-0 z-[130] flex items-end justify-center p-4 sm:items-center"
    >
      {/* Backdrop — full-screen ink wash blocks all interaction underneath
       *  until a choice is made. Accepting unmounts the whole component. */}
      <div className="absolute inset-0 bg-carbon/70 backdrop-blur-sm" aria-hidden="true" />

      <div className="relative w-full max-w-md border-2 border-carbon bg-paper p-5 sm:p-6 riso-shadow-md">
        {/* Riso confetti accents */}
        <div
          aria-hidden="true"
          className="absolute top-3 right-3 h-2 w-12 bg-riso-mustard rotate-[-4deg] pointer-events-none hidden sm:block"
        />
        <div className="flex items-start gap-3">
          <div className="shrink-0 border-2 border-carbon bg-riso-mustard p-2.5 text-carbon flex">
            <Cookie size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-carbon-muted font-riso-mono">
              Sistem bilgisi
            </p>
            <h3 className="mb-1.5 text-lg font-bold uppercase tracking-[0.06em] text-carbon font-riso-display">
              Çerez Kullanımı
            </h3>
            <p className="mb-1 break-words text-sm leading-6 text-carbon font-riso-body">
              CafeDuo deneyimini iyileştirmek ve kafe konum doğrulamasını çalıştırmak için zorunlu
              çerezleri kullanır.
            </p>
            <p className="mb-4 text-xs leading-5 text-carbon-soft font-riso-body">
              Devam etmek için çerezleri kabul etmen gerekir. Reddedersen giriş yapamazsın.
            </p>

            {isRejected && (
              <div className="mb-3 border-2 border-carbon border-l-[6px] border-l-riso-redox bg-riso-redox/15 p-3 text-xs text-carbon font-riso-body flex items-start gap-2">
                <X size={14} className="shrink-0 mt-0.5 text-riso-redox" />
                <span>
                  Çerezleri reddettin. CafeDuo'yu kullanmak için aşağıdaki tuşla onay vermelisin.
                </span>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={handleReject}
                className="riso-focus flex-1 border-2 border-carbon bg-paper-deep text-carbon py-2.5 text-sm font-bold uppercase tracking-[0.08em] font-riso-display transition-all hover:bg-paper-dim"
              >
                Reddet
              </button>
              <button
                type="button"
                onClick={handleAccept}
                className="riso-focus riso-press flex-1 border-2 border-carbon bg-riso-pink text-carbon py-2.5 text-sm font-bold uppercase tracking-[0.1em] font-riso-display transition-all riso-shadow-sm hover:-translate-y-[1px]"
              >
                Kabul Et
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    portalRoot
  );
};
