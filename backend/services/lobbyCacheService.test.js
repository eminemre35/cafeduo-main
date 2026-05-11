/**
 * lobbyCacheService unit tests
 *
 * Covers the cache-aside flow + the four mutation invalidators. Redis is
 * faked with an in-memory map so we can assert TTLs, scan iteration, and
 * "graceful when redis is null" semantics without spinning up ioredis.
 */

const { createLobbyCacheService, cacheKeys } = require('./lobbyCacheService');

/** Minimal Redis stand-in: enough surface for getex/setex/scan/del/ttl. */
const makeFakeRedis = () => {
  const store = new Map(); // key -> { value, expiresAt }
  const now = () => Date.now();

  return {
    store,
    async get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt < now()) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async setex(key, seconds, value) {
      store.set(key, { value, expiresAt: now() + seconds * 1000 });
    },
    async del(...keys) {
      let count = 0;
      for (const k of keys) {
        if (store.delete(k)) count += 1;
      }
      return count;
    },
    async scan(cursor, _matchFlag, pattern, _countFlag, _count) {
      // Single-pass: return everything, cursor = '0' to terminate.
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      const keys = Array.from(store.keys()).filter((k) => regex.test(k));
      return ['0', keys];
    },
    async ttl(key) {
      const entry = store.get(key);
      if (!entry) return -2;
      if (!entry.expiresAt) return -1;
      return Math.max(0, Math.ceil((entry.expiresAt - now()) / 1000));
    },
  };
};

describe('cacheKeys', () => {
  it('builds stable namespaced keys', () => {
    expect(cacheKeys.all()).toBe('lobby:all');
    expect(cacheKeys.table('MASA05')).toBe('lobby:table:masa05');
    expect(cacheKeys.cafe(7)).toBe('lobby:cafe:7');
  });
});

describe('lobbyCacheService.getWaitingGames', () => {
  it('returns DB result on cache miss and writes to redis', async () => {
    const redis = makeFakeRedis();
    const svc = createLobbyCacheService({ redisClient: redis });
    const dbFetcher = jest.fn().mockResolvedValue([{ id: 1, status: 'waiting' }]);

    const games = await svc.getWaitingGames({ scope: 'all' }, dbFetcher);

    expect(games).toEqual([{ id: 1, status: 'waiting' }]);
    expect(dbFetcher).toHaveBeenCalledTimes(1);
    // setex is fire-and-forget, give the microtask queue one tick to settle
    await Promise.resolve();
    const cached = await redis.get('lobby:all');
    expect(JSON.parse(cached)).toEqual([{ id: 1, status: 'waiting' }]);
  });

  it('returns cached value on hit without calling DB', async () => {
    const redis = makeFakeRedis();
    await redis.setex('lobby:all', 60, JSON.stringify([{ id: 99, status: 'waiting' }]));
    const svc = createLobbyCacheService({ redisClient: redis });
    const dbFetcher = jest.fn();

    const games = await svc.getWaitingGames({ scope: 'all' }, dbFetcher);

    expect(games).toEqual([{ id: 99, status: 'waiting' }]);
    expect(dbFetcher).not.toHaveBeenCalled();
  });

  it('uses table-scoped key when scope=table', async () => {
    const redis = makeFakeRedis();
    const svc = createLobbyCacheService({ redisClient: redis });
    const dbFetcher = jest.fn().mockResolvedValue([{ id: 2 }]);

    await svc.getWaitingGames({ scope: 'table', tableCode: 'MASA03' }, dbFetcher);
    await Promise.resolve();

    expect(await redis.get('lobby:table:masa03')).toBeTruthy();
    expect(await redis.get('lobby:all')).toBeNull();
  });

  it('uses cafe-scoped key when scope=cafe', async () => {
    const redis = makeFakeRedis();
    const svc = createLobbyCacheService({ redisClient: redis });
    const dbFetcher = jest.fn().mockResolvedValue([{ id: 3 }]);

    await svc.getWaitingGames({ scope: 'cafe', cafeId: 42 }, dbFetcher);
    await Promise.resolve();

    expect(await redis.get('lobby:cafe:42')).toBeTruthy();
  });

  it('falls back to DB when redisClient is null', async () => {
    const svc = createLobbyCacheService({ redisClient: null });
    const dbFetcher = jest.fn().mockResolvedValue([{ id: 5 }]);
    const games = await svc.getWaitingGames({ scope: 'all' }, dbFetcher);
    expect(games).toEqual([{ id: 5 }]);
    expect(dbFetcher).toHaveBeenCalled();
  });

  it('does not crash when redis.get throws', async () => {
    const broken = {
      get: jest.fn().mockRejectedValue(new Error('redis down')),
      setex: jest.fn().mockResolvedValue(undefined),
    };
    const svc = createLobbyCacheService({ redisClient: broken });
    const dbFetcher = jest.fn().mockResolvedValue([{ id: 6 }]);
    const games = await svc.getWaitingGames({ scope: 'all' }, dbFetcher);
    expect(games).toEqual([{ id: 6 }]);
    expect(dbFetcher).toHaveBeenCalled();
  });
});

