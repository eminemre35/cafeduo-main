import React from 'react';
import { render, screen } from '@testing-library/react';
import { useReducedMotion } from 'framer-motion';
import { FloatingSquareField } from './FloatingSquareField';

jest.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));

  MotionDiv.displayName = 'MotionDiv';

  return {
    motion: { div: MotionDiv },
    useMotionValue: (initial: number) => ({ get: () => initial, set: jest.fn() }),
    useSpring: (value: unknown) => value,
    useReducedMotion: jest.fn(() => false),
  };
});

describe('FloatingSquareField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useReducedMotion as jest.Mock).mockReturnValue(false);
  });

  it('renders a bounded decorative field of flat squares', () => {
    render(<FloatingSquareField />);

    const squares = screen.getAllByTestId('hero-floating-square');
    expect(squares.length).toBeGreaterThanOrEqual(8);
    expect(squares.length).toBeLessThanOrEqual(10);
    squares.forEach((square) => expect(square).toHaveAttribute('aria-hidden', 'true'));
  });

  it('keeps squares static when reduced motion is requested', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);

    render(<FloatingSquareField />);

    screen.getAllByTestId('hero-floating-square').forEach((square) => {
      expect(square).not.toHaveAttribute('data-motion-active', 'true');
    });
  });
});
