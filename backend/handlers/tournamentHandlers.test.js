/**
 * tournamentHandlers.test.js
 *
 * Kapsanan davranışlar:
 *  - createTournament: mutlu yol (DB), demo-mod 501, yetki kontrolleri,
 *    input validasyonları (isim, gameType, tarih penceresi, prize_tiers),
 *    eksik cafe_id 400, geçersiz reward_id 400
 *  - listTournaments: mutlu yol (DB), geçersiz cafeId → [], demo-mod []
 *  - getLeaderboard: mutlu yol (DB), 404, geçersiz id 400, demo-mod 501
 *  - cancelTournament: mutlu yol (DB), zaten başlamış 409, demo-mod 501,
 *    geçersiz id 400
 *  - resolveTargetCafeId: admin body cafeId kullanır, cafe_admin kendi cafe_id'sine kilitli
 *  - validatePrizeTiers: boş dizi, rank tekrarı, 1..N gap, fazla kademe, geçersiz obje
 */

// cache modülünü mock'la — gerçek redis bağlantısı gerekmez
jest.mock('../middleware/cache', () => ({
  cache: jest.fn(() => jest.fn()),
  clearCache: jest.fn().mockResolvedValue(undefined),
}));

const { createTournamentHandlers } = require('./tournamentHandlers');

// ─── yardımcılar ───────────────────────────────────────────────────────────────

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

// Gelecekte başlayan geçerli bir pencere üretir (start: +5dak, end: +65dak)
const futureWindow = (offsetMinutes = 5, durationMinutes = 60) => {
  const start = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start_at: start.toISOString(), end_at: end.toISOString() };
};

const validTiers = [
  { rank: 1, reward_id: 10 },
  { rank: 2, reward_id: 20 },
];

// ─── fabrika ───────────────────────────────────────────────────────────────────

const makeHandlers = ({ dbMode = true, queryResponses = [] } = {}) => {
  const pool = { query: jest.fn() };
  queryResponses.forEach((resp) => pool.query.mockResolvedValueOnce(resp));

  const handlers = createTournamentHandlers({
    pool,
    isDbConnected: jest.fn().mockResolvedValue(dbMode),
    logger: { error: jest.fn() },
  });

  return { handlers, pool };
};

// ─── createTournament ──────────────────────────────────────────────────────────

