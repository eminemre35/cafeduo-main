/**
 * gameCleanupJobs unit tests
 *
 * Two setInterval handlers register; tests pull them out via spy and invoke
 * them manually to avoid waiting 5 minutes. We assert:
 *  1. The "stale waiting" handler deletes only waiting games older than
 *     30 minutes (DB and memory paths)
 *  2. The "stuck active/waiting" handler logs a structured warn per row and
 *     force-closes them without transferring points — this is the explicit
 *     design contract; if anyone ever decides to apply settlement here, that
 *     change should be visible as a deliberate test update, not silent drift.
 */

const { registerGameCleanupJobs } = require('./gameCleanupJobs');

// Capture handlers passed to setInterval without actually firing them
const captureIntervals = () => {
  const handlers = [];
  const originalSetInterval = global.setInterval;
  global.setInterval = (fn, _ms) => {
    handlers.push(fn);
    return { _id: handlers.length }; // sentinel timer
  };
  return {
    handlers,
    restore: () => {
      global.setInterval = originalSetInterval;
    },
  };
};

const makeLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

describe('gameCleanupJobs — stale waiting games', () => {
  let capture;
  afterEach(() => {
    capture?.restore();
  });

  it('DB path: DELETEs waiting games older than 30 minutes', async () => {
    capture = captureIntervals();
    const pool = {
      query: jest.fn().mockResolvedValue({ rowCount: 3 }),
    };
    const logger = makeLogger();

    registerGameCleanupJobs({
      pool,
      isDbConnected: jest.fn().mockResolvedValue(true),
      getMemoryGames: jest.fn(),
      setMemoryGames: jest.fn(),
      logger,
    });

    // First handler is the stale-waiting cleanup
    await capture.handlers[0]();

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringMatching(/DELETE FROM games WHERE status = 'waiting'/),
      expect.any(Array)
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/Deleted 3 stale waiting games from DB/)
    );
  });

  it('DB path: silent when no rows match (does not log "Deleted 0")', async () => {
    capture = captureIntervals();
    const pool = { query: jest.fn().mockResolvedValue({ rowCount: 0 }) };
    const logger = makeLogger();

    registerGameCleanupJobs({
      pool,
      isDbConnected: jest.fn().mockResolvedValue(true),
      getMemoryGames: jest.fn(),
      setMemoryGames: jest.fn(),
      logger,
    });

    await capture.handlers[0]();

    expect(pool.query).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Running cleanup job for stale waiting games.');
    // No "Deleted N stale" log when nothing was deleted
    const deletionLog = logger.info.mock.calls.find((c) => /Deleted/.test(c[0]));
    expect(deletionLog).toBeUndefined();
  });

  it('DB path: logs error and continues when DELETE fails', async () => {
    capture = captureIntervals();
    const pool = { query: jest.fn().mockRejectedValue(new Error('connection lost')) };
    const logger = makeLogger();

    registerGameCleanupJobs({
      pool,
      isDbConnected: jest.fn().mockResolvedValue(true),
      getMemoryGames: jest.fn(),
      setMemoryGames: jest.fn(),
      logger,
    });

    await capture.handlers[0]();

    expect(logger.error).toHaveBeenCalledWith('Cleanup error (waiting games):', expect.any(Error));
  });

  it('memory path: filters out only stale waiting games and calls setMemoryGames', async () => {
    capture = captureIntervals();
    const now = Date.now();
    const games = [
      // Stale waiting (>30 min)
      { id: 1, status: 'waiting', createdAt: new Date(now - 31 * 60 * 1000).toISOString() },
      // Fresh waiting (<30 min) — should stay
      { id: 2, status: 'waiting', createdAt: new Date(now - 5 * 60 * 1000).toISOString() },
      // Active old — should stay (different job handles it)
      { id: 3, status: 'active', createdAt: new Date(now - 10 * 60 * 60 * 1000).toISOString() },
    ];
    const setMemoryGames = jest.fn();
    const logger = makeLogger();

    registerGameCleanupJobs({
      pool: { query: jest.fn() },
      isDbConnected: jest.fn().mockResolvedValue(false),
      getMemoryGames: () => games,
      setMemoryGames,
      logger,
    });

    await capture.handlers[0]();

    expect(setMemoryGames).toHaveBeenCalledTimes(1);
    const remaining = setMemoryGames.mock.calls[0][0];
    expect(remaining).toHaveLength(2);
    expect(remaining.map((g) => g.id).sort()).toEqual([2, 3]);
    expect(logger.info).toHaveBeenCalledWith('Deleted 1 stale waiting games from memory.');
  });

  it('memory path: does not call setMemoryGames when nothing is stale', async () => {
    capture = captureIntervals();
    const now = Date.now();
    const games = [
      { id: 1, status: 'waiting', createdAt: new Date(now - 1 * 60 * 1000).toISOString() },
    ];
    const setMemoryGames = jest.fn();
    const logger = makeLogger();

    registerGameCleanupJobs({
      pool: { query: jest.fn() },
      isDbConnected: jest.fn().mockResolvedValue(false),
      getMemoryGames: () => games,
      setMemoryGames,
      logger,
    });

    await capture.handlers[0]();

    expect(setMemoryGames).not.toHaveBeenCalled();
  });

  it('memory path: handles missing createdAt by treating game as fresh', async () => {
    capture = captureIntervals();
    const games = [{ id: 1, status: 'waiting' /* no createdAt */ }];
    const setMemoryGames = jest.fn();
    const logger = makeLogger();

    registerGameCleanupJobs({
      pool: { query: jest.fn() },
      isDbConnected: jest.fn().mockResolvedValue(false),
      getMemoryGames: () => games,
      setMemoryGames,
      logger,
    });

    await capture.handlers[0]();

    // Defaults to Date.now() which is > threshold → keep
    expect(setMemoryGames).not.toHaveBeenCalled();
  });
});

