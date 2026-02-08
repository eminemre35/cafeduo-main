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

  beforeEach(() => {
    memoryUsers = [
      { id: 1, username: 'admin', email: 'admin@test.com', points: 100, role: 'admin', isAdmin: true },
      { id: 2, username: 'user', email: 'user@test.com', points: 40, role: 'user', isAdmin: false },
    ];

    isDbConnected = jest.fn().mockResolvedValue(false);

    handlers = createAdminHandlers({
      pool: { query: jest.fn() },
      isDbConnected,
      bcrypt: { hash: jest.fn().mockResolvedValue('hashed') },
      logger: { error: jest.fn() },
      normalizeCafeCreatePayload,
      normalizeCafeUpdatePayload,
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
    expect(String(res.payload.error)).toContain('Kendi hesabınızı');
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
});

