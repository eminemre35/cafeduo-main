import React from 'react';
import { render, screen } from '@testing-library/react';
import { CyberGlitchScreen } from './CyberGlitchScreen';

describe('CyberGlitchScreen', () => {
  it('renders glitch headings without crashing', () => {
    render(<CyberGlitchScreen isWinner={true} earnedPoints={150} onComplete={() => {}} />);
    // Glitch ekrani en az bir buyuk baslik icerir
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });
});
