import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ReflexRush } from './ReflexRush';
import { User } from '../types';

jest.mock('./RetroButton', () => ({
  RetroButton: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

describe('ReflexRush', () => {
  const mockUser: User = {
    id: 1,
    username: 'emin',
    email: 'emin@example.com',
    points: 100,
    wins: 0,
    gamesPlayed: 0,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    jest.spyOn(performance, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('awards round to opponent when clicked too early', () => {
    const onGameEnd = jest.fn();
    render(
      <ReflexRush
        currentUser={mockUser}
        isBot={true}
        onGameEnd={onGameEnd}
        onLeave={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText('Yeni Tur'));
    fireEvent.click(screen.getByTestId('reflex-target'));

    expect(screen.getByText('Erken tıkladın! Tur rakibe yazıldı.')).toBeInTheDocument();
    expect(onGameEnd).not.toHaveBeenCalled();
  });

  it('finishes match after 3 winning rounds', () => {
    const onGameEnd = jest.fn();
    render(
      <ReflexRush
        currentUser={mockUser}
        isBot={true}
        onGameEnd={onGameEnd}
        onLeave={jest.fn()}
      />
    );

    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(screen.getByText('Yeni Tur'));
      act(() => {
        jest.advanceTimersByTime(810);
      });
      fireEvent.click(screen.getByTestId('reflex-target'));
    }

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onGameEnd).toHaveBeenCalledWith('emin', 10);
  });
});