describe('lobbyCacheService invalidators', () => {
  const seedCache = async (redis) => {
    await redis.setex('lobby:all', 60, JSON.stringify([{ id: 1 }]));
    await redis.setex('lobby:table:masa01', 60, JSON.stringify([{ id: 2 }]));
    await redis.setex('lobby:cafe:7', 60, JSON.stringify([{ id: 3 }]));
    await redis.setex('unrelated:other', 60, JSON.stringify({ ok: true }));
  };

  it('onGameCreated clears every lobby:* key but leaves unrelated keys', async () => {
    const redis = makeFakeRedis();
    await seedCache(redis);
    const svc = createLobbyCacheService({ redisClient: redis });

    await svc.onGameCreated({ tableCode: 'MASA01', cafeId: 7 });

    expect(await redis.get('lobby:all')).toBeNull();
    expect(await redis.get('lobby:table:masa01')).toBeNull();
    expect(await redis.get('lobby:cafe:7')).toBeNull();
    expect(await redis.get('unrelated:other')).toBeTruthy(); // unaffected
  });

  it('onGameJoined / onGameDeleted / onGameFinished all clear lobby:*', async () => {
    const svc = createLobbyCacheService({ redisClient: makeFakeRedis() });
    for (const fn of [svc.onGameJoined, svc.onGameDeleted, svc.onGameFinished]) {
      const redis = makeFakeRedis();
      await seedCache(redis);
      const local = createLobbyCacheService({ redisClient: redis });
      // Use the matching method on the fresh service
      const method =
        fn === svc.onGameJoined
          ? local.onGameJoined
          : fn === svc.onGameDeleted
            ? local.onGameDeleted
            : local.onGameFinished;
      await method({ tableCode: 'MASA01' });
      expect(await redis.get('lobby:all')).toBeNull();
      expect(await redis.get('lobby:table:masa01')).toBeNull();
      expect(await redis.get('unrelated:other')).toBeTruthy();
    }
  });

  it('clearAllCache wipes lobby:* keys', async () => {
    const redis = makeFakeRedis();
    await seedCache(redis);
    const svc = createLobbyCacheService({ redisClient: redis });

    await svc.clearAllCache();

    expect(await redis.get('lobby:all')).toBeNull();
    expect(await redis.get('lobby:table:masa01')).toBeNull();
    expect(await redis.get('lobby:cafe:7')).toBeNull();
    expect(await redis.get('unrelated:other')).toBeTruthy();
  });

  it('is a no-op when redisClient is null', async () => {
    const svc = createLobbyCacheService({ redisClient: null });
    // Should not throw — graceful degradation contract
    await expect(svc.onGameCreated({})).resolves.toBeUndefined();
    await expect(svc.clearAllCache()).resolves.toBeUndefined();
  });

  it('swallows redis errors during invalidation (does not propagate)', async () => {
    const broken = {
      scan: jest.fn().mockRejectedValue(new Error('cluster shutdown')),
      del: jest.fn().mockResolvedValue(0),
    };
    const svc = createLobbyCacheService({ redisClient: broken });
    // Should not throw despite scan rejection — must fail closed for the caller
    await expect(svc.onGameCreated({ tableCode: 'X' })).resolves.toBeUndefined();
  });
});

describe('lobbyCacheService.getCacheStats', () => {
  it('reports enabled:false when redis is null', async () => {
    const svc = createLobbyCacheService({ redisClient: null });
    expect(await svc.getCacheStats()).toEqual({ enabled: false });
  });

  it('returns key count + TTL info when redis is present', async () => {
    const redis = makeFakeRedis();
    await redis.setex('lobby:all', 60, 'x');
    await redis.setex('lobby:table:a', 30, 'y');
    await redis.setex('other:zzz', 60, 'z'); // out of pattern
    const svc = createLobbyCacheService({ redisClient: redis });

    const stats = await svc.getCacheStats();

    expect(stats.enabled).toBe(true);
    expect(stats.keyCount).toBe(2); // only lobby:*
    const keys = stats.keys.map((k) => k.key).sort();
    expect(keys).toEqual(['lobby:all', 'lobby:table:a']);
    stats.keys.forEach(({ ttl }) => {
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });
  });
});
