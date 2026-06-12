/** @jest-environment node */

jest.mock('../config/redis', () => ({
  get: jest.fn(),
  setex: jest.fn(),
  scan: jest.fn(),
  del: jest.fn(),
}));
jest.mock('../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockRedis = require('../config/redis');
const { cache, clearCache } = require('./cache');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildReq = (overrides = {}) => ({
  method: 'GET',
  originalUrl: '/api/cafes',
  url: '/api/cafes',
  ...overrides,
});

const buildRes = () => {
  const res = {
    statusCode: 200,
    _body: null,
    json: jest.fn(function (body) {
      res._body = body;
      return res;
    }),
    status: jest.fn(function (code) {
      res.statusCode = code;
      return res;
    }),
  };
  return res;
};

// ---------------------------------------------------------------------------
// cache() middleware
// ---------------------------------------------------------------------------

describe('cache middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Cache HIT ---
  it('returns cached data directly and does NOT call next on cache hit', async () => {
    const cachedPayload = { id: 1, name: 'Filtre Kafe' };
    mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedPayload));

    const req = buildReq({ originalUrl: '/api/cafes' });
    const res = buildRes();
    const next = jest.fn();

    await cache(300)(req, res, next);

    expect(mockRedis.get).toHaveBeenCalledWith('cache:/api/cafes');
    expect(res.json).toHaveBeenCalledWith(cachedPayload);
    expect(next).not.toHaveBeenCalled();
  });

  it('uses req.url as fallback key when originalUrl is absent', async () => {
    const cachedPayload = { ok: true };
    mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedPayload));

    const req = { method: 'GET', url: '/api/users' }; // no originalUrl
    const res = buildRes();
    const next = jest.fn();

    await cache()(req, res, next);

    expect(mockRedis.get).toHaveBeenCalledWith('cache:/api/users');
    expect(next).not.toHaveBeenCalled();
  });

  // --- Cache MISS ---
  it('calls next and writes response to redis on cache miss', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockRedis.setex.mockResolvedValueOnce('OK');

    const req = buildReq({ originalUrl: '/api/cafes/1' });
    const res = buildRes();
    const next = jest.fn();

    await cache(60)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);

    // Simulate the route handler calling res.json
    const responseBody = { id: 1, name: 'Test Cafe' };
    res.json(responseBody);

    // Wait for the fire-and-forget setex promise
    await Promise.resolve();

    expect(mockRedis.setex).toHaveBeenCalledWith(
      'cache:/api/cafes/1',
      60,
      JSON.stringify(responseBody)
    );
  });

  it('uses default TTL of 300 seconds when no duration is provided', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockRedis.setex.mockResolvedValueOnce('OK');

    const req = buildReq({ originalUrl: '/api/leaderboard' });
    const res = buildRes();
    const next = jest.fn();

    await cache()(req, res, next);
    res.json({ scores: [] });
    await Promise.resolve();

    expect(mockRedis.setex).toHaveBeenCalledWith(
      'cache:/api/leaderboard',
      300,
      JSON.stringify({ scores: [] })
    );
  });

  it('does NOT write to redis for non-2xx responses on cache miss', async () => {
    mockRedis.get.mockResolvedValueOnce(null);

    const req = buildReq({ originalUrl: '/api/missing' });
    const res = buildRes();
    res.statusCode = 404;
    const next = jest.fn();

    await cache(300)(req, res, next);
    res.json({ error: 'not found' });
    await Promise.resolve();

    expect(mockRedis.setex).not.toHaveBeenCalled();
  });

  // --- Non-GET bypass ---
  it('skips caching and calls next immediately for non-GET methods', async () => {
    const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    for (const method of methods) {
      jest.clearAllMocks();
      const req = buildReq({ method });
      const res = buildRes();
      const next = jest.fn();

      await cache(300)(req, res, next);

      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    }
  });

  // --- Redis error graceful fallback ---
  it('calls next and does NOT throw when redis.get rejects (graceful fallback)', async () => {
    mockRedis.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const req = buildReq({ originalUrl: '/api/cafes' });
    const res = buildRes();
    const next = jest.fn();

    await cache(300)(req, res, next);

    // Request must still be served
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('logs error but continues when redis.setex rejects during cache write', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockRedis.setex.mockRejectedValueOnce(new Error('Redis write timeout'));

    const req = buildReq({ originalUrl: '/api/cafes/2' });
    const res = buildRes();
    const next = jest.fn();

    await cache(300)(req, res, next);
    res.json({ id: 2 });

    // Allow the catch to fire
    await new Promise((r) => setTimeout(r, 0));

    const logger = require('../utils/logger');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Redis set error'));
  });
});

