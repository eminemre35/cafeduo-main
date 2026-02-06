import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ArenaBattle } from './ArenaBattle';
import { User } from '../types';

describe('ArenaBattle', () => {
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
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('ignores pad input while sequence is being shown', () => {
    render(
      <ArenaBattle
        currentUser={mockUser}
        gameId={1}
        isBot={true}
        onGameEnd={jest.fn()}
        onLeave={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('rhythm-pad-0'));
    expect(screen.getByText('Dizi oynatılıyor...')).toBeInTheDocument();
  });

  it('ends match after 4 failed rounds and declares bot winner', () => {
    const onGameEnd = jest.fn();

    render(
      <ArenaBattle
        currentUser={mockUser}
        gameId={1}
        isBot={true}
        onGameEnd={onGameEnd}
        onLeave={jest.fn()}
      />
    );

    for (let i = 0; i < 4; i += 1) {
      act(() => {
        jest.advanceTimersByTime(3400);
      });
      fireEvent.click(screen.getByTestId('rhythm-pad-1'));
    }

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onGameEnd).toHaveBeenCalledWith('BOT', 0);
  });
});
