/**
 * Riso Kantin temalı maç sonucu kartı.
 *
 * Dashboard'daki ham sonuç banner'ının yerini alır: kazan/kaybet/berabere
 * ton sistemi, animasyonlu puan sayacı (0→+N) ve oyun istatistik chip'leri.
 * Backend'e dokunmaz — tüm veri oyun bileşenlerinden props ile gelir.
 *
 * Sentinel winner değerleri ('Berabere', 'Sonuç Bekleniyor') burada tanınır;
 * eskiden banner bunları kullanıcı adı sanıp "Berabere kazandı" yazıyordu.
 */
import React, { useEffect, useState } from 'react';
import { motion, animate, useReducedMotion } from 'framer-motion';
import { RetroButton } from '../RetroButton';
import { popIn, reducedFade } from '../ui/motionVariants';

/** Oyun bileşenlerinin maç bitiminde elinde olan, tamamı client-side istatistikler. */
export interface MatchStats {
  kind: 'chess' | 'quiz' | 'arena';
  playerScore?: number;
  opponentScore?: number;
  maxRounds?: number;
  moveCount?: number;
  durationMs?: number;
}

interface MatchResultCardProps {
  winner: string;
  earnedPoints: number;
  stats?: MatchStats;
  currentUsername: string;
  onDismiss: () => void;
  dismissing: boolean;
}

/** Oyunların gönderdiği gerçek-kullanıcı-adı-olmayan sonuç değerleri. */
const SENTINEL_DRAW = 'berabere';
const SENTINEL_PENDING = 'sonuç bekleniyor';

type Outcome = 'win' | 'lose' | 'draw' | 'pending';

const deriveOutcome = (winner: string, currentUsername: string): Outcome => {
  const w = winner.trim().toLowerCase();
  if (!w || w === SENTINEL_DRAW) return 'draw';
  if (w === SENTINEL_PENDING) return 'pending';
  return w === currentUsername.trim().toLowerCase() ? 'win' : 'lose';
};

const SURFACE: Record<Outcome, string> = {
  win: 'bg-riso-spring/20',
  lose: 'bg-riso-redox/10',
  draw: 'bg-riso-mustard/25',
  pending: 'bg-paper-deep',
};

const formatDuration = (ms: number) => {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/** 0'dan hedefe sayan puan göstergesi; reduced-motion'da direkt final değer. */
const AnimatedPoints: React.FC<{ value: number }> = ({ value }) => {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion || value === 0) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduceMotion]);

  return (
    <span className="font-riso-mono text-2xl font-bold text-carbon tabular-nums">
      {display > 0 ? `+${display}` : display}
    </span>
  );
};

const StatChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <span className="inline-flex items-center gap-1.5 border-2 border-carbon bg-paper px-2 py-0.5 font-riso-mono text-xs text-carbon">
    <span className="uppercase tracking-wider text-carbon-muted">{label}</span>
    <span className="font-bold">{value}</span>
  </span>
);

export const MatchResultCard: React.FC<MatchResultCardProps> = ({
  winner,
  earnedPoints,
  stats,
  currentUsername,
  onDismiss,
  dismissing,
}) => {
  const reduceMotion = useReducedMotion();
  const outcome = deriveOutcome(winner, currentUsername);

  const title =
    outcome === 'win'
      ? 'KAZANDIN'
      : outcome === 'draw'
        ? 'BERABERE'
        : outcome === 'pending'
          ? 'SONUÇ BEKLENİYOR'
          : `${winner} kazandı`;

  const chips: Array<{ label: string; value: string }> = [];
  if (stats) {
    if (typeof stats.playerScore === 'number' && typeof stats.opponentScore === 'number') {
      chips.push({ label: 'Skor', value: `${stats.playerScore}–${stats.opponentScore}` });
    }
    if (stats.kind === 'quiz' && typeof stats.maxRounds === 'number') {
      chips.push({ label: 'Soru', value: String(stats.maxRounds) });
    }
    if (stats.kind === 'chess' && typeof stats.moveCount === 'number') {
      chips.push({ label: 'Hamle', value: String(stats.moveCount) });
    }
    if (typeof stats.durationMs === 'number' && stats.durationMs > 0) {
      chips.push({ label: 'Süre', value: formatDuration(stats.durationMs) });
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={reduceMotion ? reducedFade : popIn}
      className={`mb-6 border-2 border-carbon p-4 riso-shadow-md riso-halftone -rotate-[0.4deg] ${SURFACE[outcome]}`}
      data-testid="match-result-card"
    >
      <p className="text-sm font-riso-mono uppercase tracking-wider text-carbon">Maç Sonucu</p>
      <p className="riso-squiggle mt-1 inline-block font-riso-display text-2xl font-bold text-carbon">
        {title}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="text-sm text-carbon-muted">Puan etkisi:</span>
        <AnimatedPoints value={earnedPoints} />
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <StatChip key={chip.label} label={chip.label} value={chip.value} />
          ))}
        </div>
      )}

      <div className="mt-4">
        <RetroButton onClick={onDismiss} variant="primary" disabled={dismissing}>
          {dismissing ? 'Lobiye dönülüyor...' : 'Sonucu gördüm, lobiye dön'}
        </RetroButton>
      </div>
    </motion.div>
  );
};

export default MatchResultCard;
