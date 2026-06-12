import { act, renderHook, waitFor } from '@testing-library/react';
import { useLiveScoreGame, LiveGameSnapshot } from './useLiveScoreGame';
import { api } from '../lib/api';
import { submitScoreAndWaitForWinner } from '../lib/multiplayer';
import { socketService } from '../lib/socket';
import type { User } from '../types';

jest.mock('../lib/api', () => ({
  api: {
    games: {
      get: jest.fn(),
      move: jest.fn(),
    },
  },
}));

jest.mock('../lib/multiplayer', () => ({
  submitScoreAndWaitForWinner: jest.fn(),
}));

jest.mock('../lib/socket', () => {
  const listeners: Record<string, Array<(payload: unknown) => void>> = {};
  return {
    socketService: {
      getSocket: jest.fn(() => ({
        on: jest.fn((event: string, cb: (payload: unknown) => void) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(cb);
        }),
        off: jest.fn((event: string, cb: (payload: unknown) => void) => {
          listeners[event] = (listeners[event] || []).filter((l) => l !== cb);
        }),
        emit: (event: string, payload: unknown) => {
          (listeners[event] || []).forEach((cb) => cb(payload));
        },
      })),
      joinGame: jest.fn(),
    },
  };
});

const mockApi = api as unknown as {
  games: { get: jest.Mock; move: jest.Mock };
};
const mockSubmitScore = submitScoreAndWaitForWinner as jest.Mock;
const mockGetSocket = socketService.getSocket as jest.Mock;

const buildUser = (username = 'alice'): User =>
  ({ id: 1, username, email: 'a@b.c', points: 0 }) as unknown as User;

