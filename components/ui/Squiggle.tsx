/**
 * Squiggle — hand-drawn-looking SVG underline.
 *
 * Used under section headlines to add a printed-zine character. Three
 * colours, animated entrance via framer-motion (path draws on mount).
 */

import React from 'react';
import { motion } from 'framer-motion';

interface SquiggleProps {
  /** Stroke colour token. */
  tone?: 'pink' | 'blue' | 'mustard';
  /** Width in pixels — should match the underlying headline. Pass via CSS for fluid widths. */
  className?: string;
}

const TONE_HEX: Record<NonNullable<SquiggleProps['tone']>, string> = {
  pink: '#FF3E94',
  blue: '#1E3FB5',
  mustard: '#F1B41E',
};

export const Squiggle: React.FC<SquiggleProps> = ({ tone = 'pink', className = '' }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 120 8"
    preserveAspectRatio="none"
    className={['block h-2 w-full', className].join(' ')}
  >
    <motion.path
      d="M0 4 Q 10 0, 20 4 T 40 4 T 60 4 T 80 4 T 100 4 T 120 4"
      stroke={TONE_HEX[tone]}
      strokeWidth={2.5}
      strokeLinecap="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    />
  </svg>
);
