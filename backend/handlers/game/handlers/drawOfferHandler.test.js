/**
 * drawOfferHandler unit tests
 *
 * Covers:
 *  Validation gates (both paths):
 *   - 400 invalid action
 *  DB path:
 *   - 404 (game not found)
 *   - 403 (non-participant)
 *   - 400 non-chess game type
 *   - 409 game not ACTIVE (e.g. waiting)
 *   - offer: new offer → stored, emits draw_offer_updated
 *   - offer: idempotent re-offer by same actor returns pending:true
 *   - offer: opponent has pending offer → 409
 *   - cancel: no pending offer by actor → 409
 *   - cancel: cancels own offer → emits draw_offer_updated
 *   - reject: no opponent offer → 409
 *   - reject: rejects opponent offer → emits draw_offer_updated
 *   - accept: no opponent offer → 409
 *   - accept: accepts → game finished, isDraw, settlement transferredPoints=0, emits game_finished
 *   - accept: clock.lastTickAt set to null
 *   - 500 + rollback on error
 *  Memory path:
 *   - 404
 *   - 403
 *   - 400 non-chess
 *   - 409 not ACTIVE
 *   - offer new
 *   - cancel own offer
 *   - reject opponent offer
 *   - accept → game finished, isDraw, no points transferred
 */

const { createDrawOfferHandler } = require('./drawOfferHandler');
const { GAME_STATUS } = require('../../../utils/gameStateMachine');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createMockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.payload = null;
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload) => {
    res.payload = payload;
    return res;
  });
  return res;
};

const normalizeParticipantName = (name, game) => {
  const normalized = String(name || '')
    .trim()
    .toLowerCase();
  const host = String(game?.host_name || game?.hostName || '')
    .trim()
    .toLowerCase();
  const guest = String(game?.guest_name || game?.guestName || '')
    .trim()
    .toLowerCase();
  if (normalized && normalized === host) return String(game?.host_name || game?.hostName);
  if (normalized && normalized === guest) return String(game?.guest_name || game?.guestName);
  return null;
};

/**
 * Minimal pg client mock for draw offer handler.
 * The handler queries the game row directly (no gameService indirection),
 * then issues UPDATE games and SELECT/UPDATE users via settlementUtils.
 */
const makeDbClient = ({ game = null, users = [] } = {}) => {
  const calls = [];
  const usersByLower = new Map(users.map((u) => [String(u.username || '').toLowerCase(), u]));
  return {
    calls,
    users,
    _game: game,
    query: jest.fn(async (sql, params = []) => {
      calls.push({ sql, params });

      // SELECT games row (draw offer handler fetches it directly)
      if (/FROM\s+games/i.test(sql) && /WHERE\s+id\s*=\s*\$1/i.test(sql)) {
        const id = String(params[0]);
        const row = game && String(game.id) === id ? game : null;
        return { rows: row ? [row] : [] };
      }

      // UPDATE games (state or finish)
      if (/^\s*UPDATE\s+games/i.test(sql)) {
        if (game) {
          // Capture finish status
          if (/SET\s+status\s*=\s*'finished'/i.test(sql)) {
            game.status = 'finished';
            game.winner = null;
            if (params[0]) {
              try {
                game.game_state = JSON.parse(params[0]);
              } catch {
                /* geçersiz JSON yok sayılır */
              }
            }
          } else if (params[0]) {
            try {
              game.game_state = JSON.parse(params[0]);
            } catch {
              /* geçersiz JSON yok sayılır */
            }
          }
        }
        return { rowCount: game ? 1 : 0 };
      }

      // Settlement — SELECT users FOR UPDATE
      if (/FROM\s+users/i.test(sql) && /LOWER\(username\)\s*=\s*ANY/i.test(sql)) {
        const needles = (params[0] || []).map((n) => String(n).toLowerCase());
        const rows = needles.map((n) => usersByLower.get(n)).filter(Boolean);
        return { rows };
      }

      // Settlement — UPDATE users
      if (/^\s*UPDATE\s+users/i.test(sql)) {
        const id = params[params.length - 1];
        const row = users.find((u) => u.id === id);
        if (row) {
          if (/games_played\s*=\s*games_played\s*\+\s*1/i.test(sql))
            row.games_played = (row.games_played || 0) + 1;
          if (/wins\s*=\s*wins\s*\+\s*\$1/i.test(sql)) row.wins = (row.wins || 0) + params[0];
        }
        return { rowCount: row ? 1 : 0 };
      }

      return { rows: [], rowCount: 0 };
    }),
    release: jest.fn(),
  };
};

