/**
 * DailyRewardWheel — per-cafe daily spin tile.
 *
 * Each cafe runs its own wheel (configured by the cafe admin in
 * AdminDashboard). The logged-in user can spin once per Turkish
 * calendar day per cafe; the backend enforces this with a unique
 * (user_id, cafe_id, DATE(spun_at TZ Europe/Istanbul)) index.
 *
 * Rendering: the wheel is drawn as a true SVG pie — each slice is a
 * `<path>` arc, so it is circular by construction (no reliance on
 * border-radius + overflow clipping, which fails on a transformed
 * spinning element and made the old conic-gradient version render
 * square). The spin lands deterministically on the slice the backend
 * actually awarded, so the wheel stops on the real prize.
 *
 * UI states:
 *   1. Loading        — fetching today's status
 *   2. Available      — large CTA "ÇEVİR" + the wheel
 *   3. Spinning       — wheel rotates ~2.6s, lands on the won slice
 *   4. Won            — "+N PUAN" / gift overlay
 *   5. Already spun   — disabled CTA + last win recap
 *   6. Cafe missing   — gracefully hide
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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

// ─── Geometry ────────────────────────────────────────────────────────────────
// SVG canvas is 200×200; the wheel is centred at (100,100) with radius 92.
const CX = 100;
const CY = 100;
const R = 92;
/** How long the wheel visibly spins before the prize overlay appears. */
const SPIN_MS = 2600;

/** Polar → cartesian where `deg` is measured clockwise from the top (12 o'clock).
 *  This matches how a real wheel is read and how the top pointer sits. */
function polar(deg: number, radius = R): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + radius * Math.sin(rad), y: CY - radius * Math.cos(rad) };
}

