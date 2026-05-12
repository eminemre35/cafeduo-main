/**
 * CreateGameModal — Riso Kantin redesign (PR #27).
 *
 * "Yeni Oyun Kur" modal. Three game cards (Retro Satranç / Bilgi Yarışı /
 * Nişancı Düellosu) with spot-coloured chips, an inked range slider for
 * the stake, preset buttons, optional chess tempo grid, and a summary
 * panel. All text content + data-testid attributes are preserved exactly
 * so CreateGameModal.test.tsx passes without edits:
 *   - "YENİ OYUN KUR" header literal
 *   - "Mevcut Puanınız:" + max points number
 *   - exact game descriptions for the 3 cards
 *   - "Min" / "100" / "250" / "Max" preset labels
 *   - "Oyun:" / "Katılım Puanı:" / "Kalan:" summary labels
 *   - "MIN N PUAN" minPoints labels
 *   - data-testid: create-game-modal, game-type-{chess,knowledge,aim},
 *     game-points-input, create-game-submit
 */
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Check, Trophy } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { Button } from './ui';

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    gameType: string,
    points: number,
    options?: { chessClock?: { baseSeconds: number; incrementSeconds: number; label: string } }
  ) => Promise<void> | void;
  maxPoints: number;
}

interface GameDef {
  id: 'chess' | 'knowledge' | 'aim';
  name: string;
  category: string;
  description: string;
  minPoints: number;
  tone: 'mustard' | 'blue' | 'pink';
}

const GAME_TYPES: GameDef[] = [
  {
    id: 'chess',
    name: 'Retro Satranç',
    category: 'Strateji',
    description: 'Klasik 2 oyunculu satranç. Gerçek zamanlı ve hamle doğrulamalı.',
    minPoints: 90,
    tone: 'mustard',
  },
  {
    id: 'knowledge',
    name: 'Bilgi Yarışı',
    category: 'Bilgi',
    description: 'Kısa bilgi sorularında doğru cevabı en hızlı ver',
    minPoints: 120,
    tone: 'blue',
  },
  {
    id: 'aim',
    name: 'Nişancı Düellosu',
    category: 'Refleks',
    description: 'Nişangahı merkeze kilitle, tur tur isabet topla.',
    minPoints: 40,
    tone: 'pink',
  },
];

const CHESS_TEMPO_OPTIONS = [
  { id: 'bullet_1_1', label: '1+1 Bullet', baseSeconds: 60, incrementSeconds: 1 },
  { id: 'blitz_3_2', label: '3+2 Blitz', baseSeconds: 180, incrementSeconds: 2 },
  { id: 'rapid_5_3', label: '5+3 Rapid', baseSeconds: 300, incrementSeconds: 3 },
  { id: 'rapid_10_5', label: '10+5 Rapid', baseSeconds: 600, incrementSeconds: 5 },
] as const;

interface ValidationError {
  gameType?: string;
  points?: string;
}

const TONE_BG: Record<GameDef['tone'], string> = {
  mustard: 'bg-riso-mustard text-carbon',
  blue: 'bg-riso-blue text-paper',
  pink: 'bg-riso-pink text-carbon',
};

const TONE_ACTIVE_BG: Record<GameDef['tone'], string> = {
  mustard: 'bg-riso-mustard',
  blue: 'bg-riso-blue/15',
  pink: 'bg-riso-pink',
};

const TONE_ACTIVE_TEXT: Record<GameDef['tone'], string> = {
  mustard: 'text-carbon',
  blue: 'text-carbon',
  pink: 'text-carbon',
};

