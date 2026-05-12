/**
 * QuizStageCanvas
 *
 * React wrapper around the PixiJS quiz stage. Mounts an absolutely-positioned
 * canvas overlaid on the question card and exposes an imperative ref so the
 * parent (KnowledgeQuiz.tsx) can fire correct/wrong/finale bursts without
 * forcing React re-renders during animation.
 *
 * Init failure is non-fatal (WebGL-less browsers, jsdom tests): the canvas
 * stays blank and the existing CSS `animate-flash-green/red` feedback
 * remains the visible primary signal.
 */

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { QuizStage } from '../../lib/pixi/quizStage';

export interface QuizStageHandle {
  playCorrect: () => void;
  playWrong: () => void;
  playFinale: () => void;
  setActive: (active: boolean) => void;
}

interface QuizStageCanvasProps {
  className?: string;
}

interface QueuedOps {
  correct?: boolean;
  wrong?: boolean;
  finale?: boolean;
}

export const QuizStageCanvas = forwardRef<QuizStageHandle, QuizStageCanvasProps>(
  function QuizStageCanvas({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const stageRef = useRef<QuizStage | null>(null);
    const queuedRef = useRef<QueuedOps>({});

    useImperativeHandle(
      ref,
      () => ({
        playCorrect: () => {
          if (stageRef.current) stageRef.current.playCorrect();
          else queuedRef.current.correct = true;
        },
        playWrong: () => {
          if (stageRef.current) stageRef.current.playWrong();
          else queuedRef.current.wrong = true;
        },
        playFinale: () => {
          if (stageRef.current) stageRef.current.playFinale();
          else queuedRef.current.finale = true;
        },
        setActive: (active: boolean) => {
          if (stageRef.current) stageRef.current.setActive(active);
        },
      }),
      []
    );

    useEffect(() => {
      let cancelled = false;
      const canvas = canvasRef.current;
      if (!canvas) return;

      void import('../../lib/pixi/quizStage')
        .then(({ createQuizStage }) => {
          if (cancelled) return undefined;
          return createQuizStage(canvas);
        })
        .then((stage) => {
          if (!stage) return;
          if (cancelled) {
            stage.destroy();
            return;
          }
          stageRef.current = stage;
          // Flush any imperative calls queued during async init
          const q = queuedRef.current;
          if (q.correct) stage.playCorrect();
          if (q.wrong) stage.playWrong();
          if (q.finale) stage.playFinale();
          queuedRef.current = {};
        })
        .catch((err) => {
          console.warn('QuizStage init failed; quiz continues without overlay.', err);
        });

      return () => {
        cancelled = true;
        if (stageRef.current) {
          stageRef.current.destroy();
          stageRef.current = null;
        }
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        data-testid="quiz-pixi-canvas"
        aria-hidden="true"
      />
    );
  }
);
