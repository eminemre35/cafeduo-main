jest.mock('../middleware/cache', () => ({
  clearCache: jest.fn().mockResolvedValue(undefined),
}));

const { createCommerceHandlers } = require('./commerceHandlers');

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

describe('commerceHandlers', () => {
  let memoryItems;
  let memoryRewards;
  let memoryUsers;
  let handlers;
  let isDbConnected;

  beforeEach(() => {
    const now = Date.now();
    memoryItems = [
      {
        id: 1,
        user_id: 5,
        item_id: 11,
        item_title: 'Bedava Kahve',
        code: 'ABC',
        redeemed_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        is_used: false,
      },
      {
        id: 2,
        user_id: 5,
        item_id: 12,
        item_title: 'Eski Kupon',
        code: 'OLD',
        redeemed_at: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(),
        is_used: false,
      },
    ];

    memoryRewards = [
      {
        userId: 5,
        redeemId: 100,
        id: 11,
        title: 'Bedava Kahve',
        cost: 110,
        code: 'X1',
        redeemedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    memoryUsers = [
      {
        id: 5,
        username: 'demo',
        points: 650,
      },
    ];

    isDbConnected = jest.fn().mockResolvedValue(false);
    handlers = createCommerceHandlers({
      pool: { query: jest.fn(), connect: jest.fn() },
      isDbConnected,
      logger: { error: jest.fn() },
      getMemoryItems: () => memoryItems,
      getMemoryRewards: () => memoryRewards,
      getMemoryUsers: () => memoryUsers,
      setMemoryUsers: (nextUsers) => {
        memoryUsers = nextUsers;
      },
    });
  });

  it('filters expired items in memory mode', async () => {
    const req = { params: { id: '5' } };
    const res = createMockRes();

    await handlers.getUserItems(req, res);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.payload)).toBe(true);
    expect(res.payload).toHaveLength(1);
    expect(res.payload[0].status).toBe('active');
  });

  it('marks coupon as used in memory mode', async () => {
    const req = { body: { code: 'ABC' } };
    const res = createMockRes();

    await handlers.useCoupon(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(memoryItems[0].is_used).toBe(true);
  });

  it('returns 400 for invalid coupon in memory mode', async () => {
    const req = { body: { code: 'NOT_FOUND' } };
    const res = createMockRes();

    await handlers.useCoupon(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(String(res.payload.error)).toContain('Kupon');
  });

  it('returns inventory from memory rewards', async () => {
    const req = { user: { id: 5 } };
    const res = createMockRes();

    await handlers.getShopInventory(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toHaveLength(1);
    expect(res.payload[0].title).toBe('Bedava Kahve');
  });

  it('supports buy flow in memory mode when db is disconnected', async () => {
    const req = { user: { id: 5 }, body: { rewardId: 11 } };
    const res = createMockRes();

    await handlers.buyShopItem(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.newPoints).toBe(540);
    expect(memoryUsers[0].points).toBe(540);
    expect(memoryItems[0].user_id).toBe(5);
    expect(memoryItems[0].code).toMatch(/^CD-/);
  });

  // ──────────────────────────────────────────────────────────────
  // buyShopItem — bellek modu hata dalları
  // ──────────────────────────────────────────────────────────────

  it('rewardId olmadan 400 döndürür (bellek modu)', async () => {
    const req = { user: { id: 5 }, body: {} };
    const res = createMockRes();

    await handlers.buyShopItem(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.payload.code).toBe('VALIDATION_ERROR');
  });

  it('olmayan kullanıcı için 404 döndürür (bellek modu)', async () => {
    const req = { user: { id: 999 }, body: { rewardId: 11 } };
    const res = createMockRes();

    await handlers.buyShopItem(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.payload.code).toBe('USER_NOT_FOUND');
  });

  it('olmayan ödül için 404 döndürür (bellek modu)', async () => {
    const req = { user: { id: 5 }, body: { rewardId: 9999 } };
    const res = createMockRes();

    await handlers.buyShopItem(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.payload.code).toBe('REWARD_NOT_FOUND');
  });

  it('yetersiz puan için 400 döndürür (bellek modu)', async () => {
    memoryUsers[0].points = 50;
    const req = { user: { id: 5 }, body: { rewardId: 11 } };
    const res = createMockRes();

    await handlers.buyShopItem(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.payload.code).toBe('INSUFFICIENT_POINTS');
  });

  it('item.id ile de satın alma desteklenir (bellek modu)', async () => {
    const req = { user: { id: 5 }, body: { item: { id: 11 } } };
    const res = createMockRes();

    await handlers.buyShopItem(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // useCoupon — bellek modu ek senaryolar
  // ──────────────────────────────────────────────────────────────

  it('zaten kullanılmış kuponu kabul etmez (bellek modu)', async () => {
    memoryItems[0].is_used = true;
    const req = { body: { code: 'ABC' } };
    const res = createMockRes();

    await handlers.useCoupon(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.payload.code).toBe('COUPON_INVALID');
  });

  it('süresi dolmuş kuponu (8 gün önce) reddeder (bellek modu)', async () => {
    const req = { body: { code: 'OLD' } };
    const res = createMockRes();

    await handlers.useCoupon(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.payload.code).toBe('COUPON_INVALID');
  });

  it('başka kafeye ait kuponu cafe_admin reddeder (bellek modu)', async () => {
    memoryItems[0].cafe_id = 99;
    const req = { body: { code: 'ABC' }, user: { cafe_id: 1, role: 'cafe_admin' } };
    const res = createMockRes();

    await handlers.useCoupon(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.payload.code).toBe('COUPON_INVALID');
  });

  it('super admin başka kafeye ait kuponu onaylayabilir (bellek modu)', async () => {
    memoryItems[0].cafe_id = 99;
    const req = { body: { code: 'ABC' }, user: { role: 'admin', cafe_id: null } };
    const res = createMockRes();

    await handlers.useCoupon(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
  });

  it('cafe_id NULL olan kupon cafe_admin tarafından kullanılabilir (bellek modu)', async () => {
    memoryItems[0].cafe_id = null;
    const req = { body: { code: 'ABC' }, user: { cafe_id: 5, role: 'cafe_admin' } };
    const res = createMockRes();

    await handlers.useCoupon(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // getRewards — bellek modu
  // ──────────────────────────────────────────────────────────────

  it('cafeId olmadan boş dizi döndürür (bellek modu)', async () => {
    const req = { query: {} };
    const res = createMockRes();

    await handlers.getRewards(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual([]);
  });

  it('cafeId ile eşleşen ödülleri döndürür (bellek modu)', async () => {
    memoryRewards[0].cafe_id = 7;
    const req = { query: { cafeId: '7' } };
    const res = createMockRes();

    await handlers.getRewards(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.length).toBeGreaterThan(0);
  });

  it('eşleşen ödül yoksa baseline katalog döndürür (bellek modu)', async () => {
    const req = { query: { cafeId: '42' } };
    const res = createMockRes();

    await handlers.getRewards(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.length).toBe(4);
    expect(res.payload[0].cafe_id).toBe(42);
  });

  // ──────────────────────────────────────────────────────────────
  // setCafeWheel — 410 Gone
  // ──────────────────────────────────────────────────────────────

  it('setCafeWheel her zaman 410 döndürür', async () => {
    const req = {};
    const res = createMockRes();

    await handlers.setCafeWheel(req, res);

    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.payload.code).toBe('WHEEL_NOT_EDITABLE');
  });

  // ──────────────────────────────────────────────────────────────
  // getDailyWheel — bellek modu
  // ──────────────────────────────────────────────────────────────

  it('cafeId olmadan 400 döndürür (getDailyWheel bellek modu)', async () => {
    const req = { user: { id: 5 }, params: {} };
    const res = createMockRes();

    await handlers.getDailyWheel(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.payload.code).toBe('CAFE_ID_REQUIRED');
  });

  it('geçerli cafeId ile çark verilerini döndürür (bellek modu)', async () => {
    const req = { user: { id: 5 }, params: { cafeId: '3' } };
    const res = createMockRes();

    await handlers.getDailyWheel(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.cafeId).toBe(3);
    expect(Array.isArray(res.payload.wheel)).toBe(true);
    expect(res.payload.alreadySpunToday).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────
  // spinDailyWheel — bellek modu 501
  // ──────────────────────────────────────────────────────────────

  it('cafeId olmadan 400 döndürür (spinDailyWheel)', async () => {
    const req = { user: { id: 5 }, params: {} };
    const res = createMockRes();

    await handlers.spinDailyWheel(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.payload.code).toBe('CAFE_ID_REQUIRED');
  });

  it('demo modda çark çevirmeye 501 döndürür', async () => {
    const req = { user: { id: 5 }, params: { cafeId: '3' } };
    const res = createMockRes();

    await handlers.spinDailyWheel(req, res);

    expect(res.status).toHaveBeenCalledWith(501);
    expect(res.payload.code).toBe('NOT_IMPLEMENTED');
  });
});

// ══════════════════════════════════════════════════════════════════
// DB MODU — isDbConnected = true ile
// ══════════════════════════════════════════════════════════════════

const buildDbHandlers = (overrides = {}) => {
  const mockQuery = jest.fn();
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const mockPool = {
    query: mockQuery,
    connect: jest.fn().mockResolvedValue(mockClient),
  };
  const isDbConnected = jest.fn().mockResolvedValue(true);
  const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() };

  const handlers = createCommerceHandlers({
    pool: mockPool,
    isDbConnected,
    logger,
    getMemoryItems: () => [],
    getMemoryRewards: () => [],
    getMemoryUsers: () => [],
    setMemoryUsers: () => {},
    ...overrides,
  });

  return { handlers, mockPool, mockQuery, mockClient, logger };
};

describe('commerceHandlers — DB modu', () => {
  // ──────────────────────────────────────────────────────────────
  // createReward
  // ──────────────────────────────────────────────────────────────

  it('başlık veya maliyet eksikse 400 döndürür', async () => {
    const { handlers } = buildDbHandlers();
    const req = { body: { title: 'Test' } }; // cost eksik
    const res = createMockRes();

    await handlers.createReward(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.payload.code).toBe('VALIDATION_ERROR');
  });

  it('geçerli girdiyle ödül oluşturur', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    const newReward = { id: 1, title: 'Kahve', cost: 200 };
    mockQuery.mockResolvedValueOnce({ rows: [newReward] });

    const req = { body: { title: 'Kahve', cost: 200, cafeId: 1 } };
    const res = createMockRes();

    await handlers.createReward(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.reward).toEqual(newReward);
  });

  it('DB hatası halinde 500 döndürür (createReward)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    mockQuery.mockRejectedValueOnce(new Error('db error'));

    const req = { body: { title: 'Kahve', cost: 200 } };
    const res = createMockRes();

    await handlers.createReward(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ──────────────────────────────────────────────────────────────
  // getRewards
  // ──────────────────────────────────────────────────────────────

  it('cafeId olmadan boş dizi döndürür (DB modu)', async () => {
    const { handlers } = buildDbHandlers();
    const req = { query: {} };
    const res = createMockRes();

    await handlers.getRewards(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual([]);
  });

  it('cafeId ile ödülleri listeler (DB modu)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    // ensureActiveRewardsDb: count > 0 → no seed needed
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 2 }] });
    // getRewards query
    const rewards = [{ id: 1, title: 'Kahve', cost: 200 }];
    mockQuery.mockResolvedValueOnce({ rows: rewards });

    const req = { query: { cafeId: '1' } };
    const res = createMockRes();

    await handlers.getRewards(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual(rewards);
  });

  it('DB hatası halinde 500 döndürür (getRewards)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    mockQuery.mockRejectedValueOnce(new Error('db error'));

    const req = { query: { cafeId: '1' } };
    const res = createMockRes();

    await handlers.getRewards(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ──────────────────────────────────────────────────────────────
  // deleteReward
  // ──────────────────────────────────────────────────────────────

  it('ödülü pasif yapar ve success döndürür', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Kahve', is_active: false }] });

    const req = { params: { id: '1' } };
    const res = createMockRes();

    await handlers.deleteReward(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
  });

  it('olmayan ödül için 404 döndürür (deleteReward)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = { params: { id: '999' } };
    const res = createMockRes();

    await handlers.deleteReward(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.payload.code).toBe('REWARD_NOT_FOUND');
  });

  it('DB hatası halinde 500 döndürür (deleteReward)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    mockQuery.mockRejectedValueOnce(new Error('db error'));

    const req = { params: { id: '1' } };
    const res = createMockRes();

    await handlers.deleteReward(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ──────────────────────────────────────────────────────────────
  // getUserItems — DB modu
  // ──────────────────────────────────────────────────────────────

  it("kullanıcının item'larını status ile döndürür (DB modu)", async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    const rows = [
      {
        id: 1,
        user_id: 5,
        item_id: 11,
        item_title: 'Kahve',
        code: 'ABC',
        redeemed_at: new Date(),
        is_used: false,
        used_at: null,
      },
      {
        id: 2,
        user_id: 5,
        item_id: 12,
        item_title: 'Çay',
        code: 'DEF',
        redeemed_at: new Date(),
        is_used: true,
        used_at: new Date(),
      },
    ];
    mockQuery.mockResolvedValueOnce({ rows });

    const req = { params: { id: '5' } };
    const res = createMockRes();

    await handlers.getUserItems(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload[0].status).toBe('active');
    expect(res.payload[1].status).toBe('used');
  });

  it('DB hatası halinde 500 döndürür (getUserItems)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    mockQuery.mockRejectedValueOnce(new Error('db error'));

    const req = { params: { id: '5' } };
    const res = createMockRes();

    await handlers.getUserItems(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ──────────────────────────────────────────────────────────────
  // getShopInventory — DB modu
  // ──────────────────────────────────────────────────────────────

  it('envanteri döndürür (DB modu)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    const rows = [
      {
        id: 1,
        user_id: 5,
        item_id: 11,
        item_title: 'Kahve',
        code: 'ABC',
        is_used: false,
        redeemed_at: new Date(),
        used_at: null,
      },
    ];
    mockQuery.mockResolvedValueOnce({ rows });

    const req = { user: { id: 5 } };
    const res = createMockRes();

    await handlers.getShopInventory(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload[0].title).toBe('Kahve');
    expect(res.payload[0].code).toBe('ABC');
  });

  it('DB hatası halinde 500 döndürür (getShopInventory)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    mockQuery.mockRejectedValueOnce(new Error('db error'));

    const req = { user: { id: 5 } };
    const res = createMockRes();

    await handlers.getShopInventory(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ──────────────────────────────────────────────────────────────
  // buyShopItem — DB modu: başarılı akış
  // ──────────────────────────────────────────────────────────────

  it('DB modunda başarılı satın alma', async () => {
    const { handlers, mockClient } = buildDbHandlers();
    // BEGIN
    mockClient.query.mockResolvedValueOnce({});
    // SELECT points FOR UPDATE
    mockClient.query.mockResolvedValueOnce({ rows: [{ points: 500 }] });
    // SELECT reward
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 11, title: 'Kahve', cost: 200, cafe_id: 1 }],
    });
    // SELECT cafe_id of buyer
    mockClient.query.mockResolvedValueOnce({ rows: [{ cafe_id: 1 }] });
    // UPDATE points
    mockClient.query.mockResolvedValueOnce({});
    // INSERT user_items
    const couponRow = {
      id: 99,
      user_id: 5,
      item_id: 11,
      item_title: 'Kahve',
      code: 'CD-ABCD-EFGH-IJKL',
      cafe_id: 1,
      is_used: false,
      redeemed_at: new Date(),
      used_at: null,
    };
    mockClient.query.mockResolvedValueOnce({ rows: [couponRow] });
    // COMMIT
    mockClient.query.mockResolvedValueOnce({});

    const req = { user: { id: 5 }, body: { rewardId: 11 } };
    const res = createMockRes();

    await handlers.buyShopItem(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.newPoints).toBe(300);
    expect(res.payload.reward.code).toBe('CD-ABCD-EFGH-IJKL');
  });

  it('DB modunda kullanıcı bulunamazsa ROLLBACK yapıp 404 döndürür', async () => {
    const { handlers, mockClient } = buildDbHandlers();
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT points → bulunamadı
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    const req = { user: { id: 999 }, body: { rewardId: 11 } };
    const res = createMockRes();

    await handlers.buyShopItem(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.payload.code).toBe('USER_NOT_FOUND');
  });

  it('DB modunda ödül bulunamazsa ROLLBACK yapıp 404 döndürür', async () => {
    const { handlers, mockClient } = buildDbHandlers();
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ points: 500 }] }); // SELECT points
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT reward → bulunamadı
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    const req = { user: { id: 5 }, body: { rewardId: 9999 } };
    const res = createMockRes();

    await handlers.buyShopItem(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.payload.code).toBe('REWARD_NOT_FOUND');
  });

  it('DB modunda yetersiz puan halinde ROLLBACK yapıp 400 döndürür', async () => {
    const { handlers, mockClient } = buildDbHandlers();
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ points: 50 }] }); // SELECT points
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 11, title: 'Kahve', cost: 200, cafe_id: 1 }],
    }); // SELECT reward
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    const req = { user: { id: 5 }, body: { rewardId: 11 } };
    const res = createMockRes();

    await handlers.buyShopItem(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.payload.code).toBe('INSUFFICIENT_POINTS');
  });

  it('DB modunda rewardId eksikse 400 döndürür', async () => {
    const { handlers } = buildDbHandlers();
    const req = { user: { id: 5 }, body: {} };
    const res = createMockRes();

    await handlers.buyShopItem(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.payload.code).toBe('VALIDATION_ERROR');
  });

  // ──────────────────────────────────────────────────────────────
  // buyShopItem — kupon kodu çakışması (23505) retry sonrası 3 deneme
  // ──────────────────────────────────────────────────────────────

  it('3 deneme sonrası unique_violation halinde ROLLBACK ve hata döndürür', async () => {
    const { handlers, mockClient } = buildDbHandlers();
    const uniqueViolation = Object.assign(new Error('unique'), { code: '23505' });

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ points: 500 }] }); // SELECT points
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 11, title: 'Kahve', cost: 200, cafe_id: 1 }],
    }); // SELECT reward
    mockClient.query.mockResolvedValueOnce({ rows: [{ cafe_id: 1 }] }); // SELECT buyer cafe
    mockClient.query.mockResolvedValueOnce({}); // UPDATE points
    // INSERT user_items — 3 kez çakışma
    mockClient.query.mockRejectedValueOnce(uniqueViolation);
    mockClient.query.mockRejectedValueOnce(uniqueViolation);
    mockClient.query.mockRejectedValueOnce(uniqueViolation);
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    const req = { user: { id: 5 }, body: { rewardId: 11 } };
    const res = createMockRes();

    await handlers.buyShopItem(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ──────────────────────────────────────────────────────────────
  // useCoupon — DB modu
  // ──────────────────────────────────────────────────────────────

  it('super admin kuponu başarıyla kullanır (DB modu)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    const couponRow = {
      id: 1,
      user_id: 5,
      item_id: 11,
      item_title: 'Kahve',
      code: 'ABC',
      cafe_id: null,
      is_used: true,
      redeemed_at: new Date(),
      used_at: new Date(),
    };
    mockQuery.mockResolvedValueOnce({ rows: [couponRow] });

    const req = { body: { code: 'ABC' }, user: { role: 'admin', cafe_id: null } };
    const res = createMockRes();

    await handlers.useCoupon(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
  });

  it('cafe_admin cafe ataması yoksa 403 döndürür (DB modu)', async () => {
    const { handlers } = buildDbHandlers();
    const req = { body: { code: 'ABC' }, user: { role: 'cafe_admin', cafe_id: null } };
    const res = createMockRes();

    await handlers.useCoupon(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.payload.code).toBe('CAFE_ADMIN_NO_CAFE');
  });

  it('cafe_admin geçerli kuponu kullanır (DB modu)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    const couponRow = { id: 1, code: 'ABC', cafe_id: 5, is_used: true };
    mockQuery.mockResolvedValueOnce({ rows: [couponRow] });

    const req = { body: { code: 'ABC' }, user: { role: 'cafe_admin', cafe_id: 5 } };
    const res = createMockRes();

    await handlers.useCoupon(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
  });

  it('geçersiz/kullanılmış/süresi dolmuş kupon için 400 döndürür (DB modu)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    // Güncelleme sonucu boş (eşleşme yok)
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Existence check — cafe_id NULL olan başka bir kupon yok
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = { body: { code: 'INVALID' }, user: { role: 'cafe_admin', cafe_id: 5 } };
    const res = createMockRes();

    await handlers.useCoupon(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.payload.code).toBe('COUPON_INVALID');
  });

  it('başka kafenin kuponu için 403 COUPON_WRONG_CAFE döndürür (DB modu)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    // UPDATE sonucu boş (cafe filtresiyle eşleşme yok)
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Existence check: başka kafede var, cafe_id !== null
    mockQuery.mockResolvedValueOnce({ rows: [{ cafe_id: 99 }] });

    const req = { body: { code: 'OTHERCAFE' }, user: { role: 'cafe_admin', cafe_id: 5 } };
    const res = createMockRes();

    await handlers.useCoupon(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.payload.code).toBe('COUPON_WRONG_CAFE');
  });

  it('DB hatası halinde 500 döndürür (useCoupon)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    mockQuery.mockRejectedValueOnce(new Error('db error'));

    const req = { body: { code: 'ABC' }, user: { role: 'admin', cafe_id: null } };
    const res = createMockRes();

    await handlers.useCoupon(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ──────────────────────────────────────────────────────────────
  // getDailyWheel — DB modu
  // ──────────────────────────────────────────────────────────────

  it('cafeId olmadan 400 döndürür (getDailyWheel DB modu)', async () => {
    const { handlers } = buildDbHandlers();
    const req = { user: { id: 5 }, params: {} };
    const res = createMockRes();

    await handlers.getDailyWheel(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('cafe bulunamazsa 404 döndürür (getDailyWheel)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    mockQuery.mockResolvedValueOnce({ rows: [] }); // cafes lookup → boş

    const req = { user: { id: 5 }, params: { cafeId: '99' } };
    const res = createMockRes();

    await handlers.getDailyWheel(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.payload.code).toBe('CAFE_NOT_FOUND');
  });

  it('başarılı çark durumu döndürür (getDailyWheel)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    mockQuery.mockResolvedValueOnce({ rows: [{ name: 'Test Kafe' }] }); // cafe lookup
    mockQuery.mockResolvedValueOnce({ rows: [] }); // spin lookup → bugün çevrilmemiş

    const req = { user: { id: 5 }, params: { cafeId: '1' } };
    const res = createMockRes();

    await handlers.getDailyWheel(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.cafeName).toBe('Test Kafe');
    expect(res.payload.alreadySpunToday).toBe(false);
    expect(Array.isArray(res.payload.wheel)).toBe(true);
  });

  it('bugün zaten çevrilmişse alreadySpunToday true döner', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    mockQuery.mockResolvedValueOnce({ rows: [{ name: 'Test Kafe' }] }); // cafe
    const spinRow = { id: 1, points_won: 15, spun_at: new Date() };
    mockQuery.mockResolvedValueOnce({ rows: [spinRow] }); // spin → mevcut

    const req = { user: { id: 5 }, params: { cafeId: '1' } };
    const res = createMockRes();

    await handlers.getDailyWheel(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.alreadySpunToday).toBe(true);
    expect(res.payload.lastSpin).toEqual(spinRow);
  });

  it('cafe lookup hatası soft-fail: çark yine döner (getDailyWheel)', async () => {
    const { handlers, mockQuery } = buildDbHandlers();
    mockQuery.mockRejectedValueOnce(new Error('db error')); // cafe lookup hata
    mockQuery.mockResolvedValueOnce({ rows: [] }); // spin lookup

    const req = { user: { id: 5 }, params: { cafeId: '1' } };
    const res = createMockRes();

    await handlers.getDailyWheel(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.cafeName).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────
  // spinDailyWheel — DB modu
  // ──────────────────────────────────────────────────────────────

  it('cafe bulunamazsa ROLLBACK ve 404 döndürür (spinDailyWheel)', async () => {
    const { handlers, mockClient } = buildDbHandlers();
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT cafe → bulunamadı
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    const req = { user: { id: 5 }, params: { cafeId: '99' } };
    const res = createMockRes();

    await handlers.spinDailyWheel(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.payload.code).toBe('CAFE_NOT_FOUND');
  });

  it('puan kazanma slicında COMMIT ve başarı döndürür (spinDailyWheel)', async () => {
    const { handlers, mockClient } = buildDbHandlers();
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // SELECT cafe
    const spinRow = { id: 1, points_won: 15, spun_at: new Date() };
    mockClient.query.mockResolvedValueOnce({ rows: [spinRow] }); // INSERT spin
    mockClient.query.mockResolvedValueOnce({}); // UPDATE points
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    // Math.random'u en hafif dilime (15 puan) yönlendiriyoruz
    const originalRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0); // r=0 → ilk dilim seçilir

    const req = { user: { id: 5 }, params: { cafeId: '1' } };
    const res = createMockRes();

    await handlers.spinDailyWheel(req, res);

    Math.random = originalRandom;

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.gift).toBeNull();
  });

  it('zaten çevrilmişse 409 ALREADY_SPUN_TODAY döndürür (spinDailyWheel)', async () => {
    const { handlers, mockClient } = buildDbHandlers();
    const duplicateErr = Object.assign(new Error('unique'), { code: '23505' });

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // SELECT cafe
    mockClient.query.mockRejectedValueOnce(duplicateErr); // INSERT spin → 23505
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    const req = { user: { id: 5 }, params: { cafeId: '1' } };
    const res = createMockRes();

    await handlers.spinDailyWheel(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.payload.code).toBe('ALREADY_SPUN_TODAY');
  });

  it('beklenmeyen DB hatası 500 döndürür (spinDailyWheel)', async () => {
    const { handlers, mockClient } = buildDbHandlers();
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockRejectedValueOnce(new Error('fatal')); // SELECT cafe → hata

    const req = { user: { id: 5 }, params: { cafeId: '1' } };
    const res = createMockRes();

    await handlers.spinDailyWheel(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
