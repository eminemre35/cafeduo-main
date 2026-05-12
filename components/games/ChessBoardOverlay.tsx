/**
 * ChessBoardOverlay
 *
 * React wrapper around the PixiJS chess board stage. Mounts an absolutely-
 * positioned canvas that overlays the CSS 8x8 grid, tracks the grid's pixel
 * size via ResizeObserver, and exposes an imperative ref so the parent
 * (RetroChess.tsx) can trigger capture/check/checkmate effects without
 * forcing React re-renders on the animation layer.
 *
 * Init failure is non-fatal (WebGL-less browsers, jsdom tests) — the canvas
 * stays blank and game logic continues unaffected via the underlying CSS
 * styling.
 */

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { ChessBoardStage, Orientation } from '../../lib/pixi/chessBoardStage';

export interface ChessBoardOverlayHandle {
  setOrientation: (o: Orientation) => void;
  setLastMove: (from: string | null, to: string | null) => void;
  setCheckSquare: (square: string | null) => void;
  playCapture: (square: string) => void;
  playCheckmate: (square: string) => void;
  setActive: (active: boolean) => void;
}

interface ChessBoardOverlayProps {
  /** Ref to the board grid <div> — we ResizeObserve it to track square sizes. */
  boardRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

interface QueuedOps {
  orientation?: Orientation;
  lastMove?: [string | null, string | null];
  check?: string | null;
  capture?: string;
  checkmate?: string;
}

export const ChessBoardOverlay = forwardRef<ChessBoardOverlayHandle, ChessBoardOverlayProps>(
  function ChessBoardOverlay({ boardRef, className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const stageRef = useRef<ChessBoardStage | null>(null);
    const queuedRef = useRef<QueuedOps>({});

    useImperativeHandle(
      ref,
      () => ({
        setOrientation: (o) => {
          if (stageRef.current) stageRef.current.setOrientation(o);
          else queuedRef.current.orientation = o;
        },
        setLastMove: (from, to) => {
          if (stageRef.current) stageRef.current.setLastMove(from, to);
          else queuedRef.current.lastMove = [from, to];
        },
        setCheckSquare: (square) => {
          if (stageRef.current) stageRef.current.setCheckSquare(square);
          else queuedRef.current.check = square;
        },
        playCapture: (square) => {
          if (stageRef.current) stageRef.current.playCapture(square);
          else queuedRef.current.capture = square;
        },
        playCheckmate: (square) => {
          if (stageRef.current) stageRef.current.playCheckmate(square);
          else queuedRef.current.checkmate = square;
        },
        setActive: (active) => {
          if (stageRef.current) stageRef.current.setActive(active);
        },
      }),
      []
    );

    useEffect(() => {
      let cancelled = false;
      const canvas = canvasRef.current;
      const board = boardRef.current;
      if (!canvas || !board) return;

      void import('../../lib/pixi/chessBoardStage')
        .then(({ createChessBoardStage }) => {
          if (cancelled) return undefined;
          return createChessBoardStage(canvas);
        })
        .then((stage) => {
          if (!stage) return;
          if (cancelled) {
            stage.destroy();
            return;
          }
          stageRef.current = stage;
          // Sync initial board size now that the stage is online
          stage.setBoardSize(board.clientWidth, board.clientHeight);
          // Flush any imperative calls queued during async init
          const q = queuedRef.current;
          if (q.orientation) stage.setOrientation(q.orientation);
          if (q.lastMove) stage.setLastMove(q.lastMove[0], q.lastMove[1]);
          if (q.check !== undefined) stage.setCheckSquare(q.check);
          if (q.capture) stage.playCapture(q.capture);
          if (q.checkmate) stage.playCheckmate(q.checkmate);
          queuedRef.current = {};
        })
        .catch((err) => {
          console.warn('ChessBoardOverlay init failed; chess continues without overlay.', err);
        });

      // Track board size changes; the stage re-aligns square coords from this.
      const observer = new ResizeObserver(() => {
        const stage = stageRef.current;
        const el = boardRef.current;
        if (stage && el) stage.setBoardSize(el.clientWidth, el.clientHeight);
      });
      observer.observe(board);

      return () => {
        cancelled = true;
        observer.disconnect();
        if (stageRef.current) {
          stageRef.current.destroy();
          stageRef.current = null;
        }
      };
    }, [boardRef]);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        data-testid="chess-board-pixi-canvas"
        aria-hidden="true"
      />
    );
  }
);
