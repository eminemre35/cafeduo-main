import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, RadioTower, Target, Trophy } from 'lucide-react';
import { User } from '../types';
import { RetroButton } from './RetroButton';
import { playGameSfx } from '../lib/gameAudio';
import { ConnectionOverlay } from './ConnectionOverlay';
import { useLiveScoreGame } from '../hooks/useLiveScoreGame';

interface ArenaBattleProps {
  currentUser: User;
  gameId: string | number | null;
  opponentName?: string;
  isBot: boolean;
  onGameEnd: (winner: string, points: number) => void;
  onLeave: () => void;
}

interface ArenaWindow extends Window {
  render_game_to_text?: () => string;
}

export const AIM_GAME_TYPE = 'Nişancı Düellosu';
const MAX_ROUNDS = 5;
const GAUGE_STEP = 4;
const GAUGE_TICK_MS = 46;

export const clampGauge = (value: number) => Math.max(0, Math.min(100, value));

export const pointsFromShot = (shot: number): number => {
  const distance = Math.abs(50 - clampGauge(shot));
  if (distance <= 4) return 3;
  if (distance <= 10) return 2;
  if (distance <= 18) return 1;
  return 0;
};

export const shotLabel = (shot: number): string => {
  const points = pointsFromShot(shot);
  if (points === 3) return 'Mükemmel kilit';
  if (points === 2) return 'Temiz isabet';
  if (points === 1) return 'Sınırda temas';
  return 'Iska';
};

const randomGaugeStart = () => 15 + Math.random() * 70;

