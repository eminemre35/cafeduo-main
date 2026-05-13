/**
 * DailyRewardWheel — per-cafe daily spin tile.
 *
 * Each cafe runs its own wheel (configured by the cafe admin in
 * AdminDashboard). The logged-in user can spin once per Turkish
 * calendar day per cafe; the backend enforces this with a unique
 * (user_id, cafe_id, DATE(spun_at TZ Europe/Istanbul)) index.
 *
 * UI states:
 *   1. Loading        — fetching today's status
 *   2. Available      — large CTA "ÇEVİR" button + slices preview
 *   3. Spinning       — CSS rotation animation 2.5s + sound? no
 *   4. Won            — confetti animation + "+N PUAN"
 *   5. Already spun   — disabled CTA + last win recap
 *   6. Cafe missing   — gracefully hide
 *
 * Mounts in the dashboard for any user with cafe_id set.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, RotateCw, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';

interface WheelSlice {
  points: number;
  weight: number;
  /** When set, this slice gives a coupon (e.g. "Bedava Kahve") instead of
   *  points. Backend mints a user_items row with the gift's item_title +
   *  a fresh CD-XXXX-XXXX-XXXX code. */
  gift?: { label: string } | null;
}

interface WheelStatus {
  cafeId: number;
  cafeName?: string;
  wheel: WheelSlice[];
  alreadySpunToday: boolean;
  lastSpin: { id: number; points_won: number; spun_at: string } | null;
}

interface DailyRewardWheelProps {
  /** Cafe id accepts string | number for compatibility with User.cafe_id */
  cafeId: string | number | null | undefined;
  onPointsWon?: (points: number) => void;
  /** Fires when the spin resolves to a gift coupon (e.g. Bedava Kahve).
   *  Dashboard refetches inventory so the new ticket appears immediately. */
  onGiftWon?: (gift: { label: string }) => void;
}

const SLICE_COLORS = [
  'bg-riso-pink text-carbon',
  'bg-riso-blue text-paper',
  'bg-riso-mustard text-carbon',
  'bg-riso-spring text-carbon',
  'bg-riso-redox text-paper',
  'bg-paper-deep text-carbon',
];

