import React from 'react';
import { render, screen } from '@testing-library/react';
import { BusinessLanding } from './BusinessLanding';

describe('BusinessLanding', () => {
  it('renders the cafe-owner hero section', () => {
    render(<BusinessLanding />);
    expect(screen.getByLabelText('Kafe sahipleri için ana bölüm')).toBeInTheDocument();
  });

  it('renders pilot card, stats, how-it-works and pricing sections', () => {
    render(<BusinessLanding />);
    expect(screen.getByLabelText('Pilot programı özet kartı')).toBeInTheDocument();
    expect(screen.getByLabelText('Anahtar sayılar')).toBeInTheDocument();
    expect(screen.getByLabelText('Nasıl çalışır')).toBeInTheDocument();
    expect(screen.getByLabelText('Faydalar')).toBeInTheDocument();
    expect(screen.getByLabelText('Fiyatlandırma')).toBeInTheDocument();
  });

  it('includes a WhatsApp pilot CTA', () => {
    render(<BusinessLanding />);
    const whatsapp = screen
      .getAllByRole('link')
      .find((a) => a.getAttribute('href')?.includes('wa.me'));
    expect(whatsapp).toBeTruthy();
  });
});