const CHESS_TYPE = 'Retro Satranç';

const makeChessGame = (overrides = {}) => ({
  id: 1,
  host_name: 'Alice',
  guest_name: 'Bob',
  game_type: CHESS_TYPE,
  points: 0,
  status: 'active',
  winner: null,
  game_state: { chess: {} },
  ...overrides,
});

const makeDeps = (overrides = {}) => {
  const memoryGames = overrides.memoryGames ? [...overrides.memoryGames] : [];
  const memoryUsers = overrides.memoryUsers ? [...overrides.memoryUsers] : [];
  return {
    pool: { connect: jest.fn(async () => overrides.client || makeDbClient()) },
    isDbConnected: jest.fn().mockResolvedValue(Boolean(overrides.dbConnected)),
    logger: { error: jest.fn(), warn: jest.fn() },
    normalizeParticipantName,
    getMemoryGames: () => memoryGames,
    setMemoryGames: (next) => {
      memoryGames.length = 0;
      memoryGames.push(...next);
    },
    getMemoryUsers: () => memoryUsers,
    emitRealtimeUpdate: overrides.emitRealtimeUpdate || jest.fn(),
    GAME_STATUS,
    _memoryGamesRef: memoryGames,
    _memoryUsersRef: memoryUsers,
  };
};

// ---------------------------------------------------------------------------
// Validation gate (shared)
// ---------------------------------------------------------------------------