const baseSnapshot: LiveGameSnapshot = {
  id: 'game-1',
  status: 'in_progress',
  hostName: 'alice',
  guestName: 'bob',
  gameState: {
    live: {
      submissions: {
        alice: { score: 0, round: 1 },
        bob: { score: 0, round: 1 },
      },
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useLiveScoreGame', () => {
  it('initializes with zeroed scores and not done', () => {
    const onGameEnd = jest.fn();
    const { result } = renderHook(() =>
      useLiveScoreGame({
        currentUser: buildUser(),
        gameId: 'game-1',
        isBot: true,
        mode: 'TestMode',
        submissionKeyPrefix: 'test',
        statsKind: 'arena',
        onGameEnd,
      })
    );
    expect(result.current.playerScore).toBe(0);
    expect(result.current.opponentScore).toBe(0);
    expect(result.current.done).toBe(false);
    expect(result.current.resolvingMatch).toBe(false);
  });

  it('skips fetchSnapshot when isBot=true', async () => {
    const { result } = renderHook(() =>
      useLiveScoreGame({
        currentUser: buildUser(),
        gameId: 'game-1',
        isBot: true,
        mode: 'TestMode',
        submissionKeyPrefix: 'test',
        statsKind: 'arena',
        onGameEnd: jest.fn(),
      })
    );
    const snapshot = await result.current.fetchSnapshot();
    expect(snapshot).toBeNull();
    expect(mockApi.games.get).not.toHaveBeenCalled();
  });

  it('skips syncLiveProgress when isBot=true', async () => {
    const { result } = renderHook(() =>
      useLiveScoreGame({
        currentUser: buildUser(),
        gameId: 'game-1',
        isBot: true,
        mode: 'TestMode',
        submissionKeyPrefix: 'test',
        statsKind: 'arena',
        onGameEnd: jest.fn(),
      })
    );
    await act(async () => {
      await result.current.syncLiveProgress(5, 2, false);
    });
    expect(mockApi.games.move).not.toHaveBeenCalled();
  });

  it('sends idempotent submissionKey in syncLiveProgress', async () => {
    mockApi.games.move.mockResolvedValue({});
    const { result } = renderHook(() =>
      useLiveScoreGame({
        currentUser: buildUser('alice'),
        gameId: 'game-1',
        isBot: false,
        mode: 'TestMode',
        submissionKeyPrefix: 'arena',
        statsKind: 'arena',
        onGameEnd: jest.fn(),
      })
    );
    await act(async () => {
      await result.current.syncLiveProgress(3, 1, false);
    });
    expect(mockApi.games.move).toHaveBeenCalledWith(
      'game-1',
      expect.objectContaining({
        liveSubmission: expect.objectContaining({
          mode: 'TestMode',
          score: 3,
          round: 1,
          done: false,
          submissionKey: 'arena|game-1|alice|1|3|0',
        }),
      })
    );
  });

  it('sanitizes negative/large score and round before submission', async () => {
    mockApi.games.move.mockResolvedValue({});
    const { result } = renderHook(() =>
      useLiveScoreGame({
        currentUser: buildUser('alice'),
        gameId: 'game-1',
        isBot: false,
        mode: 'TestMode',
        submissionKeyPrefix: 'arena',
        statsKind: 'arena',
        onGameEnd: jest.fn(),
      })
    );
    await act(async () => {
      await result.current.syncLiveProgress(-5, 9999, false);
    });
    const lastCall = mockApi.games.move.mock.calls.at(-1)![1];
    expect(lastCall.liveSubmission.score).toBe(0);
    expect(lastCall.liveSubmission.round).toBe(1000);
  });

  it('finalizeMatch resolves with server winner and uses snapshot stakeTransferred', async () => {
    mockSubmitScore.mockResolvedValue({ winner: 'alice', finished: true });
    // Hook now re-reads the snapshot after submitScoreAndWaitForWinner to pick up the
    // real `stakeTransferred` value the backend wrote during settlement.
    mockApi.games.get.mockResolvedValue({
      ...baseSnapshot,
      status: 'finished',
      winner: 'alice',
      gameState: {
        ...baseSnapshot.gameState,
        stakeTransferred: 25,
      },
    });
    const onGameEnd = jest.fn();
    const { result } = renderHook(() =>
      useLiveScoreGame({
        currentUser: buildUser('alice'),
        gameId: 'game-1',
        isBot: false,
        mode: 'TestMode',
        submissionKeyPrefix: 'arena',
        statsKind: 'arena',
        onGameEnd,
      })
    );
    await act(async () => {
      await result.current.finalizeMatch('alice', 7);
    });
    expect(mockSubmitScore).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'game-1',
        username: 'alice',
        score: 7,
        roundsWon: 7,
      })
    );
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onGameEnd).toHaveBeenCalledWith(
      'alice',
      25,
      expect.objectContaining({ kind: 'arena', playerScore: expect.any(Number) })
    );
  });

  it('finalizeMatch returns immediately for bot/local mode', async () => {
    const onGameEnd = jest.fn();
    const { result } = renderHook(() =>
      useLiveScoreGame({
        currentUser: buildUser('alice'),
        gameId: null,
        isBot: true,
        mode: 'TestMode',
        submissionKeyPrefix: 'arena',
        statsKind: 'arena',
        onGameEnd,
      })
    );
    await act(async () => {
      await result.current.finalizeMatch('alice', 4);
    });
    expect(mockSubmitScore).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onGameEnd).toHaveBeenCalledWith(
      'alice',
      10,
      expect.objectContaining({ kind: 'arena', playerScore: expect.any(Number) })
    );
  });

  it('applies snapshot: sets host/guest, updates scores, surfaces winner on finished', async () => {
    mockApi.games.get.mockResolvedValue({
      ...baseSnapshot,
      status: 'finished',
      winner: 'bob',
      gameState: {
        ...baseSnapshot.gameState,
        live: {
          submissions: {
            alice: { score: 4, round: 5 },
            bob: { score: 6, round: 5 },
          },
        },
      },
    });
    const onGameEnd = jest.fn();
    const { result } = renderHook(() =>
      useLiveScoreGame({
        currentUser: buildUser('alice'),
        gameId: 'game-1',
        isBot: false,
        mode: 'TestMode',
        submissionKeyPrefix: 'arena',
        statsKind: 'arena',
        onGameEnd,
      })
    );
    await waitFor(() => expect(mockApi.games.get).toHaveBeenCalled());
    await waitFor(() => expect(result.current.playerScore).toBe(4));
    expect(result.current.opponentScore).toBe(6);
    expect(result.current.hostName).toBe('alice');
    expect(result.current.guestName).toBe('bob');
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onGameEnd).toHaveBeenCalledWith(
      'bob',
      0,
      expect.objectContaining({ kind: 'arena', playerScore: expect.any(Number) })
    );
  });

  it('idempotent finish: server confirmation prevents duplicate onGameEnd calls', async () => {
    mockApi.games.get.mockResolvedValue({
      ...baseSnapshot,
      status: 'finished',
      winner: 'alice',
    });
    const onGameEnd = jest.fn();
    renderHook(() =>
      useLiveScoreGame({
        currentUser: buildUser('alice'),
        gameId: 'game-1',
        isBot: false,
        mode: 'TestMode',
        submissionKeyPrefix: 'arena',
        statsKind: 'arena',
        onGameEnd,
      })
    );
    await waitFor(() => expect(mockApi.games.get).toHaveBeenCalled());
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onGameEnd).toHaveBeenCalledTimes(1);
    // Trigger another snapshot fetch - should be no-op for onGameEnd.
    mockApi.games.get.mockClear();
    await act(async () => {
      // Force a poll tick.
      jest.advanceTimersByTime(2500);
    });
    expect(onGameEnd).toHaveBeenCalledTimes(1);
  });

  it('finalizationTimeoutMs is accepted (fallback timer plumbing is wired)', async () => {
    // We assert the plumbing — finalizationTimeoutMs is set, syncLiveProgress with
    // isDoneRound=true arms the fallback via setTimeout. Verifying that the timeout
    // actually invokes finalizeMatch within fake timers + nested promises is brittle;
    // we cover that integration path in the ArenaBattle/KnowledgeQuiz component tests.
    mockApi.games.move.mockResolvedValue({});
    const onGameEnd = jest.fn();
    const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
    const { result } = renderHook(() =>
      useLiveScoreGame({
        currentUser: buildUser('alice'),
        gameId: 'game-1',
        isBot: false,
        mode: 'TestMode',
        submissionKeyPrefix: 'arena',
        statsKind: 'arena',
        finalizationTimeoutMs: 5000,
        onGameEnd,
      })
    );
    await act(async () => {
      await result.current.syncLiveProgress(5, 10, true);
    });
    // The hook should have queued at least one 5000ms timer for the fallback.
    const has5sTimer = setTimeoutSpy.mock.calls.some(([, delay]) => delay === 5000);
    expect(has5sTimer).toBe(true);
    setTimeoutSpy.mockRestore();
  });

  it('socket subscription is established and cleaned up', async () => {
    mockApi.games.get.mockResolvedValue(baseSnapshot);
    const fakeSocket = {
      on: jest.fn(),
      off: jest.fn(),
    };
    mockGetSocket.mockReturnValue(fakeSocket);
    const { unmount } = renderHook(() =>
      useLiveScoreGame({
        currentUser: buildUser('alice'),
        gameId: 'game-1',
        isBot: false,
        mode: 'TestMode',
        submissionKeyPrefix: 'arena',
        statsKind: 'arena',
        onGameEnd: jest.fn(),
      })
    );
    await waitFor(() =>
      expect(fakeSocket.on).toHaveBeenCalledWith('game_state_updated', expect.any(Function))
    );
    unmount();
    expect(fakeSocket.off).toHaveBeenCalledWith('game_state_updated', expect.any(Function));
  });

  it('reset clears match state for a new gameId', async () => {
    const onGameEnd = jest.fn();
    const { result, rerender } = renderHook(
      ({ gameId }: { gameId: string | null }) =>
        useLiveScoreGame({
          currentUser: buildUser('alice'),
          gameId,
          isBot: true,
          mode: 'TestMode',
          submissionKeyPrefix: 'arena',
          statsKind: 'arena',
          onGameEnd,
        }),
      { initialProps: { gameId: 'game-1' } }
    );
    act(() => {
      result.current.setPlayerScore(7);
      result.current.setDone(true);
    });
    expect(result.current.playerScore).toBe(7);
    expect(result.current.done).toBe(true);
    rerender({ gameId: 'game-2' });
    await waitFor(() => expect(result.current.playerScore).toBe(0));
    expect(result.current.done).toBe(false);
  });
});
