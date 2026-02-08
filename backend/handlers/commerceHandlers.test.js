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
        code: 'X1',
        redeemedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    isDbConnected = jest.fn().mockResolvedValue(false);
    handlers = createCommerceHandlers({
      pool: { query: jest.fn(), connect: jest.fn() },
      isDbConnected,
      logger: { error: jest.fn() },
      getMemoryItems: () => memoryItems,
      getMemoryRewards: () => memoryRewards,
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

  it('returns database error for buy when db disconnected', async () => {
    const req = { user: { id: 5 }, body: { rewardId: 1 } };
    const res = createMockRes();

    await handlers.buyShopItem(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(String(res.payload.error)).toContain('Veritabanı');
  });
});