describe('createTournament', () => {
  const { start_at, end_at } = futureWindow();

  it('DB modda geçerli payload ile turnuva oluşturur', async () => {
    const created = { id: 1, name: 'Turnuva', status: 'scheduled' };
    const { handlers } = makeHandlers({
      queryResponses: [
        { rows: [{ id: 10 }, { id: 20 }] }, // rewards check
        { rows: [created] }, // INSERT RETURNING
      ],
    });

    const req = {
      user: { id: 5, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'Turnuva', start_at, end_at, prize_tiers: validTiers },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.tournament).toEqual(created);
  });

  it('Demo modda 501 döner', async () => {
    const { handlers } = makeHandlers({ dbMode: false });
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'Demo', start_at, end_at, prize_tiers: validTiers },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(501);
    expect(res.payload.code).toBe('NOT_IMPLEMENTED');
  });

  it('cafe_id olmayan kullanıcıda 400 döner', async () => {
    const { handlers } = makeHandlers();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: null },
      body: { name: 'T', start_at, end_at, prize_tiers: validTiers },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('CAFE_REQUIRED');
  });

  it('Boş isimde 400 döner', async () => {
    const { handlers } = makeHandlers();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: { name: '', start_at, end_at, prize_tiers: validTiers },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('VALIDATION_ERROR');
  });

  it('120 karakteri aşan isimde 400 döner', async () => {
    const { handlers } = makeHandlers();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'x'.repeat(121), start_at, end_at, prize_tiers: validTiers },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('VALIDATION_ERROR');
  });

  it('Desteklenmeyen game_type ile 400 döner', async () => {
    const { handlers } = makeHandlers();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'T', game_type: 'geçersiz_oyun', start_at, end_at, prize_tiers: validTiers },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('INVALID_GAME_TYPE');
  });

  it('Geçerli game_type ("Bilgi Yarışı") kabul edilir', async () => {
    const created = { id: 2, name: 'Quiz T', status: 'scheduled' };
    const { handlers } = makeHandlers({
      queryResponses: [{ rows: [{ id: 10 }, { id: 20 }] }, { rows: [created] }],
    });
    const req = {
      user: { id: 5, role: 'cafe_admin', cafe_id: 3 },
      body: {
        name: 'Quiz T',
        game_type: 'Bilgi Yarışı',
        start_at,
        end_at,
        prize_tiers: validTiers,
      },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
  });

  it('start_at geçersiz tarihte 400 döner', async () => {
    const { handlers } = makeHandlers();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'T', start_at: 'not-a-date', end_at, prize_tiers: validTiers },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('VALIDATION_ERROR');
  });

  it('start_at şu andan 1 dakikadan kısa ileride ise 400 döner', async () => {
    const { handlers } = makeHandlers();
    const tooSoon = new Date(Date.now() + 30 * 1000).toISOString(); // 30 sn sonra
    const endSoon = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'T', start_at: tooSoon, end_at: endSoon, prize_tiers: validTiers },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('WINDOW_TOO_SOON');
  });

  it('Pencere 15 dakikadan kısa ise 400 döner', async () => {
    const { handlers } = makeHandlers();
    const { start_at: s } = futureWindow();
    const tooShortEnd = new Date(new Date(s).getTime() + 5 * 60 * 1000).toISOString();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'T', start_at: s, end_at: tooShortEnd, prize_tiers: validTiers },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('WINDOW_OUT_OF_RANGE');
  });

  it('Pencere 30 günü aşıyorsa 400 döner', async () => {
    const { handlers } = makeHandlers();
    const { start_at: s } = futureWindow();
    const tooLongEnd = new Date(new Date(s).getTime() + 31 * 24 * 60 * 60 * 1000).toISOString();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'T', start_at: s, end_at: tooLongEnd, prize_tiers: validTiers },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('WINDOW_OUT_OF_RANGE');
  });

  it('prize_tiers boş dizi ise 400 döner', async () => {
    const { handlers } = makeHandlers();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'T', start_at, end_at, prize_tiers: [] },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('INVALID_PRIZE_TIERS');
  });

  it('prize_tiers dizi değil ise 400 döner', async () => {
    const { handlers } = makeHandlers();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'T', start_at, end_at, prize_tiers: 'string' },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('INVALID_PRIZE_TIERS');
  });

  it('prize_tiers rank tekrarı varsa 400 döner', async () => {
    const { handlers } = makeHandlers();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: {
        name: 'T',
        start_at,
        end_at,
        prize_tiers: [
          { rank: 1, reward_id: 10 },
          { rank: 1, reward_id: 20 },
        ],
      },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(String(res.payload.message)).toContain('tekrar');
  });

  it('prize_tiers rank gap varsa (1,3) 400 döner', async () => {
    const { handlers } = makeHandlers();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: {
        name: 'T',
        start_at,
        end_at,
        prize_tiers: [
          { rank: 1, reward_id: 10 },
          { rank: 3, reward_id: 20 },
        ],
      },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('INVALID_PRIZE_TIERS');
  });

  it('prize_tiers 10 kademeyi aşarsa 400 döner', async () => {
    const { handlers } = makeHandlers();
    const tooMany = Array.from({ length: 11 }, (_, i) => ({ rank: i + 1, reward_id: i + 1 }));
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'T', start_at, end_at, prize_tiers: tooMany },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('INVALID_PRIZE_TIERS');
  });

  it('prize_tiers içindeki eleman null ise 400 döner', async () => {
    const { handlers } = makeHandlers();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'T', start_at, end_at, prize_tiers: [null] },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(String(res.payload.message)).toContain('obje olmalıdır');
  });

  it('prize_tiers geçersiz rank değeri (0) varsa 400 döner', async () => {
    const { handlers } = makeHandlers();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'T', start_at, end_at, prize_tiers: [{ rank: 0, reward_id: 10 }] },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(String(res.payload.message)).toContain('rank');
  });

  it('prize_tiers geçersiz reward_id (negatif) varsa 400 döner', async () => {
    const { handlers } = makeHandlers();
    const req = {
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'T', start_at, end_at, prize_tiers: [{ rank: 1, reward_id: -5 }] },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(String(res.payload.message)).toContain('reward_id');
  });

  it("DB'deki reward kafede mevcut değilse 400 döner", async () => {
    const { handlers } = makeHandlers({
      queryResponses: [
        { rows: [{ id: 10 }] }, // sadece 10 var, 20 yok
      ],
    });
    const req = {
      user: { id: 5, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'T', start_at, end_at, prize_tiers: validTiers },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('REWARD_NOT_IN_CAFE');
    expect(res.payload.details.missing).toContain(20);
  });

  it("Admin body'deki cafeId'yi kullanır, kendi cafe_id'sini değil", async () => {
    const created = { id: 9, name: 'Admin T', status: 'scheduled' };
    const { handlers, pool } = makeHandlers({
      queryResponses: [{ rows: [{ id: 10 }, { id: 20 }] }, { rows: [created] }],
    });
    const req = {
      user: { id: 99, role: 'admin', isAdmin: true, cafe_id: 1 },
      body: { name: 'Admin T', cafeId: 7, start_at, end_at, prize_tiers: validTiers },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    // INSERT sorgusuna iletilen ilk parametre cafeId=7 olmalı
    const insertCall = pool.query.mock.calls[1];
    expect(insertCall[1][0]).toBe(7);
    expect(res.payload.success).toBe(true);
  });

  it('DB hatası 500 döner', async () => {
    const { handlers, pool } = makeHandlers();
    pool.query.mockRejectedValueOnce(new Error('connection lost'));
    const req = {
      user: { id: 5, role: 'cafe_admin', cafe_id: 3 },
      body: { name: 'T', start_at, end_at, prize_tiers: validTiers },
    };
    const res = createMockRes();

    await handlers.createTournament(req, res);

    expect(res.statusCode).toBe(500);
  });
});

