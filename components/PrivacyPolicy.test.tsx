import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PrivacyPolicy } from './PrivacyPolicy';

describe('PrivacyPolicy', () => {
  it('renders KVKK sections and primary contact details', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>
    );

    expect(screen.getByText('Gizlilik Politikası ve KVKK Aydınlatma Metni')).toBeInTheDocument();
    expect(screen.getByText(/Son güncelleme:/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Veri Sorumlusu/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Çerez Politikası/i })).toBeInTheDocument();
    expect(screen.getByText('cafeduotr@gmail.com')).toBeInTheDocument();

    const backLink = screen.getByRole('link', { name: /Ana Sayfaya Dön/i });
    expect(backLink).toHaveAttribute('href', '/');
  });
});