describe('drawOfferHandler — invalid action', () => {
  it('returns 400 for unrecognized action regardless of path', async () => {
    const deps = makeDeps(); // memory path
    const handler = createDrawOfferHandler(deps);
    const req = { params: { id: '1' }, body: { action: 'blah' }, user: { username: 'Alice' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toMatch(/aksiy/i);
  });
});

// ---------------------------------------------------------------------------
// DB path tests
// ---------------------------------------------------------------------------

describe('drawOfferHandler (DB path)', () => {
  it('returns 404 when game not found', async () => {
    const client = makeDbClient({ game: null });
    const deps = makeDeps({ dbConnected: true, client });
    const handler = createDrawOfferHandler(deps);
    const req = { params: { id: '99' }, body: { action: 'offer' }, user: { username: 'Alice' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(client.calls.some((c) => /ROLLBACK/.test(c.sql))).toBe(true);
  });

  it('returns 403 when actor is not a participant', async () => {
    const client = makeDbClient({ game: makeChessGame() });
    const deps = makeDeps({ dbConnected: true, client });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'offer' },
      user: { username: 'Stranger' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(client.calls.some((c) => /ROLLBACK/.test(c.sql))).toBe(true);
  });

  it('returns 400 for non-chess game type', async () => {
    const client = makeDbClient({
      game: makeChessGame({ game_type: 'Nişancı Düellosu' }),
    });
    const deps = makeDeps({ dbConnected: true, client });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'offer' },
      user: { username: 'Alice' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toMatch(/satranç/i);
    expect(client.calls.some((c) => /ROLLBACK/.test(c.sql))).toBe(true);
  });

  it('returns 409 when game is not ACTIVE (e.g. waiting)', async () => {
    const client = makeDbClient({ game: makeChessGame({ status: 'waiting' }) });
    const deps = makeDeps({ dbConnected: true, client });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'offer' },
      user: { username: 'Alice' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(409);
    expect(client.calls.some((c) => /ROLLBACK/.test(c.sql))).toBe(true);
  });

  it('offer: creates pending draw offer, updates game, emits draw_offer_updated', async () => {
    const game = makeChessGame();
    const client = makeDbClient({ game });
    const emitRealtimeUpdate = jest.fn();
    const deps = makeDeps({ dbConnected: true, client, emitRealtimeUpdate });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'offer' },
      user: { username: 'Alice' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.drawOffer.status).toBe('pending');
    expect(res.payload.drawOffer.offeredBy).toBe('Alice');
    expect(client.calls.some((c) => /COMMIT/.test(c.sql))).toBe(true);
    expect(emitRealtimeUpdate).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ type: 'draw_offer_updated', action: 'offer' })
    );
  });

  it('offer: idempotent re-offer by same actor returns pending:true without DB write', async () => {
    const game = makeChessGame({
      game_state: {
        chess: {
          drawOffer: { status: 'pending', offeredBy: 'Alice', createdAt: new Date().toISOString() },
        },
      },
    });
    const client = makeDbClient({ game });
    const deps = makeDeps({ dbConnected: true, client });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'offer' },
      user: { username: 'Alice' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.pending).toBe(true);
    // No commit: rollback was issued (idempotent path)
    expect(client.calls.some((c) => /ROLLBACK/.test(c.sql))).toBe(true);
  });

  it('offer: opponent already has a pending offer → 409', async () => {
    const game = makeChessGame({
      game_state: {
        chess: {
          drawOffer: { status: 'pending', offeredBy: 'Bob', createdAt: new Date().toISOString() },
        },
      },
    });
    const client = makeDbClient({ game });
    const deps = makeDeps({ dbConnected: true, client });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'offer' },
      user: { username: 'Alice' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(409);
    expect(client.calls.some((c) => /ROLLBACK/.test(c.sql))).toBe(true);
  });

  it('cancel: no pending offer by actor → 409', async () => {
    const game = makeChessGame(); // no pending offer
    const client = makeDbClient({ game });
    const deps = makeDeps({ dbConnected: true, client });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'cancel' },
      user: { username: 'Alice' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.payload.error).toMatch(/beraberlik tekli/i);
  });

  it('cancel: cancels own pending offer, sets status=cancelled, emits', async () => {
    const game = makeChessGame({
      game_state: {
        chess: {
          drawOffer: { status: 'pending', offeredBy: 'Alice', createdAt: new Date().toISOString() },
        },
      },
    });
    const client = makeDbClient({ game });
    const emitRealtimeUpdate = jest.fn();
    const deps = makeDeps({ dbConnected: true, client, emitRealtimeUpdate });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'cancel' },
      user: { username: 'Alice' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.drawOffer.status).toBe('cancelled');
    expect(emitRealtimeUpdate).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ action: 'cancel' })
    );
  });

  it('reject: no pending offer by opponent → 409', async () => {
    const game = makeChessGame(); // no offer
    const client = makeDbClient({ game });
    const deps = makeDeps({ dbConnected: true, client });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'reject' },
      user: { username: 'Bob' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.payload.error).toMatch(/yanıtlanacak/i);
  });

  it('reject: rejects opponent offer, sets status=rejected, emits', async () => {
    const game = makeChessGame({
      game_state: {
        chess: {
          drawOffer: { status: 'pending', offeredBy: 'Alice', createdAt: new Date().toISOString() },
        },
      },
    });
    const client = makeDbClient({ game });
    const emitRealtimeUpdate = jest.fn();
    const deps = makeDeps({ dbConnected: true, client, emitRealtimeUpdate });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'reject' },
      user: { username: 'Bob' }, // Bob rejects Alice's offer
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.drawOffer.status).toBe('rejected');
    expect(res.payload.drawOffer.respondedBy).toBe('Bob');
    expect(emitRealtimeUpdate).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ action: 'reject' })
    );
  });

  it('accept: no pending opponent offer → 409', async () => {
    const game = makeChessGame(); // no offer
    const client = makeDbClient({ game });
    const deps = makeDeps({ dbConnected: true, client });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'accept' },
      user: { username: 'Bob' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.payload.error).toMatch(/onaylanacak/i);
  });

  it('accept: finishes game as draw, no points transferred, emits game_finished with reason:draw_agreement', async () => {
    const game = makeChessGame({
      points: 20,
      game_state: {
        chess: {
          drawOffer: { status: 'pending', offeredBy: 'Alice', createdAt: new Date().toISOString() },
          clock: {
            baseMs: 180000,
            incrementMs: 2000,
            whiteMs: 100000,
            blackMs: 90000,
            lastTickAt: '2026-01-01T00:00:00Z',
          },
        },
      },
    });
    const users = [
      { id: 1, username: 'Alice', points: 100, wins: 0, games_played: 0 },
      { id: 2, username: 'Bob', points: 100, wins: 0, games_played: 0 },
    ];
    const client = makeDbClient({ game, users });
    const emitRealtimeUpdate = jest.fn();
    const deps = makeDeps({ dbConnected: true, client, emitRealtimeUpdate });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'accept' },
      user: { username: 'Bob' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.draw).toBe(true);
    expect(res.payload.winner).toBeNull();

    // No points transferred for draw
    expect(users[0].points).toBe(100);
    expect(users[1].points).toBe(100);

    expect(emitRealtimeUpdate).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        type: 'game_finished',
        draw: true,
        winner: null,
        reason: 'draw_agreement',
      })
    );
    expect(client.calls.some((c) => /COMMIT/.test(c.sql))).toBe(true);
  });

  it('accept: clock.lastTickAt is set to null in the committed game_state', async () => {
    const game = makeChessGame({
      game_state: {
        chess: {
          drawOffer: { status: 'pending', offeredBy: 'Alice', createdAt: new Date().toISOString() },
          clock: { lastTickAt: '2026-01-01T12:00:00Z', whiteMs: 60000, blackMs: 60000 },
        },
      },
    });
    const client = makeDbClient({ game });
    const deps = makeDeps({ dbConnected: true, client });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'accept' },
      user: { username: 'Bob' },
    };
    const res = createMockRes();

    await handler(req, res);

    // Inspect the game_state written to "DB" (captured by the mock)
    const updateCall = client.calls.find(
      (c) => /UPDATE\s+games/i.test(c.sql) && /status\s*=\s*'finished'/i.test(c.sql)
    );
    expect(updateCall).toBeDefined();
    const written = JSON.parse(updateCall.params[0]);
    expect(written.chess.clock.lastTickAt).toBeNull();
  });

  it('returns 500 and rolls back on unexpected error', async () => {
    const game = makeChessGame({
      game_state: {
        chess: {
          drawOffer: { status: 'pending', offeredBy: 'Alice', createdAt: new Date().toISOString() },
        },
      },
    });
    const users = [
      { id: 1, username: 'Alice', points: 100, wins: 0, games_played: 0 },
      { id: 2, username: 'Bob', points: 100, wins: 0, games_played: 0 },
    ];
    const client = makeDbClient({ game, users });
    // Poison the client: throw on any UPDATE games statement
    const originalQuery = client.query;
    client.query = jest.fn(async (sql, params) => {
      if (/^\s*UPDATE\s+games/i.test(sql)) {
        throw new Error('kaboom');
      }
      return originalQuery(sql, params);
    });
    const deps = makeDeps({ dbConnected: true, client });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'accept' },
      user: { username: 'Bob' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(deps.logger.error).toHaveBeenCalled();
    expect(client.release).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Memory path tests
// ---------------------------------------------------------------------------

const makeMemoryChessGame = (overrides = {}) => ({
  id: 1,
  hostName: 'Alice',
  guestName: 'Bob',
  gameType: CHESS_TYPE,
  points: 0,
  status: 'active',
  winner: null,
  gameState: { chess: {} },
  ...overrides,
});

describe('drawOfferHandler (memory path)', () => {
  it('returns 404 when game not found in memory', async () => {
    const deps = makeDeps();
    const handler = createDrawOfferHandler(deps);
    const req = { params: { id: '99' }, body: { action: 'offer' }, user: { username: 'Alice' } };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  it('returns 403 when actor is not a participant', async () => {
    const deps = makeDeps({ memoryGames: [makeMemoryChessGame()] });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'offer' },
      user: { username: 'Stranger' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
  });

  it('returns 400 for non-chess game type', async () => {
    const deps = makeDeps({
      memoryGames: [makeMemoryChessGame({ gameType: 'Nişancı Düellosu' })],
    });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'offer' },
      user: { username: 'Alice' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toMatch(/satranç/i);
  });

  it('returns 409 when game is not ACTIVE', async () => {
    const deps = makeDeps({
      memoryGames: [makeMemoryChessGame({ status: 'waiting' })],
    });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'offer' },
      user: { username: 'Alice' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(409);
  });

  it('offer: creates pending offer, mutates game.gameState, emits', async () => {
    const memoryGames = [makeMemoryChessGame()];
    const emitRealtimeUpdate = jest.fn();
    const deps = makeDeps({ memoryGames, emitRealtimeUpdate });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'offer' },
      user: { username: 'Alice' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.drawOffer.status).toBe('pending');
    expect(res.payload.drawOffer.offeredBy).toBe('Alice');

    const game = deps._memoryGamesRef[0];
    expect(game.gameState.chess.drawOffer.status).toBe('pending');

    expect(emitRealtimeUpdate).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ type: 'draw_offer_updated', action: 'offer' })
    );
  });

  it('cancel: cancels own pending offer in memory', async () => {
    const memoryGames = [
      makeMemoryChessGame({
        gameState: {
          chess: {
            drawOffer: {
              status: 'pending',
              offeredBy: 'Alice',
              createdAt: new Date().toISOString(),
            },
          },
        },
      }),
    ];
    const emitRealtimeUpdate = jest.fn();
    const deps = makeDeps({ memoryGames, emitRealtimeUpdate });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'cancel' },
      user: { username: 'Alice' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.drawOffer.status).toBe('cancelled');
    const game = deps._memoryGamesRef[0];
    expect(game.gameState.chess.drawOffer.status).toBe('cancelled');
  });

  it('reject: rejects opponent offer in memory', async () => {
    const memoryGames = [
      makeMemoryChessGame({
        gameState: {
          chess: {
            drawOffer: {
              status: 'pending',
              offeredBy: 'Alice',
              createdAt: new Date().toISOString(),
            },
          },
        },
      }),
    ];
    const emitRealtimeUpdate = jest.fn();
    const deps = makeDeps({ memoryGames, emitRealtimeUpdate });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'reject' },
      user: { username: 'Bob' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.drawOffer.status).toBe('rejected');
    expect(res.payload.drawOffer.respondedBy).toBe('Bob');
  });

  it('accept: finishes game as draw in memory, no points transferred, emits game_finished', async () => {
    const memoryGames = [
      makeMemoryChessGame({
        points: 20,
        gameState: {
          chess: {
            drawOffer: {
              status: 'pending',
              offeredBy: 'Alice',
              createdAt: new Date().toISOString(),
            },
            clock: { lastTickAt: '2026-01-01T00:00:00Z', whiteMs: 60000, blackMs: 60000 },
          },
        },
      }),
    ];
    const memoryUsers = [
      { id: 1, username: 'Alice', points: 100, wins: 0, gamesPlayed: 0 },
      { id: 2, username: 'Bob', points: 100, wins: 0, gamesPlayed: 0 },
    ];
    const emitRealtimeUpdate = jest.fn();
    const deps = makeDeps({ memoryGames, memoryUsers, emitRealtimeUpdate });
    const handler = createDrawOfferHandler(deps);
    const req = {
      params: { id: '1' },
      body: { action: 'accept' },
      user: { username: 'Bob' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.draw).toBe(true);
    expect(res.payload.winner).toBeNull();

    // No points transferred
    expect(deps._memoryUsersRef[0].points).toBe(100);
    expect(deps._memoryUsersRef[1].points).toBe(100);

    const game = deps._memoryGamesRef[0];
    expect(game.status).toBe('finished');
    expect(game.winner).toBeNull();
    expect(game.gameState.settlementApplied).toBe(true);
    expect(game.gameState.stakeTransferred).toBe(0);
    expect(game.gameState.chess.clock.lastTickAt).toBeNull();
    expect(game.gameState.chess.result).toBe('draw-agreement');
    expect(game.gameState.chess.isGameOver).toBe(true);

    expect(emitRealtimeUpdate).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        type: 'game_finished',
        draw: true,
        winner: null,
        reason: 'draw_agreement',
      })
    );
  });
});