export const ArenaBattle: React.FC<ArenaBattleProps> = ({
  currentUser,
  gameId,
  opponentName,
  isBot,
  onGameEnd,
  onLeave,
}) => {
  const live = useLiveScoreGame({
    currentUser,
    gameId,
    isBot,
    mode: AIM_GAME_TYPE,
    submissionKeyPrefix: 'arena',
    pollIntervalMs: 2200,
    logName: 'ArenaBattle',
    onGameEnd,
  });

  const [round, setRound] = useState(1);
  const [gauge, setGauge] = useState(50);
  const [roundLocked, setRoundLocked] = useState(false);
  const [playerShot, setPlayerShot] = useState<number | null>(null);
  const [opponentShot, setOpponentShot] = useState<number | null>(null);
  const [message, setMessage] = useState('Nişangah merkezden geçerken ateş et.');

  const directionRef = useRef<1 | -1>(1);
  const nextRoundTimeoutRef = useRef<number | null>(null);

  const target = useMemo(() => (isBot ? 'BOT' : opponentName || 'Rakip'), [isBot, opponentName]);

  useEffect(() => {
    setRound(1);
    setRoundLocked(false);
    setPlayerShot(null);
    setOpponentShot(null);
    setMessage('Nişangah merkezden geçerken ateş et.');
  }, [gameId]);

  useEffect(() => {
    setRoundLocked(false);
    setPlayerShot(null);
    setOpponentShot(null);
    directionRef.current = Math.random() > 0.5 ? 1 : -1;
    setGauge(randomGaugeStart());
  }, [round]);

  useEffect(() => {
    if (live.done || live.resolvingMatch) return undefined;
    const interval = window.setInterval(() => {
      setGauge((prev) => {
        let next = prev + directionRef.current * GAUGE_STEP;
        if (next >= 100) {
          next = 100;
          directionRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          directionRef.current = 1;
        }
        return next;
      });
    }, GAUGE_TICK_MS);

    return () => window.clearInterval(interval);
  }, [live.done, live.resolvingMatch, round]);

  // Surface a friendly status message when the snapshot tells us who joined.
  useEffect(() => {
    if (isBot || !gameId) return;
    if (live.guestName || live.hostName) {
      setMessage(`Canlı eşleşme aktif. Rakip: ${live.guestName || live.hostName || target}`);
    }
  }, [isBot, gameId, live.guestName, live.hostName, target]);

  // Track server round to keep local UI in sync with multiplayer state.
  useEffect(() => {
    if (live.serverRound !== null) {
      setRound((prev) => Math.max(prev, Math.min(MAX_ROUNDS, live.serverRound!)));
    }
  }, [live.serverRound]);

  useEffect(() => {
    const arenaWindow = window as ArenaWindow;
    const renderGameToText = () =>
      JSON.stringify({
        mode: live.done ? 'finished' : 'playing',
        gameType: AIM_GAME_TYPE,
        round,
        maxRounds: MAX_ROUNDS,
        player: { name: currentUser.username, score: live.playerScore, lastShot: playerShot },
        opponent: { name: target, score: live.opponentScore, lastShot: opponentShot },
        gauge: Math.round(gauge),
        message,
      });
    arenaWindow.render_game_to_text = renderGameToText;
    return () => {
      if (arenaWindow.render_game_to_text === renderGameToText) {
        delete arenaWindow.render_game_to_text;
      }
    };
  }, [
    currentUser.username,
    gauge,
    live.done,
    live.opponentScore,
    live.playerScore,
    message,
    opponentShot,
    playerShot,
    round,
    target,
  ]);

  useEffect(
    () => () => {
      if (nextRoundTimeoutRef.current) {
        window.clearTimeout(nextRoundTimeoutRef.current);
      }
    },
    []
  );

  const fire = () => {
    if (live.done || live.resolvingMatch || roundLocked) return;
    setRoundLocked(true);

    const shot = clampGauge(gauge);
    const gainedPoints = pointsFromShot(shot);
    const nextPlayerScore = live.playerScore + gainedPoints;
    let nextOpponentScore = live.opponentScore;

    setPlayerShot(shot);
    live.setPlayerScore(nextPlayerScore);
    playGameSfx(gainedPoints > 0 ? 'success' : 'fail', gainedPoints > 0 ? 0.24 : 0.2);

    if (isBot) {
      const botShot = clampGauge(50 + (Math.random() * 2 - 1) * 42);
      const botPoints = pointsFromShot(botShot);
      nextOpponentScore += botPoints;
      setOpponentShot(botShot);
      live.setOpponentScore(nextOpponentScore);
      setMessage(
        `Atışın: ${shotLabel(shot)} (${gainedPoints}). BOT: ${shotLabel(botShot)} (${botPoints}).`
      );
    } else {
      setMessage(`Atışın: ${shotLabel(shot)} (${gainedPoints}). Rakip güncellemesi bekleniyor...`);
    }

    const isLastRound = round >= MAX_ROUNDS;
    void live.syncLiveProgress(nextPlayerScore, round, isLastRound);

    if (isLastRound) {
      live.setDone(true);
      const localWinner = isBot
        ? nextPlayerScore >= nextOpponentScore
          ? currentUser.username
          : 'BOT'
        : currentUser.username;
      setMessage(
        isBot
          ? nextPlayerScore >= nextOpponentScore
            ? 'Maçı kazandın.'
            : 'Maçı rakip aldı.'
          : 'Skorun kaydedildi. Rakip sonucu bekleniyor...'
      );
      void live.finalizeMatch(localWinner, nextPlayerScore);
      return;
    }

    nextRoundTimeoutRef.current = window.setTimeout(() => {
      setRound((prev) => prev + 1);
      setMessage('Yeni tur başladı. Merkezi yakalamak için doğru anı bekle.');
      playGameSfx('select', 0.18);
    }, 750);
  };

  const canFire = !live.done && !live.resolvingMatch && !roundLocked;
  const accuracy = Math.max(0, 100 - Math.abs(50 - gauge) * 2);
  const participants =
    live.hostName || live.guestName
      ? `${live.hostName || currentUser.username} / ${live.guestName || target}`
      : `${currentUser.username} / ${target}`;

  return (
    <div
      className="cd-game-stage cd-pixel-panel mx-auto max-w-3xl p-4 sm:p-6 text-white"
      data-testid="arena-battle"
    >
      <ConnectionOverlay gameId={gameId} />
      <div className="relative z-10">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[rgba(16,231,255,0.2)] pb-4">
          <div>
            <p className="cd-system-label text-[#10E7FF]">LIVE TARGET LOCK</p>
            <h2 className="font-display text-2xl text-white sm:text-4xl">{AIM_GAME_TYPE}</h2>
            <p className="mt-2 text-xs text-[#A5ADB8] sm:text-sm">{participants}</p>
          </div>
          <button onClick={onLeave} className="cd-icon-button text-[#A5ADB8] hover:text-white">
            Oyundan Çık
          </button>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3 text-center">
          <div className="cd-stat-tile">
            <Target size={18} />
            <span>Tur</span>
            <strong>
              {Math.min(round, MAX_ROUNDS)} / {MAX_ROUNDS}
            </strong>
          </div>
          <div className="cd-stat-tile border-[#10E7FF]/45">
            <Trophy size={18} />
            <span>Sen</span>
            <strong>{live.playerScore}</strong>
          </div>
          <div className="cd-stat-tile border-[#FF3045]/45">
            <RadioTower size={18} />
            <span>Rakip</span>
            <strong>{live.opponentScore}</strong>
          </div>
        </div>

        <div className="cd-reticle-stage mb-5">
          <div className="cd-reticle-grid" />
          <div className="cd-reticle-center" />
          <div
            className="cd-reticle-sight"
            style={{ left: `${gauge}%` }}
            data-testid="arena-reticle"
          >
            <Crosshair size={42} />
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-[#A5ADB8]">
            <span>0</span>
            <span className="text-[#39FF6A]">MERKEZ 50</span>
            <span>100</span>
          </div>
        </div>

        <div className="mb-5 cd-pixel-panel-muted p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="cd-system-label text-[#10E7FF]">Nişan Kilidi</span>
            <span className="text-[#FFD338]">
              {Math.round(gauge)}% / isabet {Math.round(accuracy)}%
            </span>
          </div>
          <div className="cd-progress-track">
            <div className="cd-progress-fill" style={{ width: `${accuracy}%` }} />
          </div>
          <p className="mt-3 text-sm text-[#A5ADB8]">{message}</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 text-xs">
          <div className="cd-pixel-panel-muted p-3">
            <div className="text-[#A5ADB8]">Son Atışın</div>
            <div className="mt-1 font-bold text-white">
              {playerShot === null ? '-' : `${Math.round(playerShot)}% - ${shotLabel(playerShot)}`}
            </div>
          </div>
          <div className="cd-pixel-panel-muted p-3">
            <div className="text-[#A5ADB8]">Rakip Atışı</div>
            <div className="mt-1 font-bold text-white">
              {opponentShot === null
                ? '-'
                : `${Math.round(opponentShot)}% - ${shotLabel(opponentShot)}`}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <RetroButton
            onClick={fire}
            disabled={!canFire}
            data-testid="arena-fire-button"
            className="flex-1"
          >
            ATEŞ ET
          </RetroButton>
          {live.done && (
            <RetroButton onClick={onLeave} variant="secondary" className="flex-1">
              Lobiye Dön
            </RetroButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArenaBattle;
