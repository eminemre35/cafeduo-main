import React from 'react';
import { render, screen } from '@testing-library/react';
import { CyberMascot } from './CyberMascot';

describe('CyberMascot', () => {
  it('renders a clickable mascot button', () => {
    render(<CyberMascot mood="neutral" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
