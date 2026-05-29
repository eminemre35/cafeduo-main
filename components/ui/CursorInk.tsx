/**
 * CursorInk — imleci takip eden risograph "mürekkep" ışığı.
 *
 * Yumuşak, multiply-blend riso-pembe radial leke; imleci yayla (spring) gecikmeli
 * takip eder. Pazarlama sayfalarında (App route-gate) render edilir. Çift kapatma:
 * reduced-motion + coarse pointer (touch). Kapalıysa null döner.
 * Tek global pointermove + rAF; pointer-events:none, içeriğin altında (z-[5]).
 */
import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion, useSpring } from 'framer-motion';

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const SIZE = 420;
const HALF = SIZE / 2;

export const CursorInk: React.FC = () => {
  const reduce = useReducedMotion();
  const fine =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(FINE_POINTER).matches
      : false;
  const enabled = !reduce && fine;

  // Merkez offset'i değere gömülür (Tailwind translate framer transform'unu ezerdi).
  const x = useSpring(-HALF, { stiffness: 120, damping: 22, mass: 0.6 });
  const y = useSpring(-HALF, { stiffness: 120, damping: 22, mass: 0.6 });
  const rafRef = useRef<number | null>(null);
  const posRef = useRef({ x: -HALF, y: -HALF });

  useEffect(() => {
    if (!enabled) return undefined;

    const flush = () => {
      rafRef.current = null;
      x.set(posRef.current.x);
      y.set(posRef.current.y);
    };

    const onMove = (event: PointerEvent) => {
      posRef.current = { x: event.clientX - HALF, y: event.clientY - HALF };
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flush);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[5] mix-blend-multiply"
      style={{
        x,
        y,
        width: SIZE,
        height: SIZE,
        background:
          'radial-gradient(circle, rgba(255,62,148,0.28) 0%, rgba(255,62,148,0.12) 38%, rgba(255,62,148,0) 70%)',
        willChange: 'transform',
      }}
    />
  );
};