// ─── listTournaments ───────────────────────────────────────────────────────────

describe('listTournaments', () => {
  it('DB modda kafeye ait turnuvaları döner', async () => {
    const rows = [{ id: 1, name: 'T1', status: 'active' }];
    const { handlers } = makeHandlers({ queryResponses: [{ rows }] });

    const req = { query: { cafeId: '3' } };
    const res = createMockRes();

    await handlers.listTournaments(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual(rows);
  });

  it('Geçersiz cafeId (0) → boş dizi döner, DB sorgusu yapılmaz', async () => {
    const { handlers, pool } = makeHandlers();

    const req = { query: { cafeId: '0' } };
    const res = createMockRes();

    await handlers.listTournaments(req, res);

    expect(res.payload).toEqual([]);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('cafeId yoksa boş dizi döner', async () => {
    const { handlers, pool } = makeHandlers();

    const req = { query: {} };
    const res = createMockRes();

    await handlers.listTournaments(req, res);

    expect(res.payload).toEqual([]);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('Demo modda boş dizi döner', async () => {
    const { handlers } = makeHandlers({ dbMode: false });

    const req = { query: { cafeId: '3' } };
    const res = createMockRes();

    await handlers.listTournaments(req, res);

    expect(res.payload).toEqual([]);
  });

  it('DB hatası 500 döner', async () => {
    const { handlers, pool } = makeHandlers();
    pool.query.mockRejectedValueOnce(new Error('timeout'));

    const req = { query: { cafeId: '3' } };
    const res = createMockRes();

    await handlers.listTournaments(req, res);

    expect(res.statusCode).toBe(500);
  });
});

// ─── getLeaderboard ────────────────────────────────────────────────────────────

describe('getLeaderboard', () => {
  it('DB modda turnuva + sıralama döner', async () => {
    const tournament = { id: 5, name: 'T5', status: 'active' };
    const leaderboard = [{ id: 1, username: 'u1', total_points: '50' }];
    const { handlers } = makeHandlers({
      queryResponses: [{ rows: [tournament] }, { rows: leaderboard }],
    });

    const req = { params: { id: '5' } };
    const res = createMockRes();

    await handlers.getLeaderboard(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.tournament).toEqual(tournament);
    expect(res.payload.leaderboard).toEqual(leaderboard);
  });

  it('Turnuva bulunamazsa 404 döner', async () => {
    const { handlers } = makeHandlers({ queryResponses: [{ rows: [] }] });

    const req = { params: { id: '999' } };
    const res = createMockRes();

    await handlers.getLeaderboard(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.payload.code).toBe('TOURNAMENT_NOT_FOUND');
  });

  it('Geçersiz id (string) 400 döner', async () => {
    const { handlers } = makeHandlers();

    const req = { params: { id: 'abc' } };
    const res = createMockRes();

    await handlers.getLeaderboard(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('VALIDATION_ERROR');
  });

  it('id=0 → 400 döner', async () => {
    const { handlers } = makeHandlers();

    const req = { params: { id: '0' } };
    const res = createMockRes();

    await handlers.getLeaderboard(req, res);

    expect(res.statusCode).toBe(400);
  });

  it('Demo modda 501 döner', async () => {
    const { handlers } = makeHandlers({ dbMode: false });

    const req = { params: { id: '5' } };
    const res = createMockRes();

    await handlers.getLeaderboard(req, res);

    expect(res.statusCode).toBe(501);
    expect(res.payload.code).toBe('NOT_IMPLEMENTED');
  });

  it('DB hatası 500 döner', async () => {
    const { handlers, pool } = makeHandlers();
    pool.query.mockRejectedValueOnce(new Error('deadlock'));

    const req = { params: { id: '5' } };
    const res = createMockRes();

    await handlers.getLeaderboard(req, res);

    expect(res.statusCode).toBe(500);
  });
});

// ─── cancelTournament ──────────────────────────────────────────────────────────

describe('cancelTournament', () => {
  it('DB modda scheduled turnuvayı iptal eder', async () => {
    const { handlers } = makeHandlers({
      queryResponses: [{ rows: [{ id: 3, status: 'cancelled' }] }],
    });

    const req = {
      params: { id: '3' },
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: {},
    };
    const res = createMockRes();

    await handlers.cancelTournament(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
  });

  it('Active/finished turnuva iptal edilemez → 409 döner', async () => {
    const { handlers } = makeHandlers({ queryResponses: [{ rows: [] }] });

    const req = {
      params: { id: '3' },
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: {},
    };
    const res = createMockRes();

    await handlers.cancelTournament(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.payload.code).toBe('NOT_CANCELLABLE');
  });

  it('Geçersiz id → 400 döner', async () => {
    const { handlers } = makeHandlers();

    const req = {
      params: { id: 'xyz' },
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: {},
    };
    const res = createMockRes();

    await handlers.cancelTournament(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.code).toBe('VALIDATION_ERROR');
  });

  it('Demo modda 501 döner', async () => {
    const { handlers } = makeHandlers({ dbMode: false });

    const req = {
      params: { id: '3' },
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: {},
    };
    const res = createMockRes();

    await handlers.cancelTournament(req, res);

    expect(res.statusCode).toBe(501);
    expect(res.payload.code).toBe('NOT_IMPLEMENTED');
  });

  it('Admin tüm kafelerin turnuvalarını iptal edebilir (cafeFilter uygulanmaz)', async () => {
    const { handlers, pool } = makeHandlers({
      queryResponses: [{ rows: [{ id: 7, status: 'cancelled' }] }],
    });

    const req = {
      params: { id: '7' },
      user: { id: 99, role: 'admin', isAdmin: true, cafe_id: 1 },
      body: {},
    };
    const res = createMockRes();

    await handlers.cancelTournament(req, res);

    // Admin sorgusu tek parametre almalı (cafe filtresi yok)
    const queryCall = pool.query.mock.calls[0];
    expect(queryCall[1]).toHaveLength(1);
    expect(queryCall[1][0]).toBe(7);
    expect(res.payload.success).toBe(true);
  });

  it('cafe_admin iptal sorgusuna cafe_id filtresi ekler', async () => {
    const { handlers, pool } = makeHandlers({
      queryResponses: [{ rows: [{ id: 4, status: 'cancelled' }] }],
    });

    const req = {
      params: { id: '4' },
      user: { id: 2, role: 'cafe_admin', cafe_id: 5 },
      body: {},
    };
    const res = createMockRes();

    await handlers.cancelTournament(req, res);

    const queryCall = pool.query.mock.calls[0];
    expect(queryCall[1]).toHaveLength(2);
    expect(queryCall[1][1]).toBe(5); // cafe_id filtresi
  });

  it('DB hatası 500 döner', async () => {
    const { handlers, pool } = makeHandlers();
    pool.query.mockRejectedValueOnce(new Error('lock timeout'));

    const req = {
      params: { id: '3' },
      user: { id: 1, role: 'cafe_admin', cafe_id: 3 },
      body: {},
    };
    const res = createMockRes();

    await handlers.cancelTournament(req, res);

    expect(res.statusCode).toBe(500);
  });
});