// ---------------------------------------------------------------------------
// clearCache (clearCacheByPattern via SCAN)
// ---------------------------------------------------------------------------

describe('clearCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes all keys matching the pattern in a single scan page', async () => {
    mockRedis.scan.mockResolvedValueOnce(['0', ['cache:/api/cafes', 'cache:/api/cafes/1']]);
    mockRedis.del.mockResolvedValueOnce(2);

    await clearCache('cache:/api/cafes*');

    expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'cache:/api/cafes*', 'COUNT', 100);
    expect(mockRedis.del).toHaveBeenCalledWith('cache:/api/cafes', 'cache:/api/cafes/1');
  });

  it('iterates multiple SCAN pages until cursor returns "0"', async () => {
    // First page: cursor=1 (not done yet)
    mockRedis.scan
      .mockResolvedValueOnce(['1', ['cache:/api/cafes/1', 'cache:/api/cafes/2']])
      .mockResolvedValueOnce(['0', ['cache:/api/cafes/3']]);
    mockRedis.del.mockResolvedValue(1);

    await clearCache('cache:/api/cafes*');

    expect(mockRedis.scan).toHaveBeenCalledTimes(2);
    // Second scan must use cursor '1' returned by first call
    expect(mockRedis.scan).toHaveBeenNthCalledWith(
      2,
      '1',
      'MATCH',
      'cache:/api/cafes*',
      'COUNT',
      100
    );
    expect(mockRedis.del).toHaveBeenCalledTimes(1);
    // All 3 keys should be batched into one del call
    expect(mockRedis.del).toHaveBeenCalledWith(
      'cache:/api/cafes/1',
      'cache:/api/cafes/2',
      'cache:/api/cafes/3'
    );
  });

  it('flushes batch when it reaches 100 keys and then flushes remainder', async () => {
    // 100 keys in first page → triggers intermediate flush
    const firstBatch = Array.from({ length: 100 }, (_, i) => `cache:/api/k${i}`);
    const remainder = ['cache:/api/k100', 'cache:/api/k101'];

    mockRedis.scan.mockResolvedValueOnce(['1', firstBatch]).mockResolvedValueOnce(['0', remainder]);
    mockRedis.del.mockResolvedValue(1);

    await clearCache('cache:/api/*');

    expect(mockRedis.del).toHaveBeenCalledTimes(2);
    expect(mockRedis.del).toHaveBeenNthCalledWith(1, ...firstBatch);
    expect(mockRedis.del).toHaveBeenNthCalledWith(2, ...remainder);
  });

  it('does nothing and does not throw when no keys match the pattern', async () => {
    mockRedis.scan.mockResolvedValueOnce(['0', []]);

    await expect(clearCache('cache:/api/nonexistent*')).resolves.toBeUndefined();
    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  it('does not throw when redis.scan rejects (graceful error handling)', async () => {
    mockRedis.scan.mockRejectedValueOnce(new Error('Redis scan failed'));

    await expect(clearCache('cache:/api/cafes*')).resolves.toBeUndefined();

    const logger = require('../utils/logger');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Redis clear cache error'));
  });
});
