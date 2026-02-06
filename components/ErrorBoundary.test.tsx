import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const Crash: React.FC = () => {
  throw new Error('boom');
};

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>safe-content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('safe-content')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Crash />
      </ErrorBoundary>
    );

    expect(screen.getByText('Uygulama Hatası')).toBeInTheDocument();
    expect(screen.getByText(/Error: boom/)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('clears storage on recovery button click', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const clearSpy = jest.spyOn(window.localStorage, 'clear');

    render(
      <ErrorBoundary>
        <Crash />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Önbelleği Temizle ve Ana Sayfaya Dön'));
    expect(clearSpy).toHaveBeenCalledTimes(1);

    clearSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
