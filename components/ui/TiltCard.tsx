/**
 * TiltCard — children'ı imlece doğru eğen 3D tilt sarmalayıcısı.
 *
 * RevealItem (reveal: y/opacity) > TiltCard (perspective + rotateX/rotateY) >
 * Card (riso rotate(), inline style) üçlü transform kompozisyonunda orta katman.
 * Kapalıysa (touch / reduced-motion) düz bir <div> döner — ekstra motion/listener yok.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTilt } from '../../hooks/useTilt';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Maksimum eğilme açısı (derece). */
  max?: number;
}

export const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', max }) => {
  const { ref, rotateX, rotateY, enabled } = useTilt({ max });

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 800,
        willChange: 'transform',
      }}
    >
      {children}
    </motion.div>
  );
};
