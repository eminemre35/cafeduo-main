/**
 * AimBattleStageCanvas
 *
 * React wrapper around the PixiJS aim battle stage. Mounts a canvas, owns
 * the async stage lifecycle, and forwards an imperative ref so the parent
 * (ArenaBattle.tsx) can drive reticle position + hit/miss feedback without
 * triggering React re-renders per frame.
 *
 * Stage failures are non-fatal: if WebGL is unavailable (e.g. test env,
 * locked-down kiosk browser) the canvas just stays blank. The CSS-based
 * background of ArenaBattle's existing wrapper still provides the visual
 * frame, so the game remains playable.
 */

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { AimBattleStage, HitTier } from '../../lib/pixi/aimBattleStage';

export interface AimBattleStageHandle {
  setReticleX: (percent: number) => void;
  flash: (tier: HitTier) => void;
  showScorePopup: (label: string, tier: HitTier) => void;
  setActive: (active: boolean) => void;
}

interface AimBattleStageCanvasProps {
  className?: string;
}

export const AimBattleStageCanvas = forwardRef<AimBattleStageHandle, AimBattleStageCanvasProps>(
  function AimBattleStageCanvas({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const stageRef = useRef<AimBattleStage | null>(null);
    const queuedRef = useRef<{ x?: number; flash?: HitTier; popup?: [string, HitTier] }>({});

    useImperativeHandle(
      ref,
      () => ({
        setReticleX: (percent: number) => {
          if (stageRef.current) stageRef.current.setReticleX(percent);
          else queuedRef.current.x = percent;
        },
        flash: (tier: HitTier) => {
          if (stageRef.current) stageRef.current.flash(tier);
          else queuedRef.current.flash = tier;
        },
        showScorePopup: (label: string, tier: HitTier) => {
          if (stageRef.current) stageRef.current.showScorePopup(label, tier);
          else queuedRef.current.popup = [label, tier];
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

      // Dynamic import so the heavy pixi.js bundle only loads when the
      // game actually mounts, and so tests can swap the module via jest.mock.
      void import('../../lib/pixi/aimBattleStage')
        .then(({ createAimBattleStage }) => {
          if (cancelled) return undefined;
          return createAimBattleStage(canvas);
        })
        .then((stage) => {
          if (!stage) return;
          if (cancelled) {
            stage.destroy();
            return;
          }
          stageRef.current = stage;
          // Flush anything queued before stage came online
          const q = queuedRef.current;
          if (q.x !== undefined) stage.setReticleX(q.x);
          if (q.flash) stage.flash(q.flash);
          if (q.popup) stage.showScorePopup(q.popup[0], q.popup[1]);
          queuedRef.current = {};
        })
        .catch((err) => {
          // Non-fatal — game logic still works without the overlay

          console.warn('AimBattleStage init failed; game continues without overlay.', err);
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
        data-testid="aim-battle-pixi-canvas"
        aria-hidden="true"
      />
    );
  }
);