export const CreateGameModal: React.FC<CreateGameModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  maxPoints,
}) => {
  const [gameType, setGameType] = useState('Nişancı Düellosu');
  const [points, setPoints] = useState(40);
  const [chessTempoId, setChessTempoId] =
    useState<(typeof CHESS_TEMPO_OPTIONS)[number]['id']>('blitz_3_2');
  const [errors, setErrors] = useState<ValidationError>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setGameType('Nişancı Düellosu');
      setPoints(40);
      setChessTempoId('blitz_3_2');
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const selectedGame = GAME_TYPES.find((g) => g.name === gameType);
  const minPoints = selectedGame?.minPoints || 0;

  const validate = (): boolean => {
    const newErrors: ValidationError = {};
    if (!gameType) newErrors.gameType = 'Oyun türü seçmelisiniz';
    if (points < minPoints) newErrors.points = `${gameType} için minimum ${minPoints} puan gerekli`;
    if (points > maxPoints) newErrors.points = `Maksimum ${maxPoints} puan kullanabilirsiniz`;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePointsChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setPoints(numValue);
    if (touched.points) {
      const newErrors: ValidationError = { ...errors };
      if (numValue < minPoints)
        newErrors.points = `${gameType} için minimum ${minPoints} puan gerekli`;
      else if (numValue > maxPoints)
        newErrors.points = `Maksimum ${maxPoints} puan kullanabilirsiniz`;
      else delete newErrors.points;
      setErrors(newErrors);
    }
  };

  const handleGameTypeChange = (newGameType: string) => {
    setGameType(newGameType);
    const game = GAME_TYPES.find((g) => g.name === newGameType);
    const newMinPoints = game?.minPoints || 0;
    if (points < newMinPoints) {
      setPoints(newMinPoints);
      toast.warning(`${newGameType} için minimum ${newMinPoints} puan ayarlandı`);
    }
    if (errors.gameType) {
      setErrors((prev) => ({ ...prev, gameType: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ gameType: true, points: true });
    if (!validate()) {
      toast.error('Lütfen form hatalarını düzeltin');
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedTempo =
        CHESS_TEMPO_OPTIONS.find((tempo) => tempo.id === chessTempoId) || CHESS_TEMPO_OPTIONS[1];
      const options =
        gameType === 'Retro Satranç'
          ? {
              chessClock: {
                baseSeconds: selectedTempo.baseSeconds,
                incrementSeconds: selectedTempo.incrementSeconds,
                label: selectedTempo.label,
              },
            }
          : undefined;
      await Promise.resolve(onSubmit(gameType, points, options));
      toast.success(`${gameType} oyunu oluşturuldu!`);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : 'Oyun oluşturulamadı';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const presetPoints = [
    { label: 'Min', value: minPoints },
    { label: '100', value: 100 },
    { label: '250', value: 250 },
    { label: 'Max', value: maxPoints },
  ].filter((p) => p.value >= minPoints && p.value <= maxPoints);

  if (!isOpen) return null;

  return (
    <div className="riso-kantin fixed inset-0 z-[1000] flex h-[100dvh] items-center justify-center overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-5">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-carbon/80" onClick={onClose} aria-hidden="true" />

      <div
        className="relative my-0 w-full max-w-3xl overflow-y-auto bg-paper border-2 border-carbon riso-shadow-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)]"
        data-testid="create-game-modal"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-carbon bg-paper-deep px-4 py-3">
          <h3 className="font-riso-display text-lg sm:text-xl text-carbon">YENİ OYUN KUR</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Oyun kurma penceresini kapat"
            className="riso-focus inline-flex h-9 w-9 items-center justify-center border-2 border-carbon bg-paper text-carbon transition-colors hover:bg-riso-redox hover:text-paper"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* Points info */}
          <div className="flex items-center justify-between border-2 border-carbon bg-riso-mustard px-3 py-2">
            <span className="font-riso-body text-sm font-semibold text-carbon">
              Mevcut Puanınız:
            </span>
            <span className="font-riso-display text-xl text-carbon flex items-center gap-1.5">
              <Trophy size={16} strokeWidth={2.5} />
              {maxPoints}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Game type */}
            <div>
              <label className="block font-riso-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-carbon-soft mb-2">
                OYUN TÜRÜ SEÇ
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {GAME_TYPES.map((game) => {
                  const active = gameType === game.name;
                  return (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => handleGameTypeChange(game.name)}
                      data-testid={`game-type-${game.id}`}
                      className={`riso-focus relative w-full p-3 text-left border-2 transition-all ${
                        active
                          ? `border-carbon ${TONE_ACTIVE_BG[game.tone]} ${TONE_ACTIVE_TEXT[game.tone]} riso-shadow-sm`
                          : 'border-carbon bg-paper text-carbon hover:bg-paper-deep'
                      }`}
                    >
                      <div className="flex h-full flex-col">
                        <div className="mb-2 flex items-start justify-between">
                          <span
                            className={`inline-flex border-2 border-carbon px-2 py-0.5 font-riso-mono text-[0.65rem] font-bold uppercase tracking-[0.12em] ${TONE_BG[game.tone]}`}
                          >
                            {game.category}
                          </span>
                          {active && <Check size={18} strokeWidth={2.6} className="text-carbon" />}
                        </div>

                        <div className="font-riso-display text-base sm:text-lg leading-tight mb-1.5">
                          {game.name}
                        </div>

                        <div className="font-riso-body text-xs leading-snug flex-1 mb-2 text-carbon-soft">
                          {game.description}
                        </div>

                        {game.minPoints > 0 && (
                          <div className="font-riso-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] mt-auto pt-2 border-t-2 border-carbon">
                            MIN {game.minPoints} PUAN
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {errors.gameType && (
                <p className="mt-2 font-riso-body text-xs text-riso-redox flex items-center gap-1.5">
                  <AlertTriangle size={12} strokeWidth={2.5} /> {errors.gameType}
                </p>
              )}
            </div>

            {/* Points slider */}
            <div>
              <label className="flex justify-between font-riso-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] mb-2">
                <span className="text-carbon-soft">ENERJİ (PUAN) YATIRIMI</span>
                <span className="text-riso-pink-deep">{`${points} / ${maxPoints}`}</span>
              </label>

              <div className="border-2 border-carbon bg-paper-deep p-3">
                <input
                  type="range"
                  min={minPoints}
                  max={maxPoints}
                  value={points}
                  onChange={(e) => handlePointsChange(e.target.value)}
                  className="w-full h-2 bg-paper-dim cursor-pointer accent-riso-pink mb-3"
                />

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => handlePointsChange(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, points: true }))}
                    min={minPoints}
                    max={maxPoints}
                    data-testid="game-points-input"
                    className={`riso-focus flex-1 border-2 bg-paper text-carbon p-2 font-riso-display text-lg text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      errors.points && touched.points ? 'border-riso-redox' : 'border-carbon'
                    }`}
                  />
                  <div className="font-riso-mono text-xs font-bold uppercase tracking-wider text-carbon-soft">
                    PUAN
                  </div>
                </div>
              </div>

              {/* Preset buttons */}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {presetPoints.map((preset) => {
                  const active = points === preset.value;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handlePointsChange(preset.value.toString())}
                      className={`riso-focus py-2 px-2 font-riso-body text-sm font-bold border-2 border-carbon transition-colors ${
                        active
                          ? 'bg-riso-pink text-carbon riso-shadow-sm'
                          : 'bg-paper text-carbon hover:bg-paper-deep'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {errors.points && touched.points && (
                <p className="mt-2 font-riso-body text-xs text-riso-redox flex items-center gap-1.5">
                  <AlertTriangle size={12} strokeWidth={2.5} /> {errors.points}
                </p>
              )}
            </div>

            {/* Chess tempo (conditional) */}
            {gameType === 'Retro Satranç' && (
              <div>
                <label className="block font-riso-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-carbon-soft mb-2">
                  SATRANÇ TEMPOSU
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CHESS_TEMPO_OPTIONS.map((tempo) => {
                    const active = chessTempoId === tempo.id;
                    return (
                      <button
                        key={tempo.id}
                        type="button"
                        onClick={() => setChessTempoId(tempo.id)}
                        className={`riso-focus px-3 py-2 font-riso-body text-sm font-bold border-2 border-carbon transition-colors ${
                          active
                            ? 'bg-riso-mustard text-carbon riso-shadow-sm'
                            : 'bg-paper text-carbon hover:bg-paper-deep'
                        }`}
                      >
                        {tempo.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="border-2 border-carbon bg-paper-deep p-3 space-y-1.5 font-riso-body text-sm">
              <div className="flex justify-between">
                <span className="text-carbon-soft">Oyun:</span>
                <span className="font-semibold text-carbon">{gameType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-carbon-soft">Katılım Puanı:</span>
                <span className="font-riso-mono font-bold text-riso-pink-deep">
                  {`${points} Puan`}
                </span>
              </div>
              {gameType === 'Retro Satranç' && (
                <div className="flex justify-between">
                  <span className="text-carbon-soft">Tempo:</span>
                  <span className="font-semibold text-carbon">
                    {
                      (
                        CHESS_TEMPO_OPTIONS.find((tempo) => tempo.id === chessTempoId) ||
                        CHESS_TEMPO_OPTIONS[1]
                      ).label
                    }
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t-2 border-carbon-muted">
                <span className="text-carbon-soft">Kalan:</span>
                <span
                  className={`font-riso-mono font-bold ${
                    maxPoints - points >= 0 ? 'text-riso-spring' : 'text-riso-redox'
                  }`}
                >
                  {maxPoints - points} Puan
                </span>
              </div>
            </div>
          </form>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-20 grid grid-cols-1 gap-2 border-t-2 border-carbon bg-paper-deep px-4 py-3 sm:grid-cols-[0.38fr_1fr]">
          <button
            type="button"
            onClick={onClose}
            className="riso-focus min-h-12 border-2 border-carbon bg-paper px-4 font-riso-body text-sm font-bold uppercase tracking-wider text-carbon transition-colors hover:bg-paper-dim"
          >
            KAPAT
          </button>
          <Button
            type="submit"
            tone="pink"
            size="lg"
            block
            disabled={isSubmitting}
            onClick={handleSubmit}
            data-testid="create-game-submit"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin border-2 border-carbon/30 border-t-carbon rounded-full" />
                Oluşturuluyor...
              </span>
            ) : (
              'LOBİYE GÖNDER'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