/** SVG path for a pie wedge spanning [startDeg, endDeg] (clockwise from top). */
function wedgePath(startDeg: number, endDeg: number): string {
  const s = polar(startDeg);
  const e = polar(endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M${CX},${CY} L${s.x.toFixed(2)},${s.y.toFixed(2)} A${R},${R} 0 ${largeArc} 1 ${e.x.toFixed(2)},${e.y.toFixed(2)} Z`;
}

// Riso spot palette. Index → slice fill. The boolean array marks the dark
// inks that need light (paper) labels for contrast.
const SLICE_FILL = [
  '#ff3e94', // riso-pink
  '#1e3fb5', // riso-blue
  '#f1b41e', // riso-mustard
  '#5bc25a', // riso-spring
  '#e0251b', // riso-redox
  '#e8e4da', // paper-deep
];
const SLICE_LABEL_LIGHT = [true, true, false, false, true, false];

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
   *  overlay shows the gift badge instead of a points badge. */
  const [justGift, setJustGift] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Cumulative wheel rotation in degrees — only ever increases so the wheel
   *  always spins forward, then settles with the won slice under the pointer. */
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const justWonTimer = useRef<number | null>(null);
  const prefersReduced = useReducedMotion();

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

  // Pre-compute each slice's wedge path, mid-angle and label once per slice set.
  const geometry = useMemo(() => {
    const totalW = slices.reduce((a, s) => a + Math.max(0, Number(s.weight) || 0), 0);
    let acc = 0;
    return slices.map((slice, idx) => {
      const sweep =
        totalW > 0 ? (Math.max(0, Number(slice.weight) || 0) / totalW) * 360 : 360 / slices.length;
      const start = acc;
      const end = acc + sweep;
      const mid = start + sweep / 2;
      acc = end;
      return {
        idx,
        // A hair of overlap (0.4°) hides anti-alias seams between wedges.
        path: wedgePath(start, Math.min(end + 0.4, 360)),
        mid,
        fill: SLICE_FILL[idx % SLICE_FILL.length],
        labelLight: SLICE_LABEL_LIGHT[idx % SLICE_LABEL_LIGHT.length],
        label: slice.gift ? '★' : `+${slice.points}`,
      };
    });
  }, [slices]);

  /** Final rotation so `midDeg` lands under the top pointer, after ≥4 turns. */
  const landingRotation = (midDeg: number): number => {
    const targetMod = ((-midDeg % 360) + 360) % 360;
    const base = Math.ceil((rotationRef.current + 360 * 4) / 360) * 360;
    return base + targetMod;
  };

  /** Find the slice the backend awarded, to land the wheel on it. Prefer the
   *  server-provided pickedIndex; fall back to matching points/gift. */
  const wonSliceIndex = (resp: {
    gift?: { label: string } | null;
    pointsWon: number;
    pickedIndex?: number;
  }): number => {
    if (typeof resp.pickedIndex === 'number' && resp.pickedIndex >= 0) {
      return Math.min(resp.pickedIndex, Math.max(0, slices.length - 1));
    }
    if (resp.gift) {
      const i = slices.findIndex((s) => s.gift);
      return i >= 0 ? i : 0;
    }
    const i = slices.findIndex((s) => !s.gift && Number(s.points) === Number(resp.pointsWon));
    return i >= 0 ? i : 0;
  };

  const handleSpin = async () => {
    if (!cafeId || spinning || status?.alreadySpunToday) return;
    setSpinning(true);
    setError(null);
    try {
      let resp;
      try {
        resp = await api.wheel.spin(cafeId);
      } catch (err) {
        // The readable CSRF cookie can lapse while the auth session lives on,
        // 403-ing the spin. A GET re-mints the cookie (server self-heals on
        // safe requests); retry the spin once before surfacing the error.
        if (err instanceof Error && /csrf/i.test(err.message)) {
          await api.wheel.get(cafeId).catch(() => {});
          resp = await api.wheel.spin(cafeId);
        } else {
          throw err;
        }
      }

      // Spin the wheel to the awarded slice. The animation itself is the
      // suspense, so the prize is revealed only once it visually settles.
      const idx = wonSliceIndex(resp);
      const target = landingRotation(geometry[idx]?.mid ?? 0);
      rotationRef.current = target;
      setRotation(target);

      await new Promise((resolve) => window.setTimeout(resolve, prefersReduced ? 60 : SPIN_MS));

      if (resp.gift) {
        setJustGift(resp.gift.label);
        onGiftWon?.(resp.gift);
      } else {
        setJustWon(resp.pointsWon);
        onPointsWon?.(resp.pointsWon);
      }
      setStatus((prev) => (prev ? { ...prev, alreadySpunToday: true, lastSpin: resp.spin } : prev));
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
          {/* Wheel — true SVG pie, circular by construction */}
          <div className="relative mx-auto mt-3 mb-6 w-44 h-44 sm:w-52 sm:h-52">
            {slices.length > 0 ? (
              <>
                {/* Risograph misregistration — offset outline rings, not a glow
                    blob: the rim re-printed a few px off in pink + blue. */}
                <svg
                  viewBox="0 0 200 200"
                  className="absolute inset-0 h-full w-full pointer-events-none"
                  aria-hidden="true"
                >
                  <circle cx={105} cy={105} r={R} fill="none" stroke="#ff3e94" strokeWidth={3} />
                  <circle cx={103} cy={103} r={R} fill="none" stroke="#1e3fb5" strokeWidth={3} />
                </svg>

                {/* Rotating wheel face. */}
                <motion.div
                  className="absolute inset-0"
                  style={{ willChange: 'transform' }}
                  animate={{ rotate: rotation }}
                  transition={{
                    duration: prefersReduced ? 0 : 2.6,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <svg
                    viewBox="0 0 200 200"
                    className="h-full w-full"
                    role="img"
                    aria-label="Ödül çarkı"
                  >
                    {geometry.map((g) => (
                      <path
                        key={g.idx}
                        d={g.path}
                        fill={g.fill}
                        stroke="#141413"
                        strokeWidth={2}
                        strokeLinejoin="round"
                        data-testid={`wheel-slice-${g.idx}`}
                      />
                    ))}
                    {geometry.map((g) => (
                      <g key={`label-${g.idx}`} transform={`rotate(${g.mid} ${CX} ${CY})`}>
                        <text
                          x={CX}
                          y={44}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="font-riso-display"
                          style={{ fontSize: '13px', fontWeight: 700 }}
                          fill={g.labelLight ? '#fbf7ee' : '#141413'}
                        >
                          {g.label}
                        </text>
                      </g>
                    ))}
                    {/* Crisp outer rim drawn on top of the wedges. */}
                    <circle cx={CX} cy={CY} r={R} fill="none" stroke="#141413" strokeWidth={3} />
                  </svg>
                </motion.div>

                {/* Center hub — clean circle, no offset shadow (the wheel rim
                    already carries the misregistration). */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="flex items-center justify-center border-2 border-carbon bg-paper"
                    style={{ width: 38, height: 38, borderRadius: '9999px' }}
                  >
                    <Sparkles size={18} className="text-riso-pink-deep" />
                  </div>
                </div>

                {/* Top pointer biting into the wheel */}
                <div
                  aria-hidden="true"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[11px] border-r-[11px] border-t-[18px] border-l-transparent border-r-transparent border-t-carbon drop-shadow-sm z-10"
                />

                <AnimatePresence>
                  {(justWon !== null || justGift !== null) && (
                    <motion.div
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                    >
                      {justGift !== null ? (
                        <div className="border-4 border-carbon bg-riso-mustard text-carbon px-4 py-2 font-riso-display text-lg sm:text-xl font-bold riso-shadow-md rotate-[-4deg] text-center flex items-center gap-2">
                          <Gift size={20} /> {justGift.toUpperCase()}
                        </div>
                      ) : (
                        <div className="border-4 border-carbon bg-riso-spring text-carbon px-4 py-2 font-riso-display text-2xl font-bold riso-shadow-md rotate-[-4deg]">
                          +{justWon} PUAN
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-carbon bg-paper-deep text-carbon-muted font-riso-mono text-xs rounded-full">
                Henüz dilim yok
              </div>
            )}
          </div>

          {/* Gift confirmation banner — shows the inventory-redirect hint
              when the user just won a coupon, since the points balance
              didn't change. */}
          {justGift && (
            <div className="mb-3 border-2 border-carbon border-l-[6px] border-l-riso-mustard bg-riso-mustard/20 p-3 text-xs text-carbon font-riso-body">
              <strong>Tebrikler!</strong> {justGift} kuponun envanterine eklendi. Kasada QR kodu
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