export const DailyRewardWheel: React.FC<DailyRewardWheelProps> = ({
  cafeId,
  onPointsWon,
  onGiftWon,
}) => {
  const [status, setStatus] = useState<WheelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  /** When the spin resolves to a points slice, holds the points count
   *  for the overlay. */
  const [justWon, setJustWon] = useState<number | null>(null);
  /** When the spin resolves to a gift slice, holds the gift label so the
   *  overlay shows "🎁 BEDAVA KAHVE!" instead of a points badge. */
  const [justGift, setJustGift] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const justWonTimer = useRef<number | null>(null);

  // Fetch wheel status when cafe changes.
  useEffect(() => {
    if (!cafeId) {
      setStatus(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await api.wheel.get(cafeId);
        if (!cancelled) setStatus(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Çark bilgisi alınamadı.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cafeId]);

  useEffect(
    () => () => {
      if (justWonTimer.current) window.clearTimeout(justWonTimer.current);
    },
    []
  );

  const slices = useMemo(() => status?.wheel || [], [status]);

  const handleSpin = async () => {
    if (!cafeId || spinning || status?.alreadySpunToday) return;
    setSpinning(true);
    setError(null);
    try {
      // Tiny artificial delay so the spin animation feels meaningful (the
      // server responds in tens of ms but the user expects suspense).
      const [resp] = await Promise.all([
        api.wheel.spin(cafeId),
        new Promise((resolve) => window.setTimeout(resolve, 2200)),
      ]);
      if (resp.gift) {
        // Gift slice — Bedava Kahve etc. Show the gift overlay and tell
        // the parent so it refetches inventory.
        setJustGift(resp.gift.label);
        onGiftWon?.(resp.gift);
      } else {
        setJustWon(resp.pointsWon);
        onPointsWon?.(resp.pointsWon);
      }
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              alreadySpunToday: true,
              lastSpin: resp.spin,
            }
          : prev
      );
      justWonTimer.current = window.setTimeout(() => {
        setJustWon(null);
        setJustGift(null);
      }, 4500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Çark çevrilemedi.';
      setError(message);
    } finally {
      setSpinning(false);
    }
  };

  if (!cafeId) return null;

  return (
    <div
      className="border-2 border-carbon bg-paper riso-shadow-md p-5 sm:p-6 relative overflow-hidden"
      data-testid="daily-reward-wheel"
    >
      {/* Riso confetti accents */}
      <div
        aria-hidden="true"
        className="absolute top-3 right-3 h-2 w-12 bg-riso-mustard rotate-[-4deg] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute top-6 right-16 h-2 w-6 bg-riso-pink rotate-[6deg] pointer-events-none"
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="border-2 border-carbon bg-riso-mustard w-10 h-10 flex items-center justify-center">
          <Gift size={20} className="text-carbon" />
        </div>
        <div className="min-w-0">
          <p className="font-riso-mono text-[10px] uppercase tracking-[0.18em] text-carbon-muted font-bold">
            Günün Çarkı
          </p>
          <h3 className="font-riso-display text-lg sm:text-xl text-carbon uppercase tracking-[0.04em] leading-tight">
            {status?.cafeName ? `${status.cafeName}` : 'Bu Kafenin Çarkı'}
          </h3>
        </div>
      </div>

      {loading && (
        <div className="border-2 border-carbon border-dashed bg-paper-deep p-6 text-center font-riso-mono text-xs uppercase tracking-wider text-carbon-muted animate-pulse">
          Çark yükleniyor...
        </div>
      )}

      {error && !loading && (
        <div className="border-2 border-carbon border-l-[6px] border-l-riso-redox bg-riso-redox/15 p-3 text-xs text-carbon font-riso-body mb-3">
          {error}
        </div>
      )}

      {!loading && status && (
        <>
          {/* Wheel preview — pure CSS pie chart */}
          <div className="relative mx-auto w-44 h-44 sm:w-52 sm:h-52 mb-4">
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-carbon overflow-hidden"
              animate={spinning ? { rotate: 360 * 5 + Math.random() * 360 } : { rotate: 0 }}
              transition={spinning ? { duration: 2.2, ease: 'easeOut' } : { duration: 0 }}
            >
              {slices.length > 0 ? (
                slices.map((slice, idx) => {
                  const totalW = slices.reduce((a, s) => a + Math.max(0, Number(s.weight) || 0), 0);
                  const sliceDeg =
                    totalW > 0
                      ? (Math.max(0, Number(slice.weight) || 0) / totalW) * 360
                      : 360 / slices.length;
                  const startDeg = slices
                    .slice(0, idx)
                    .reduce(
                      (acc, s) =>
                        acc +
                        (totalW > 0
                          ? (Math.max(0, Number(s.weight) || 0) / totalW) * 360
                          : 360 / slices.length),
                      0
                    );
                  const color = SLICE_COLORS[idx % SLICE_COLORS.length];
                  return (
                    <div
                      key={idx}
                      className={`absolute inset-0 ${color}`}
                      style={{
                        clipPath: `conic-gradient(from ${startDeg}deg at 50% 50%, currentColor ${sliceDeg}deg, transparent ${sliceDeg}deg)`,
                        WebkitClipPath: `polygon(50% 50%, 50% 0%, ${
                          50 + 50 * Math.cos(((startDeg - 90) * Math.PI) / 180)
                        }% ${50 + 50 * Math.sin(((startDeg - 90) * Math.PI) / 180)}%, ${
                          50 + 50 * Math.cos(((startDeg + sliceDeg - 90) * Math.PI) / 180)
                        }% ${50 + 50 * Math.sin(((startDeg + sliceDeg - 90) * Math.PI) / 180)}%)`,
                      }}
                    >
                      <div
                        className="absolute font-riso-display font-bold text-xs sm:text-sm whitespace-nowrap"
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: `rotate(${startDeg + sliceDeg / 2}deg) translate(0, -65%)`,
                          transformOrigin: '0 0',
                        }}
                      >
                        {slice.gift ? '🎁' : `+${slice.points}`}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-paper-deep text-carbon-muted font-riso-mono text-xs">
                  Henüz dilim yok
                </div>
              )}
            </motion.div>
            {/* Center hub + pointer */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 border-2 border-carbon bg-paper rounded-full flex items-center justify-center">
                <Sparkles size={16} className="text-riso-pink-deep" />
              </div>
            </div>
            <div
              aria-hidden="true"
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-carbon"
            />

            <AnimatePresence>
              {(justWon !== null || justGift !== null) && (
                <motion.div
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  {justGift !== null ? (
                    <div className="border-4 border-carbon bg-riso-mustard text-carbon px-4 py-2 font-riso-display text-lg sm:text-xl font-bold riso-shadow-md rotate-[-4deg] text-center">
                      🎁 {justGift.toUpperCase()}!
                    </div>
                  ) : (
                    <div className="border-4 border-carbon bg-riso-spring text-carbon px-4 py-2 font-riso-display text-2xl font-bold riso-shadow-md rotate-[-4deg]">
                      +{justWon} PUAN
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Gift confirmation banner — shows the inventory-redirect hint
              when the user just won a coupon, since the points balance
              didn't change. */}
          {justGift && (
            <div className="mb-3 border-2 border-carbon border-l-[6px] border-l-riso-mustard bg-riso-mustard/20 p-3 text-xs text-carbon font-riso-body">
              <strong>🎉 Tebrikler!</strong> {justGift} kuponun envanterine eklendi. Kasada QR kodu
              okutarak teslim alabilirsin.
            </div>
          )}

          {/* CTA */}
          <button
            type="button"
            onClick={handleSpin}
            disabled={spinning || status.alreadySpunToday || slices.length === 0}
            data-testid="wheel-spin-button"
            className="riso-focus riso-press w-full border-2 border-carbon bg-riso-pink text-carbon py-3 px-4 font-riso-display text-sm sm:text-base font-bold uppercase tracking-[0.12em] riso-shadow-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <RotateCw size={18} className={spinning ? 'animate-spin' : ''} />
            {spinning
              ? 'Çevriliyor...'
              : status.alreadySpunToday
                ? status.lastSpin && status.lastSpin.points_won > 0
                  ? `Bugün +${status.lastSpin.points_won} aldın`
                  : 'Bugün çevirdin'
                : 'ÇEVİR'}
          </button>

          {!status.alreadySpunToday && slices.length > 0 && (
            <p className="text-[11px] text-carbon-muted mt-2 text-center font-riso-mono uppercase tracking-wider">
              Günde 1 kez, her kafede ayrı
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default DailyRewardWheel;
