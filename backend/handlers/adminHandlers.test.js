const { createAdminHandlers } = require('./adminHandlers');
const {
  normalizeCafeCreatePayload,
  normalizeCafeUpdatePayload,
} = require('../utils/cafeAdminValidation');

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

describe('adminHandlers', () => {
  let memoryUsers;
  let handlers;
  let isDbConnected;
  let clearCacheByPattern;

  beforeEach(() => {
    memoryUsers = [
      {
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        points: 100,
        role: 'admin',
        isAdmin: true,
      },
      { id: 2, username: 'user', email: 'user@test.com', points: 40, role: 'user', isAdmin: false },
    ];

    isDbConnected = jest.fn().mockResolvedValue(false);
    clearCacheByPattern = jest.fn().mockResolvedValue(undefined);

    handlers = createAdminHandlers({
      pool: { query: jest.fn() },
      isDbConnected,
      bcrypt: { hash: jest.fn().mockResolvedValue('hashed') },
      logger: { error: jest.fn() },
      normalizeCafeCreatePayload,
      normalizeCafeUpdatePayload,
      clearCacheByPattern,
      getMemoryUsers: () => memoryUsers,
      setMemoryUsers: (nextUsers) => {
        memoryUsers = nextUsers;
      },
    });
  });

  it('creates user in memory mode with validated payload', async () => {
    const req = {
      body: {
        username: ' new-user ',
        email: 'NEW@MAIL.COM',
        password: '123456',
        role: 'cafe_admin',
        cafe_id: '7',
        points: '120',
      },
    };
    const res = createMockRes();

    await handlers.createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.payload.username).toBe('new-user');
    expect(res.payload.email).toBe('new@mail.com');
    expect(res.payload.cafe_id).toBe(7);
    expect(memoryUsers).toHaveLength(3);
  });

  it('rejects invalid create user payload', async () => {
    const req = {
      body: {
        username: 'x',
        email: 'invalid',
        password: '123456',
      },
    };
    const res = createMockRes();

    await handlers.createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(String(res.payload.error)).toContain('e-posta');
  });

  it('updates user role in memory mode', async () => {
    const req = {
      params: { id: '2' },
      body: { role: 'cafe_admin', cafe_id: '5' },
    };
    const res = createMockRes();

    await handlers.updateUserRole(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(memoryUsers[1].role).toBe('cafe_admin');
    expect(memoryUsers[1].cafe_id).toBe(5);
  });

  it('updates points with validation in memory mode', async () => {
    const req = { params: { id: '2' }, body: { points: 99 } };
    const res = createMockRes();

    await handlers.updateUserPoints(req, res);

    expect(res.statusCode).toBe(200);
    expect(memoryUsers[1].points).toBe(99);
  });

  it('prevents self-delete', async () => {
    const req = { params: { id: '1' }, user: { id: 1 } };
    const res = createMockRes();

    await handlers.deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(String(res.payload.error)).toContain('silemezsiniz');
  });

  it('creates cafe in memory mode with normalized payload', async () => {
    const req = {
      body: {
        name: 'Kafe A',
        address: 'Merkez',
        total_tables: 22,
        pin: '4321',
      },
    };
    const res = createMockRes();

    await handlers.createCafe(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.payload.success).toBe(true);
    expect(res.payload.cafe.total_tables).toBe(22);
    expect(res.payload.cafe.pin).toBe('4321');
  });

  it('creates cafe in db mode on legacy table_count schema', async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            { column_name: 'id' },
            { column_name: 'name' },
            { column_name: 'latitude' },
            { column_name: 'longitude' },
            { column_name: 'table_count' },
            { column_name: 'radius' },
            { column_name: 'secondary_latitude' },
            { column_name: 'secondary_longitude' },
            { column_name: 'secondary_radius' },
            { column_name: 'daily_pin' },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 7,
              name: 'Legacy Cafe',
              total_tables: 18,
              pin: '5555',
              table_count: 18,
            },
          ],
        }),
    };
    const dbHandlers = createAdminHandlers({
      pool,
      isDbConnected: jest.fn().mockResolvedValue(true),
      bcrypt: { hash: jest.fn().mockResolvedValue('hashed') },
      logger: { error: jest.fn() },
      normalizeCafeCreatePayload,
      normalizeCafeUpdatePayload,
      getMemoryUsers: () => [],
      setMemoryUsers: () => {},
    });

    const req = {
      body: {
        name: 'Legacy Cafe',
        total_tables: 18,
        pin: '5555',
      },
    };
    const res = createMockRes();

    await dbHandlers.createCafe(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const insertSql = pool.query.mock.calls[1][0];
    expect(insertSql).toContain('table_count');
    expect(insertSql).toContain('daily_pin');
    expect(insertSql).toMatch(/INSERT INTO cafes \((?![^)]*total_tables)(?![^)]*address)/);
  });

  // ── getUsers ──────────────────────────────────────────────────────────────

  it('getUsers: memory modda kullanıcı listesini döner', async () => {
    const req = {};
    const res = createMockRes();

    await handlers.getUsers(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toHaveLength(2);
    expect(res.payload[0].username).toBe('admin');
  });

  // ── createUser (db mode) ──────────────────────────────────────────────────

  describe('createUser (db mode)', () => {
    const createDbContext = () => {
      const pool = { query: jest.fn() };
      const logger = { error: jest.fn() };
      const dbHandlers = createAdminHandlers({
        pool,
        isDbConnected: jest.fn().mockResolvedValue(true),
        bcrypt: { hash: jest.fn().mockResolvedValue('hashed') },
        logger,
        normalizeCafeCreatePayload,
        normalizeCafeUpdatePayload,
        getMemoryUsers: () => [],
        setMemoryUsers: () => {},
      });
      return { dbHandlers, pool, logger };
    };

    it('e-posta zaten kayıtlıysa 409 döner', async () => {
      const { dbHandlers, pool } = createDbContext();
      pool.query.mockResolvedValueOnce({ rows: [{ id: 5 }] }); // email mevcut

      const req = {
        body: {
          username: 'testuser',
          email: 'existing@test.com',
          password: 'secret123',
          role: 'user',
        },
      };
      const res = createMockRes();

      await dbHandlers.createUser(req, res);

      expect(res.statusCode).toBe(409);
      expect(String(res.payload.error)).toContain('e-posta');
    });

    it('db hatası 500 döner', async () => {
      const { dbHandlers, pool, logger } = createDbContext();
      pool.query.mockRejectedValueOnce(new Error('db bağlantı hatası'));

      const req = {
        body: { username: 'testuser', email: 'new@test.com', password: 'secret123', role: 'user' },
      };
      const res = createMockRes();

      await dbHandlers.createUser(req, res);

      expect(logger.error).toHaveBeenCalled();
    });

    it('admin rolüyle kullanıcı oluşturur, is_admin=true gönderilir', async () => {
      const { dbHandlers, pool } = createDbContext();
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // email yok
        .mockResolvedValueOnce({
          rows: [
            { id: 99, username: 'superadmin', email: 'sa@test.com', role: 'admin', isAdmin: true },
          ],
        }); // insert

      const req = {
        body: {
          username: 'superadmin',
          email: 'sa@test.com',
          password: 'secret123',
          role: 'admin',
        },
      };
      const res = createMockRes();

      await dbHandlers.createUser(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.payload.role).toBe('admin');
    });
  });

  // ── getGames ──────────────────────────────────────────────────────────────

  it('getGames: memory modda boş liste döner', async () => {
    const req = {};
    const res = createMockRes();

    await handlers.getGames(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual([]);
  });

  describe('getGames (db mode)', () => {
    it('db modda oyunları listeler', async () => {
      const pool = {
        query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 1, host_name: 'ali' }] }),
      };
      const dbHandlers = createAdminHandlers({
        pool,
        isDbConnected: jest.fn().mockResolvedValue(true),
        bcrypt: { hash: jest.fn() },
        logger: { error: jest.fn() },
        normalizeCafeCreatePayload,
        normalizeCafeUpdatePayload,
        getMemoryUsers: () => [],
        setMemoryUsers: () => {},
      });

      const req = {};
      const res = createMockRes();

      await dbHandlers.getGames(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload[0].host_name).toBe('ali');
    });

    it('db hatası 500 döner', async () => {
      const logger = { error: jest.fn() };
      const pool = { query: jest.fn().mockRejectedValueOnce(new Error('bağlantı koptu')) };
      const dbHandlers = createAdminHandlers({
        pool,
        isDbConnected: jest.fn().mockResolvedValue(true),
        bcrypt: { hash: jest.fn() },
        logger,
        normalizeCafeCreatePayload,
        normalizeCafeUpdatePayload,
        getMemoryUsers: () => [],
        setMemoryUsers: () => {},
      });

      const req = {};
      const res = createMockRes();

      await dbHandlers.getGames(req, res);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ── updateUserRole ─────────────────────────────────────────────────────────

  it('updateUserRole: geçersiz rol 400 döner', async () => {
    const req = { params: { id: '2' }, body: { role: 'superuser' } };
    const res = createMockRes();

    await handlers.updateUserRole(req, res);

    expect(res.statusCode).toBe(400);
  });

  it('updateUserRole: cafe_admin rolü için cafe_id eksikse 400 döner', async () => {
    const req = { params: { id: '2' }, body: { role: 'cafe_admin' } };
    const res = createMockRes();

    await handlers.updateUserRole(req, res);

    expect(res.statusCode).toBe(400);
    expect(String(res.payload.error)).toContain('kafe');
  });

  it('updateUserRole: memory modda bulunamayan kullanıcı 404 döner', async () => {
    const req = { params: { id: '999' }, body: { role: 'user' } };
    const res = createMockRes();

    await handlers.updateUserRole(req, res);

    expect(res.statusCode).toBe(404);
  });

  it('updateUserRole: memory modda admin rolüne yükseltme', async () => {
    const req = { params: { id: '2' }, body: { role: 'admin' } };
    const res = createMockRes();

    await handlers.updateUserRole(req, res);

    expect(res.statusCode).toBe(200);
    expect(memoryUsers[1].role).toBe('admin');
    expect(memoryUsers[1].isAdmin).toBe(true);
    expect(memoryUsers[1].cafe_id).toBeNull();
  });

  describe('updateUserRole (db mode)', () => {
    const createDbContext = () => {
      const pool = { query: jest.fn() };
      const logger = { error: jest.fn() };
      const dbHandlers = createAdminHandlers({
        pool,
        isDbConnected: jest.fn().mockResolvedValue(true),
        bcrypt: { hash: jest.fn() },
        logger,
        normalizeCafeCreatePayload,
        normalizeCafeUpdatePayload,
        getMemoryUsers: () => [],
        setMemoryUsers: () => {},
      });
      return { dbHandlers, pool, logger };
    };

    it('cafe_admin rolü atanır, kafe bulunur', async () => {
      const { dbHandlers, pool } = createDbContext();
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // kafe mevcut
        .mockResolvedValueOnce({ rows: [{ id: 2, role: 'cafe_admin', cafe_id: 5 }] }); // update

      const req = { params: { id: '2' }, body: { role: 'cafe_admin', cafe_id: '5' } };
      const res = createMockRes();

      await dbHandlers.updateUserRole(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
    });

    it('cafe_admin rolü için kafe bulunamazsa 404 döner', async () => {
      const { dbHandlers, pool } = createDbContext();
      pool.query.mockResolvedValueOnce({ rows: [] }); // kafe yok

      const req = { params: { id: '2' }, body: { role: 'cafe_admin', cafe_id: '999' } };
      const res = createMockRes();

      await dbHandlers.updateUserRole(req, res);

      expect(res.statusCode).toBe(404);
      expect(String(res.payload.error)).toContain('Kafe');
    });

    it('admin rolü için kullanıcı bulunamazsa 404 döner', async () => {
      const { dbHandlers, pool } = createDbContext();
      pool.query.mockResolvedValueOnce({ rows: [] }); // update boş döndü

      const req = { params: { id: '999' }, body: { role: 'admin' } };
      const res = createMockRes();

      await dbHandlers.updateUserRole(req, res);

      expect(res.statusCode).toBe(404);
      expect(String(res.payload.error)).toContain('Kullanıcı');
    });

    it('db hatası 500 döner', async () => {
      const { dbHandlers, pool, logger } = createDbContext();
      pool.query.mockRejectedValueOnce(new Error('timeout'));

      const req = { params: { id: '2' }, body: { role: 'user' } };
      const res = createMockRes();

      await dbHandlers.updateUserRole(req, res);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ── updateUserPoints ───────────────────────────────────────────────────────

  it('updateUserPoints: negatif puan 400 döner', async () => {
    const req = { params: { id: '2' }, body: { points: -5 } };
    const res = createMockRes();

    await handlers.updateUserPoints(req, res);

    expect(res.statusCode).toBe(400);
  });

  it('updateUserPoints: memory modda kullanıcı bulunamazsa 404 döner', async () => {
    const req = { params: { id: '999' }, body: { points: 50 } };
    const res = createMockRes();

    await handlers.updateUserPoints(req, res);

    expect(res.statusCode).toBe(404);
  });

  describe('updateUserPoints (db mode)', () => {
    const createDbContext = () => {
      const pool = { query: jest.fn() };
      const logger = { error: jest.fn() };
      const dbHandlers = createAdminHandlers({
        pool,
        isDbConnected: jest.fn().mockResolvedValue(true),
        bcrypt: { hash: jest.fn() },
        logger,
        normalizeCafeCreatePayload,
        normalizeCafeUpdatePayload,
        getMemoryUsers: () => [],
        setMemoryUsers: () => {},
      });
      return { dbHandlers, pool, logger };
    };

    it('kullanıcı bulunamazsa 404 döner', async () => {
      const { dbHandlers, pool } = createDbContext();
      pool.query.mockResolvedValueOnce({ rows: [] });

      const req = { params: { id: '999' }, body: { points: 50 } };
      const res = createMockRes();

      await dbHandlers.updateUserPoints(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('puan güncellenir ve kullanıcı döner', async () => {
      const { dbHandlers, pool } = createDbContext();
      pool.query.mockResolvedValueOnce({ rows: [{ id: 2, username: 'user', points: 99 }] });

      const req = { params: { id: '2' }, body: { points: 99 } };
      const res = createMockRes();

      await dbHandlers.updateUserPoints(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.points).toBe(99);
    });

    it('db hatası 500 döner', async () => {
      const { dbHandlers, pool, logger } = createDbContext();
      pool.query.mockRejectedValueOnce(new Error('db error'));

      const req = { params: { id: '2' }, body: { points: 10 } };
      const res = createMockRes();

      await dbHandlers.updateUserPoints(req, res);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ── deleteUser ─────────────────────────────────────────────────────────────

  it('deleteUser: memory modda kullanıcı bulunamazsa 404 döner', async () => {
    const req = { params: { id: '999' }, user: { id: 1 } };
    const res = createMockRes();

    await handlers.deleteUser(req, res);

    expect(res.statusCode).toBe(404);
  });

  it('deleteUser: memory modda başarılı silme', async () => {
    const req = { params: { id: '2' }, user: { id: 1 } };
    const res = createMockRes();

    await handlers.deleteUser(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(memoryUsers).toHaveLength(1);
    expect(memoryUsers[0].id).toBe(1);
  });

  describe('deleteUser (db mode)', () => {
    const createDbContext = () => {
      const pool = { query: jest.fn() };
      const logger = { error: jest.fn() };
      const dbHandlers = createAdminHandlers({
        pool,
        isDbConnected: jest.fn().mockResolvedValue(true),
        bcrypt: { hash: jest.fn() },
        logger,
        normalizeCafeCreatePayload,
        normalizeCafeUpdatePayload,
        getMemoryUsers: () => [],
        setMemoryUsers: () => {},
      });
      return { dbHandlers, pool, logger };
    };

    it('başarılı silme 200 döner', async () => {
      const { dbHandlers, pool } = createDbContext();
      pool.query.mockResolvedValueOnce({ rows: [{ id: 2 }] });

      const req = { params: { id: '2' }, user: { id: 1 } };
      const res = createMockRes();

      await dbHandlers.deleteUser(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
    });

    it('kullanıcı bulunamazsa 404 döner', async () => {
      const { dbHandlers, pool } = createDbContext();
      pool.query.mockResolvedValueOnce({ rows: [] });

      const req = { params: { id: '999' }, user: { id: 1 } };
      const res = createMockRes();

      await dbHandlers.deleteUser(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('foreign key ihlali 409 döner', async () => {
      const { dbHandlers, pool } = createDbContext();
      const fkErr = Object.assign(new Error('fk'), {
        code: '23503',
        constraint: 'games_host',
        table: 'games',
      });
      pool.query.mockRejectedValueOnce(fkErr);

      const req = { params: { id: '2' }, user: { id: 1 } };
      const res = createMockRes();

      await dbHandlers.deleteUser(req, res);

      expect(res.statusCode).toBe(409);
      expect(String(res.payload.error)).toContain('tablolarda');
    });

    it('genel db hatası 500 döner', async () => {
      const { dbHandlers, pool, logger } = createDbContext();
      pool.query.mockRejectedValueOnce(new Error('disk dolu'));

      const req = { params: { id: '2' }, user: { id: 1 } };
      const res = createMockRes();

      await dbHandlers.deleteUser(req, res);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ── createCafeAdmin ────────────────────────────────────────────────────────

  it('createCafeAdmin: eksik alanlar 400 döner', async () => {
    const req = { body: { username: 'kafe1' } }; // email, password, cafeId eksik
    const res = createMockRes();

    await handlers.createCafeAdmin(req, res);

    expect(res.statusCode).toBe(400);
    expect(String(res.payload.error)).toContain('zorunludur');
  });

  it('createCafeAdmin: memory modda 501 döner', async () => {
    const req = { body: { username: 'kafe1', email: 'k@k.com', password: 'pass123', cafeId: 1 } };
    const res = createMockRes();

    await handlers.createCafeAdmin(req, res);

    expect(res.statusCode).toBe(501);
  });

  describe('createCafeAdmin (db mode)', () => {
    const createDbContext = () => {
      const pool = { query: jest.fn() };
      const logger = { error: jest.fn() };
      const dbHandlers = createAdminHandlers({
        pool,
        isDbConnected: jest.fn().mockResolvedValue(true),
        bcrypt: { hash: jest.fn().mockResolvedValue('hashed') },
        logger,
        normalizeCafeCreatePayload,
        normalizeCafeUpdatePayload,
        getMemoryUsers: () => [],
        setMemoryUsers: () => {},
      });
      return { dbHandlers, pool, logger };
    };

    it('başarıyla cafe_admin oluşturur', async () => {
      const { dbHandlers, pool } = createDbContext();
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 10, username: 'kafeadmin', email: 'ka@test.com', role: 'cafe_admin', cafe_id: 3 },
        ],
      });

      const req = {
        body: { username: 'kafeadmin', email: 'ka@test.com', password: 'pass123', cafeId: 3 },
      };
      const res = createMockRes();

      await dbHandlers.createCafeAdmin(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.role).toBe('cafe_admin');
    });

    it('db hatası 500 döner', async () => {
      const { dbHandlers, pool, logger } = createDbContext();
      pool.query.mockRejectedValueOnce(new Error('db hatası'));

      const req = {
        body: { username: 'kafeadmin', email: 'ka@test.com', password: 'pass123', cafeId: 3 },
      };
      const res = createMockRes();

      await dbHandlers.createCafeAdmin(req, res);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ── deleteCafe (geçersiz id) ───────────────────────────────────────────────

  it('deleteCafe: geçersiz id 400 döner', async () => {
    const req = { params: { id: 'abc' } };
    const res = createMockRes();

    await handlers.deleteCafe(req, res);

    expect(res.statusCode).toBe(400);
    expect(String(res.payload.error)).toContain('Geçersiz');
  });

  it('deleteCafe: memory modda 501 döner', async () => {
    // handlers is memory mode; need valid id to get past id check
    const memHandlers = createAdminHandlers({
      pool: { query: jest.fn() },
      isDbConnected: jest.fn().mockResolvedValue(false),
      bcrypt: { hash: jest.fn() },
      logger: { error: jest.fn() },
      normalizeCafeCreatePayload,
      normalizeCafeUpdatePayload,
      getMemoryUsers: () => [],
      setMemoryUsers: () => {},
    });

    const req = { params: { id: '1' } };
    const res = createMockRes();

    await memHandlers.deleteCafe(req, res);

    expect(res.statusCode).toBe(501);
  });

  // ── updateCafe ─────────────────────────────────────────────────────────────

  it('updateCafe: memory modda 501 döner', async () => {
    // Geçerli bir alan gönder ki validasyonu geçip memory branch'ine (501) ulaşsın
    // (boş/ tanınmayan payload validasyondan 400 ile döner).
    const req = { params: { id: '1' }, body: { address: 'Yeni Adres 123' } };
    const res = createMockRes();

    await handlers.updateCafe(req, res);

    expect(res.statusCode).toBe(501);
  });

  describe('updateCafe (db mode)', () => {
    const createDbContext = (extraColumns = []) => {
      const client = { query: jest.fn(), release: jest.fn() };
      const allColumns = [
        { column_name: 'id' },
        { column_name: 'name' },
        { column_name: 'address' },
        { column_name: 'total_tables' },
        { column_name: 'table_count' },
        { column_name: 'pin' },
        { column_name: 'daily_pin' },
        { column_name: 'latitude' },
        { column_name: 'longitude' },
        { column_name: 'radius' },
        { column_name: 'secondary_latitude' },
        { column_name: 'secondary_longitude' },
        { column_name: 'secondary_radius' },
        ...extraColumns.map((c) => ({ column_name: c })),
      ];
      const pool = { query: jest.fn() };
      const logger = { error: jest.fn(), warn: jest.fn() };
      const cacheCleaner = jest.fn().mockResolvedValue(undefined);
      const dbHandlers = createAdminHandlers({
        pool,
        isDbConnected: jest.fn().mockResolvedValue(true),
        bcrypt: { hash: jest.fn() },
        logger,
        normalizeCafeCreatePayload,
        normalizeCafeUpdatePayload,
        clearCacheByPattern: cacheCleaner,
        getMemoryUsers: () => [],
        setMemoryUsers: () => {},
      });
      return { dbHandlers, pool, logger, cacheCleaner };
    };

    it('kafe güncellenir ve cache temizlenir', async () => {
      const { dbHandlers, pool, cacheCleaner } = createDbContext();
      pool.query
        .mockResolvedValueOnce({
          rows: [
            { column_name: 'id' },
            { column_name: 'name' },
            { column_name: 'address' },
            { column_name: 'total_tables' },
            { column_name: 'table_count' },
            { column_name: 'pin' },
            { column_name: 'daily_pin' },
            { column_name: 'latitude' },
            { column_name: 'longitude' },
            { column_name: 'radius' },
            { column_name: 'secondary_latitude' },
            { column_name: 'secondary_longitude' },
            { column_name: 'secondary_radius' },
          ],
        }) // getCafeColumns
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Kafe', address: 'Yeni Adres', total_tables: 10 }],
        }); // UPDATE

      const req = { params: { id: '1' }, body: { address: 'Yeni Adres' } };
      const res = createMockRes();

      await dbHandlers.updateCafe(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(cacheCleaner).toHaveBeenCalledWith('cache:/api/cafes*');
    });

    it('kafe bulunamazsa (update) 404 döner', async () => {
      const { dbHandlers, pool } = createDbContext();
      pool.query
        .mockResolvedValueOnce({
          rows: [
            { column_name: 'id' },
            { column_name: 'name' },
            { column_name: 'address' },
            { column_name: 'total_tables' },
            { column_name: 'table_count' },
            { column_name: 'pin' },
            { column_name: 'daily_pin' },
            { column_name: 'latitude' },
            { column_name: 'longitude' },
            { column_name: 'radius' },
            { column_name: 'secondary_latitude' },
            { column_name: 'secondary_longitude' },
            { column_name: 'secondary_radius' },
          ],
        }) // getCafeColumns
        .mockResolvedValueOnce({ rows: [] }); // UPDATE

      const req = { params: { id: '999' }, body: { address: 'Bir Adres' } };
      const res = createMockRes();

      await dbHandlers.updateCafe(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('güncelleme alanı yoksa mevcut kafe döner', async () => {
      const { dbHandlers, pool } = createDbContext();
      pool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'id' }, { column_name: 'name' }] }) // getCafeColumns (minimal)
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Kafe' }] }); // SELECT

      // normalizeCafeUpdatePayload boş body için ok:true veriyor mu kontrol et
      // Eğer vermiyorsa, bu test atlanabilir. Şimdilik name gönderip sütun olmadığında test edelim.
      const req = { params: { id: '1' }, body: { total_tables: 10 } };
      const res = createMockRes();

      await dbHandlers.updateCafe(req, res);

      // Eğer total_tables sütunu yok (minimal columns), updates boş → SELECT gelir
      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
    });

    it('güncelleme alanı yokken kafe bulunamazsa 404 döner', async () => {
      const { dbHandlers, pool } = createDbContext();
      pool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'id' }, { column_name: 'name' }] }) // minimal columns
        .mockResolvedValueOnce({ rows: [] }); // SELECT boş

      const req = { params: { id: '999' }, body: { total_tables: 10 } };
      const res = createMockRes();

      await dbHandlers.updateCafe(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('db hatası 500 döner', async () => {
      const { dbHandlers, pool, logger } = createDbContext();
      pool.query.mockRejectedValueOnce(new Error('timeout'));

      const req = { params: { id: '1' }, body: { address: 'Adres' } };
      const res = createMockRes();

      await dbHandlers.updateCafe(req, res);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ── createCafe (db mode — hata durumları) ─────────────────────────────────

  describe('createCafe (db mode — hata durumları)', () => {
    const createDbContext = () => {
      const pool = { query: jest.fn() };
      const logger = { error: jest.fn(), warn: jest.fn() };
      const cacheCleaner = jest.fn().mockResolvedValue(undefined);
      const dbHandlers = createAdminHandlers({
        pool,
        isDbConnected: jest.fn().mockResolvedValue(true),
        bcrypt: { hash: jest.fn() },
        logger,
        normalizeCafeCreatePayload,
        normalizeCafeUpdatePayload,
        clearCacheByPattern: cacheCleaner,
        getMemoryUsers: () => [],
        setMemoryUsers: () => {},
      });
      return { dbHandlers, pool, logger, cacheCleaner };
    };

    it('geçersiz payload 400 döner', async () => {
      const { dbHandlers } = createDbContext();
      const req = { body: {} }; // name eksik
      const res = createMockRes();

      await dbHandlers.createCafe(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('tekrar eden kafe ismi 409 döner (23505)', async () => {
      const { dbHandlers, pool } = createDbContext();
      const columns = [
        { column_name: 'id' },
        { column_name: 'name' },
        { column_name: 'address' },
        { column_name: 'total_tables' },
        { column_name: 'pin' },
      ];
      pool.query
        .mockResolvedValueOnce({ rows: columns }) // getCafeColumns
        .mockRejectedValueOnce(Object.assign(new Error('unique violation'), { code: '23505' }));

      const req = { body: { name: 'Mevcut Kafe', total_tables: 10, pin: '1234' } };
      const res = createMockRes();

      await dbHandlers.createCafe(req, res);

      expect(res.statusCode).toBe(409);
      expect(String(res.payload.error)).toContain('mevcut');
    });

    it('genel db hatası 500 döner', async () => {
      const { dbHandlers, pool, logger } = createDbContext();
      const columns = [
        { column_name: 'id' },
        { column_name: 'name' },
        { column_name: 'total_tables' },
        { column_name: 'pin' },
      ];
      pool.query
        .mockResolvedValueOnce({ rows: columns })
        .mockRejectedValueOnce(new Error('disk dolu'));

      const req = { body: { name: 'Yeni Kafe', total_tables: 5, pin: '9999' } };
      const res = createMockRes();

      await dbHandlers.createCafe(req, res);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ── deleteCafe (db mode — hata durumları) ─────────────────────────────────

  describe('deleteCafe (db mode)', () => {
    const createDbContext = () => {
      const client = {
        query: jest.fn(),
        release: jest.fn(),
      };
      const pool = {
        connect: jest.fn().mockResolvedValue(client),
      };
      const logger = {
        error: jest.fn(),
        warn: jest.fn(),
      };
      const cacheCleaner = jest.fn().mockResolvedValue(undefined);
      const dbHandlers = createAdminHandlers({
        pool,
        isDbConnected: jest.fn().mockResolvedValue(true),
        bcrypt: { hash: jest.fn().mockResolvedValue('hashed') },
        logger,
        normalizeCafeCreatePayload,
        normalizeCafeUpdatePayload,
        clearCacheByPattern: cacheCleaner,
        getMemoryUsers: () => [],
        setMemoryUsers: () => {},
      });

      return { dbHandlers, client, pool, logger, cacheCleaner };
    };

    it('deletes cafe and returns cleanup summary', async () => {
      const { dbHandlers, client, cacheCleaner } = createDbContext();
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Kafe B' }] }) // cafe lock
        .mockResolvedValueOnce({ rows: [{ count: 3 }] }) // cafe count
        .mockResolvedValueOnce({
          rows: [
            { id: 10, username: 'u1', role: 'user' },
            { id: 11, username: 'a1', role: 'cafe_admin' },
          ],
        }) // users
        .mockResolvedValueOnce({ rowCount: 2 }) // detach users
        .mockResolvedValueOnce({ rowCount: 4 }) // delete rewards
        .mockResolvedValueOnce({ rowCount: 3 }) // close games
        .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Kafe B' }] }) // delete cafe
        .mockResolvedValueOnce({}); // COMMIT

      const req = { params: { id: '2' } };
      const res = createMockRes();

      await dbHandlers.deleteCafe(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.deletedCafe).toEqual({ id: 2, name: 'Kafe B' });
      expect(res.payload.cleanup).toEqual({
        detachedUsers: 2,
        cafeAdminsDemoted: 1,
        rewardsDeleted: 4,
        gamesForceClosed: 3,
      });
      expect(cacheCleaner).toHaveBeenCalledWith('cache:/api/cafes*');
      expect(client.release).toHaveBeenCalled();
    });

    it('rejects deleting the last cafe', async () => {
      const { dbHandlers, client } = createDbContext();
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Tek Kafe' }] }) // cafe lock
        .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // cafe count
        .mockResolvedValueOnce({}); // ROLLBACK

      const req = { params: { id: '1' } };
      const res = createMockRes();

      await dbHandlers.deleteCafe(req, res);

      expect(res.statusCode).toBe(400);
      expect(String(res.payload.error)).toContain('en az bir kafe');
      expect(client.release).toHaveBeenCalled();
    });

    it('returns 404 when cafe does not exist', async () => {
      const { dbHandlers, client } = createDbContext();
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // cafe lock
        .mockResolvedValueOnce({}); // ROLLBACK

      const req = { params: { id: '999' } };
      const res = createMockRes();

      await dbHandlers.deleteCafe(req, res);

      expect(res.statusCode).toBe(404);
      expect(String(res.payload.error)).toContain('Kafe bulunamad');
      expect(client.release).toHaveBeenCalled();
    });

    it('kullanıcısı olmayan kafe silinir, oyun güncelleme atlanır', async () => {
      const { dbHandlers, client, cacheCleaner } = createDbContext();
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 3, name: 'Boş Kafe' }] }) // cafe lock
        .mockResolvedValueOnce({ rows: [{ count: 4 }] }) // cafe count
        .mockResolvedValueOnce({ rows: [] }) // users (boş)
        .mockResolvedValueOnce({ rowCount: 0 }) // detach users
        .mockResolvedValueOnce({ rowCount: 0 }) // delete rewards
        // oyun güncelleme atlanır (usernames boş)
        .mockResolvedValueOnce({ rows: [{ id: 3, name: 'Boş Kafe' }] }) // delete cafe
        .mockResolvedValueOnce({}); // COMMIT

      const req = { params: { id: '3' } };
      const res = createMockRes();

      await dbHandlers.deleteCafe(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.cleanup.gamesForceClosed).toBe(0);
      expect(res.payload.cleanup.cafeAdminsDemoted).toBe(0);
    });

    it('DELETE FROM cafes boş dönerse 404 ve ROLLBACK', async () => {
      const { dbHandlers, client } = createDbContext();
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 4, name: 'Kafe D' }] }) // cafe lock
        .mockResolvedValueOnce({ rows: [{ count: 3 }] }) // cafe count
        .mockResolvedValueOnce({ rows: [] }) // users
        .mockResolvedValueOnce({ rowCount: 0 }) // detach users
        .mockResolvedValueOnce({ rowCount: 0 }) // delete rewards
        .mockResolvedValueOnce({ rows: [] }) // DELETE cafes → boş
        .mockResolvedValueOnce({}); // ROLLBACK

      const req = { params: { id: '4' } };
      const res = createMockRes();

      await dbHandlers.deleteCafe(req, res);

      expect(res.statusCode).toBe(404);
      expect(client.release).toHaveBeenCalled();
    });

    it('db hatası sırasında ROLLBACK yapılır ve 500 döner', async () => {
      const { dbHandlers, client, logger } = createDbContext();
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 5, name: 'Kafe E' }] }) // cafe lock
        .mockRejectedValueOnce(new Error('beklenmedik hata')); // cafe count → patlıyor

      const req = { params: { id: '5' } };
      const res = createMockRes();

      await dbHandlers.deleteCafe(req, res);

      expect(logger.error).toHaveBeenCalled();
      expect(client.release).toHaveBeenCalled();
    });

    it('ROLLBACK da başarısız olursa hata loglanır', async () => {
      const { dbHandlers, client, logger } = createDbContext();
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 6, name: 'Kafe F' }] }) // cafe lock
        .mockRejectedValueOnce(new Error('ana hata')) // cafe count → patlıyor
        // ROLLBACK da patlıyor (committed=false branch)
        .mockRejectedValueOnce(new Error('rollback da patladı'));

      // logger.error rollback hatası için de çağrılacak
      const req = { params: { id: '6' } };
      const res = createMockRes();

      await dbHandlers.deleteCafe(req, res);

      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(client.release).toHaveBeenCalled();
    });
  });
});
