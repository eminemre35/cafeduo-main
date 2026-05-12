/**
 * Squiggle — hand-drawn-looking SVG underline.
 *
 * Used under section headlines to add a printed-zine character. Three
 * colours, animated entrance via framer-motion (path draws on mount).
 */

import React from 'react';

interface SquiggleProps {
  /** Stroke colour token. */
  tone?: 'pink' | 'blue' | 'mustard';
  className?: string;
}

const TONE_HEX: Record<NonNullable<SquiggleProps['tone']>, string> = {
  pink: '#FF3E94',
  blue: '#1E3FB5',
  mustard: '#F1B41E',
};

/**
 * Hand-drawn-looking SVG underline. Pure SVG (no framer-motion) so it stays
 * test-mock-friendly; the optional draw-in entrance is done with a CSS
 * `@keyframes` definition on `.riso-squiggle-draw` (see index.css).
 */
export const Squiggle: React.FC<SquiggleProps> = ({ tone = 'pink', className = '' }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 120 8"
    preserveAspectRatio="none"
    className={['block h-2 w-full', className].join(' ')}
  >
    <path
      d="M0 4 Q 10 0, 20 4 T 40 4 T 60 4 T 80 4 T 100 4 T 120 4"
      stroke={TONE_HEX[tone]}
      strokeWidth={2.5}
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);
