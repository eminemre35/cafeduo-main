import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User } from '../types';
import { RetroButton } from './RetroButton';
import { GAME_ASSETS } from '../lib/gameAssets';
import { playGameSfx } from '../lib/gameAudio';
import { ConnectionOverlay } from './ConnectionOverlay';
import { buildQuizRoundSet } from '../lib/knowledgeQuizQuestions';
import { useLiveScoreGame } from '../hooks/useLiveScoreGame';
import { QuizStageCanvas, type QuizStageHandle } from './games/QuizStageCanvas';

interface KnowledgeQuizProps {
  currentUser: User;
  gameId: string | number | null;
  opponentName?: string;
  isBot: boolean;
  onGameEnd: (winner: string, points: number) => void;
  onLeave: () => void;
}

const QUIZ_ROUND_COUNT = 10;
const QUIZ_GAME_TYPE = 'Bilgi Yarışı';
const FINALIZATION_FALLBACK_MS = 10_000;

export const KnowledgeQuiz: React.FC<KnowledgeQuizProps> = ({
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
    mode: QUIZ_GAME_TYPE,
    submissionKeyPrefix: 'quiz',
    pollIntervalMs: 15_000,
    finalizationTimeoutMs: FINALIZATION_FALLBACK_MS,
    logName: 'KnowledgeQuiz',
    onGameEnd,
  });

  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [message, setMessage] = useState('Soruları hızlı ve doğru yanıtla. En yüksek net kazanır.');
  const [feedbackAnimation, setFeedbackAnimation] = useState<'correct' | 'incorrect' | null>(null);
  const [scoreAnimation, setScoreAnimation] = useState<'player' | 'opponent' | null>(null);
  const [floatingScore, setFloatingScore] = useState<string | null>(null);

  const advanceTimerRef = useRef<number | null>(null);
  const quizStageRef = useRef<QuizStageHandle | null>(null);

  const fallbackQuestion = useMemo(
    () => ({
      question: 'Soru yüklenemedi. Lütfen tekrar deneyin.',
      options: ['Seçenek A', 'Seçenek B', 'Seçenek C', 'Seçenek D'] as [
        string,
        string,
        string,
        string,
      ],
      answerIndex: 0,
    }),
    []
  );
  const quizQuestions = useMemo(
    () =>
      buildQuizRoundSet(
        `${String(gameId || 'local')}:${String(currentUser.username || '')}`,
        QUIZ_ROUND_COUNT
      ),
    [currentUser.username, gameId]
  );
  const maxRounds = quizQuestions.length;
  const currentQuestion =
    quizQuestions[Math.min(roundIndex, Math.max(0, maxRounds - 1))] || fallbackQuestion;
  const targetName = isBot ? 'BOT' : opponentName || 'Rakip';

  // Reset local game state when a new match starts.
  useEffect(() => {
    setRoundIndex(0);
    setSelectedOption(null);
    setMessage('Soruları hızlı ve doğru yanıtla. En yüksek net kazanır.');
  }, [gameId]);

  // Update status message when opponent name arrives via snapshot.
  useEffect(() => {
    if (isBot || !gameId) return;
    if (live.guestName || live.hostName) {
      setMessage(`Canlı senkron aktif. Rakip: ${live.guestName || live.hostName || targetName}`);
    }
  }, [isBot, gameId, live.guestName, live.hostName, targetName]);

  // Reflect server-side finish (set a friendly message; hook already calls onGameEnd).
  useEffect(() => {
    if (!live.done) return;
    setMessage((prev) =>
      prev.startsWith('Tur tamamlandı') || prev.startsWith('Skorun kaydedildi') ? prev : prev
    );
  }, [live.done]);

  useEffect(
    () => () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
      }
    },
    []
  );

  // Pause the PixiJS overlay's animation loop once the match is over so we're
  // not burning frames while the user reads the result.
  useEffect(() => {
    quizStageRef.current?.setActive(!live.done);
  }, [live.done]);

  const handleAnswer = (optionIndex: number) => {
    if (live.done || live.resolvingMatch || selectedOption !== null || !currentQuestion) return;

    const isCorrect = optionIndex === currentQuestion.answerIndex;
    const rivalCorrect = isBot ? Math.random() < 0.55 : false;
    const nextPlayerScore = live.playerScore + (isCorrect ? 1 : 0);
    const nextOpponentScore = live.opponentScore + (rivalCorrect ? 1 : 0);

    setSelectedOption(optionIndex);

    setFeedbackAnimation(isCorrect ? 'correct' : 'incorrect');
    window.setTimeout(() => setFeedbackAnimation(null), 600);

    // PixiJS particle layer on top of the CSS feedback — enriches, doesn't replace.
    if (isCorrect) quizStageRef.current?.playCorrect();
    else quizStageRef.current?.playWrong();

    setScoreAnimation(isCorrect ? 'player' : 'opponent');
    window.setTimeout(() => setScoreAnimation(null), 400);

    if (isCorrect) {
      setFloatingScore('+1');
      window.setTimeout(() => setFloatingScore(null), 800);
    } else {
      setFloatingScore('✕');
      window.setTimeout(() => setFloatingScore(null), 600);
    }

    live.setPlayerScore(nextPlayerScore);
    live.setOpponentScore(nextOpponentScore);
    setMessage(
      isCorrect
        ? 'Doğru cevap, puanı aldın.'
        : isBot
          ? 'Yanlış cevap, tur rakibe kaydı.'
          : 'Yanlış cevap. Rakip sonucu bekleniyor.'
    );
    playGameSfx(isCorrect ? 'success' : 'fail', isCorrect ? 0.3 : 0.22);

    const isLastRound = roundIndex >= maxRounds - 1;
    void live.syncLiveProgress(nextPlayerScore, roundIndex + 1, isLastRound);

    if (isLastRound) {
      live.setDone(true);
      // Big multi-color celebration on the last answer (mirrors checkmate energy).
      quizStageRef.current?.playFinale();
      if (isBot || !gameId) {
        const localWinner =
          nextPlayerScore >= nextOpponentScore ? currentUser.username : targetName;
        void live.finalizeMatch(localWinner, nextPlayerScore);
        return;
      }
      // Multiplayer: wait for the server to confirm the winner via socket/poll.
      // useLiveScoreGame's finalizationTimeoutMs (10s) acts as a fallback.
      setMessage('Tur tamamlandı. Sunucu sonucu kesinleştiriyor...');
      return;
    }

    advanceTimerRef.current = window.setTimeout(() => {
      setRoundIndex((prev) => prev + 1);
      setSelectedOption(null);
      setMessage('Yeni soru hazır. Hızlı karar ver.');
      playGameSfx('select', 0.18);
    }, 700);
  };

  return (
    <>
      <ConnectionOverlay gameId={gameId} />
      <div
        className="max-w-2xl mx-auto rf-screen-card noise-bg p-4 sm:p-6 text-white relative overflow-hidden"
        data-testid="knowledge-quiz"
        style={{
          backgroundImage: `linear-gradient(165deg, rgba(4, 17, 41, 0.92), rgba(2, 28, 52, 0.9)), url('${GAME_ASSETS.backgrounds.knowledgeQuiz}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_95%,rgba(34,211,238,0.09)_100%)] [background-size:100%_4px] opacity-60" />
        <div className="relative z-10">
          <div className="rf-terminal-strip mb-2">Sistem TR-X // Bilgi Tarayıcı</div>
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-[0.08em] leading-none">
              {QUIZ_GAME_TYPE}
            </h2>
            <button
              onClick={onLeave}
              className="shrink-0 px-3 py-2 border border-rose-400/45 bg-rose-500/12 text-rose-200 hover:bg-rose-500/24 transition-colors text-xs uppercase tracking-[0.16em]"
            >
              Oyundan Çık
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mb-5 text-center">
            <div className="rf-screen-card-muted p-3">
              <div className="text-xs text-[var(--rf-muted)] mb-1">Tur</div>
              <div className="font-bold text-cyan-100">
                {Math.min(roundIndex + 1, maxRounds)} / {maxRounds}
              </div>
              <div className="mt-2 h-1.5 bg-[#0a1f3a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-cyan-300 transition-all duration-500 ease-out"
                  style={{ width: `${((roundIndex + 1) / maxRounds) * 100}%` }}
                />
              </div>
            </div>
            <div
              className={`rf-screen-card-muted p-3 transition-all duration-300 ${scoreAnimation === 'player' ? 'animate-score-pop' : ''}`}
            >
              <div className="text-xs text-[var(--rf-muted)]">Sen</div>
              <div className="font-bold text-cyan-100">{live.playerScore}</div>
            </div>
            <div
              className={`rf-screen-card-muted p-3 transition-all duration-300 ${scoreAnimation === 'opponent' ? 'animate-score-pop' : ''}`}
            >
              <div className="text-xs text-[var(--rf-muted)]">Rakip</div>
              <div className="font-bold text-cyan-100">{live.opponentScore}</div>
            </div>
          </div>

          <p className="text-sm text-[var(--rf-muted)] mb-4 pl-3 border-l-2 border-cyan-400/55 min-h-[2rem] flex items-center">
            {message}
          </p>

          <div
            className={`rf-screen-card-muted p-4 transition-all duration-300 relative overflow-hidden ${feedbackAnimation === 'correct' ? 'animate-flash-green animate-glow-pulse' : feedbackAnimation === 'incorrect' ? 'animate-flash-red animate-shake' : ''}`}
          >
            {/* PixiJS overlay — sits above floatingScore (z-30 vs z-20) so confetti
                renders ON TOP of the "+1" / "✕" text. CSS feedback (border/shadow
                on the option button + flash on this card) stays intact below. */}
            <QuizStageCanvas
              ref={quizStageRef}
              className="pointer-events-none absolute inset-0 z-30 h-full w-full"
            />
            {floatingScore && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <span
                  className={`text-6xl font-bold animate-float-up ${floatingScore === '+1' ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.6)]' : 'text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]'}`}
                >
                  {floatingScore}
                </span>
              </div>
            )}
            <p
              data-testid="knowledge-question"
              className="text-base md:text-lg font-semibold text-white leading-relaxed mb-4"
            >
              {currentQuestion.question}
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {currentQuestion.options.map((option, idx) => {
                const isPicked = selectedOption === idx;
                const isCorrect = idx === currentQuestion.answerIndex;
                const stateClass =
                  selectedOption === null
                    ? 'border-cyan-400/25 hover:border-cyan-300/45 bg-[#102348]/70 hover:bg-[#15305f]/70 hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(34,211,238,0.15)]'
                    : isPicked && isCorrect
                      ? 'border-emerald-400/60 bg-emerald-500/25 shadow-[0_0_20px_rgba(52,211,153,0.3)] scale-[1.02]'
                      : isPicked
                        ? 'border-rose-400/60 bg-rose-500/25 shadow-[0_0_20px_rgba(244,63,94,0.3)] scale-[1.02]'
                        : isCorrect
                          ? 'border-emerald-400/40 bg-emerald-500/15'
                          : 'border-cyan-400/20 bg-[#0d1f40]/55 opacity-60';
                const leftBorderClass =
                  selectedOption === null
                    ? 'hover:border-l-4'
                    : isPicked && isCorrect
                      ? 'border-l-4 border-l-emerald-400'
                      : isPicked
                        ? 'border-l-4 border-l-rose-400'
                        : isCorrect
                          ? 'border-l-4 border-l-emerald-400/50'
                          : '';
                return (
                  <button
                    key={`${roundIndex}-${idx}`}
                    data-testid={`knowledge-option-${idx}`}
                    onClick={() => handleAnswer(idx)}
                    disabled={selectedOption !== null || live.done || live.resolvingMatch}
                    className={`text-left border px-3.5 py-3 transition-all duration-200 ${stateClass} ${leftBorderClass}`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${
                        selectedOption === null
                          ? 'bg-cyan-400/20 text-cyan-300'
                          : isPicked && isCorrect
                            ? 'bg-emerald-400 text-white'
                            : isPicked
                              ? 'bg-rose-400 text-white'
                              : isCorrect
                                ? 'bg-emerald-400/30 text-emerald-300'
                                : 'bg-cyan-400/10 text-cyan-300/50'
                      }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {live.done && (
            <div className="mt-4">
              <RetroButton onClick={onLeave}>Lobiye Dön</RetroButton>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
