const {
  buildErrorResponse,
  mapTransitionError,
  sendError,
  handleGameError,
} = require('./errorHelpers');

const createMockRes = () => {
  const res = { statusCode: 0, body: null };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload) => {
    res.body = payload;
    return res;
  });
  return res;
};

describe('buildErrorResponse', () => {
  it('builds error with default 400 and no code', () => {
    expect(buildErrorResponse('Hata')).toEqual({ statusCode: 400, body: { error: 'Hata' } });
  });
  it('includes code when provided', () => {
    expect(buildErrorResponse('Hata', 403, 'forbidden')).toEqual({
      statusCode: 403,
      body: { error: 'Hata', code: 'forbidden' },
    });
  });
});

describe('mapTransitionError', () => {
  it('maps missing result to generic transition error', () => {
    expect(mapTransitionError(null)).toEqual({
      error: 'Geçersiz durum geçişi.',
      code: 'invalid_transition',
    });
    expect(mapTransitionError(undefined)).toEqual({
      error: 'Geçersiz durum geçişi.',
      code: 'invalid_transition',
    });
  });
  it('maps full transition result with from/to', () => {
    expect(
      mapTransitionError({ message: 'olmaz', code: 'bad_status', from: 'waiting', to: 'playing' })
    ).toEqual({
      error: 'olmaz',
      code: 'bad_status',
      fromStatus: 'waiting',
      toStatus: 'playing',
    });
  });
  it('falls back to defaults for partial results', () => {
    const mapped = mapTransitionError({});
    expect(mapped.error).toBe('Geçersiz durum geçişi.');
    expect(mapped.code).toBe('invalid_transition');
  });
});

describe('sendError', () => {
  it('sends error JSON with status', () => {
    const res = createMockRes();
    sendError(res, 'Kötü istek', 400);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ error: 'Kötü istek' });
  });
  it('includes code when provided', () => {
    const res = createMockRes();
    sendError(res, 'Yasak', 403, 'forbidden');
    expect(res.body).toEqual({ error: 'Yasak', code: 'forbidden' });
  });
});

describe('handleGameError', () => {
  const logger = { error: jest.fn() };

  beforeEach(() => logger.error.mockClear());

  it('logs the error with context', () => {
    const res = createMockRes();
    handleGameError(res, new Error('booom'), logger, 'test_ctx');
    expect(logger.error).toHaveBeenCalledWith('test_ctx error', expect.any(Error));
  });

  it('maps ECONNREFUSED to 503', () => {
    const res = createMockRes();
    handleGameError(res, { code: 'ECONNREFUSED' }, logger);
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toContain('Veritabanı');
  });

  it('maps postgres unique violation (23505) to 409', () => {
    const res = createMockRes();
    handleGameError(res, { code: '23505' }, logger);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('çakışma');
  });

  it('falls back to 500 generic error', () => {
    const res = createMockRes();
    handleGameError(res, new Error('generic'), logger);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toContain('hata');
  });
});