describe('gameCleanupJobs — stuck active games', () => {
  let capture;
  afterEach(() => {
    capture?.restore();
  });

  it('DB path: warns per stuck row and force-closes them via single UPDATE', async () => {
    capture = captureIntervals();
    const stuckRows = [
      {
        id: 11,
        host_name: 'Alice',
        guest_name: 'Bob',
        game_type: 'Nişancı Düellosu',
        points: 30,
        status: 'active',
        created_at: '2026-05-11T08:00:00Z',
        game_state: { settlementApplied: false },
      },
      {
        id: 12,
        host_name: 'Carol',
        guest_name: null,
        game_type: 'Bilgi Yarışı',
        points: 10,
        status: 'waiting',
        created_at: '2026-05-11T08:30:00Z',
        game_state: null,
      },
    ];
    const pool = {
      query: jest
        .fn()
        // SELECT stuck rows
        .mockResolvedValueOnce({ rowCount: stuckRows.length, rows: stuckRows })
        // UPDATE sweep
        .mockResolvedValueOnce({ rowCount: stuckRows.length }),
    };
    const logger = makeLogger();

    registerGameCleanupJobs({
      pool,
      isDbConnected: jest.fn().mockResolvedValue(true),
      getMemoryGames: jest.fn(),
      setMemoryGames: jest.fn(),
      logger,
    });

    // Second handler is the stuck-active cleanup
    await capture.handlers[1]();

    // One warn per row
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      'Force-closing stuck game without settlement',
      expect.objectContaining({ gameId: 11, host: 'Alice', guest: 'Bob' })
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Force-closing stuck game without settlement',
      expect.objectContaining({ gameId: 12, host: 'Carol' })
    );
    // UPDATE issued
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[1][0]).toMatch(/UPDATE games\s+SET status = 'finished'/);
    expect(logger.info).toHaveBeenCalledWith('Force-closed 2 stuck game(s).');
  });

  it('DB path: reports settlementApplied=true in the warn note when set', async () => {
    capture = captureIntervals();
    const stuckRows = [
      {
        id: 99,
        host_name: 'X',
        guest_name: 'Y',
        game_type: 'Retro Satranç',
        points: 20,
        status: 'active',
        created_at: '2026-05-11T08:00:00Z',
        game_state: { settlementApplied: true, stakeTransferred: 20 },
      },
    ];
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: stuckRows })
        .mockResolvedValueOnce({ rowCount: 1 }),
    };
    const logger = makeLogger();

    registerGameCleanupJobs({
      pool,
      isDbConnected: jest.fn().mockResolvedValue(true),
      getMemoryGames: jest.fn(),
      setMemoryGames: jest.fn(),
      logger,
    });

    await capture.handlers[1]();

    expect(logger.warn).toHaveBeenCalledWith(
      'Force-closing stuck game without settlement',
      expect.objectContaining({
        settlementApplied: true,
        note: 'settlement was already applied before timeout',
      })
    );
  });

  it('DB path: no-op when no stuck rows match', async () => {
    capture = captureIntervals();
    const pool = {
      query: jest.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] }),
    };
    const logger = makeLogger();

    registerGameCleanupJobs({
      pool,
      isDbConnected: jest.fn().mockResolvedValue(true),
      getMemoryGames: jest.fn(),
      setMemoryGames: jest.fn(),
      logger,
    });

    await capture.handlers[1]();

    expect(logger.warn).not.toHaveBeenCalled();
    // Only the SELECT happened, no UPDATE
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('DB path: skips entirely when DB is not connected', async () => {
    capture = captureIntervals();
    const pool = { query: jest.fn() };
    const logger = makeLogger();

    registerGameCleanupJobs({
      pool,
      isDbConnected: jest.fn().mockResolvedValue(false),
      getMemoryGames: jest.fn(),
      setMemoryGames: jest.fn(),
      logger,
    });

    await capture.handlers[1]();

    expect(pool.query).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('DB path: swallows query errors (logs and continues)', async () => {
    capture = captureIntervals();
    const pool = { query: jest.fn().mockRejectedValue(new Error('cluster down')) };
    const logger = makeLogger();

    registerGameCleanupJobs({
      pool,
      isDbConnected: jest.fn().mockResolvedValue(true),
      getMemoryGames: jest.fn(),
      setMemoryGames: jest.fn(),
      logger,
    });

    await capture.handlers[1]();

    expect(logger.error).toHaveBeenCalledWith('Cleanup error (stuck games):', expect.any(Error));
  });

  it('locks in the design contract: stake is never transferred during cleanup', async () => {
    // This test exists to make any future "let's silently auto-settle stuck
    // games" change visible as a deliberate red-test. If you're updating this
    // expectation, you are changing the production money-flow contract and
    // should add explicit settlement coverage + an opt-in flag.
    capture = captureIntervals();
    const stuckRows = [
      {
        id: 1,
        host_name: 'Alice',
        guest_name: 'Bob',
        game_type: 'Nişancı Düellosu',
        points: 100, // significant stake
        status: 'active',
        created_at: '2026-05-11T08:00:00Z',
        game_state: { settlementApplied: false }, // not yet settled
      },
    ];
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rowCount: 1, rows: stuckRows })
        .mockResolvedValueOnce({ rowCount: 1 }),
    };
    const logger = makeLogger();

    registerGameCleanupJobs({
      pool,
      isDbConnected: jest.fn().mockResolvedValue(true),
      getMemoryGames: jest.fn(),
      setMemoryGames: jest.fn(),
      logger,
    });

    await capture.handlers[1]();

    // No SELECT users / UPDATE users — settlement queries should never appear
    const settlementQueries = pool.query.mock.calls.filter(
      ([sql]) => /FROM\s+users/i.test(sql) || /UPDATE\s+users\s+SET\s+points/i.test(sql)
    );
    expect(settlementQueries).toHaveLength(0);
  });
});
