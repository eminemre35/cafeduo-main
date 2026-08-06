const {
  isAdminActor,
  isNonCompetitiveGameType,
  validateGameExists,
  validatePlayerInGame,
  validateGameNotFinished,
  validatePlayerTurn,
  validateMoveFormat,
} = require('./gameValidation');

describe('isAdminActor', () => {
  it('detects admin by role or isAdmin flag', () => {
    expect(isAdminActor({ role: 'admin' })).toBe(true);
    expect(isAdminActor({ isAdmin: true })).toBe(true);
    expect(isAdminActor({ role: 'user' })).toBe(false);
    expect(isAdminActor(null)).toBe(false);
    expect(isAdminActor(undefined)).toBe(false);
  });
});

describe('isNonCompetitiveGameType', () => {
  it('handles empty set and trimming', () => {
    expect(isNonCompetitiveGameType('quiz')).toBe(false);
    expect(isNonCompetitiveGameType(null)).toBe(false);
    expect(isNonCompetitiveGameType('')).toBe(false);
    expect(isNonCompetitiveGameType('  quiz  ')).toBe(false);
  });
});

describe('validateGameExists', () => {
  it('rejects missing games with 404', () => {
    expect(validateGameExists(null)).toEqual({ ok: false, error: 'Oyun bulunamadı.', status: 404 });
    expect(validateGameExists(undefined)).toEqual({
      ok: false,
      error: 'Oyun bulunamadı.',
      status: 404,
    });
  });
  it('accepts existing games', () => {
    expect(validateGameExists({ id: 1 })).toEqual({ ok: true });
  });
});

describe('validatePlayerInGame', () => {
  const game = { host_name: 'emin', guest_name: 'Rakip', status: 'playing' };

  it('accepts host and guest (case-insensitive)', () => {
    expect(validatePlayerInGame('EMIN', game).ok).toBe(true);
    expect(validatePlayerInGame('rakip', game).ok).toBe(true);
  });
  it('rejects outsiders and empty names with 403', () => {
    expect(validatePlayerInGame('hacker', game)).toEqual({
      ok: false,
      error: 'Bu oyunda yer almıyorsun.',
      status: 403,
    });
    expect(validatePlayerInGame('', game).ok).toBe(false);
    expect(validatePlayerInGame(null, game).ok).toBe(false);
  });
  it('falls back to camelCase fields', () => {
    expect(validatePlayerInGame('emin', { hostName: 'emin', guestName: 'x' }).ok).toBe(true);
  });
});

describe('validateGameNotFinished', () => {
  it('rejects finished games with 409', () => {
    expect(validateGameNotFinished({ status: 'FINISHED' })).toEqual({
      ok: false,
      error: 'Bu oyun zaten tamamlanmış.',
      status: 409,
    });
  });
  it('accepts active games', () => {
    expect(validateGameNotFinished({ status: 'playing' }).ok).toBe(true);
    expect(validateGameNotFinished({}).ok).toBe(true);
  });
});

describe('validatePlayerTurn', () => {
  const game = {
    host_name: 'emin',
    guest_name: 'rakip',
    game_state: { chess: { turn: 'w' } },
  };

  it('passes through non-chess games', () => {
    expect(validatePlayerTurn('emin', { status: 'playing' }).ok).toBe(true);
  });
  it('accepts the expected player for the current turn', () => {
    expect(validatePlayerTurn('emin', game).ok).toBe(true);
    expect(validatePlayerTurn('rakip', { ...game, game_state: { chess: { turn: 'b' } } }).ok).toBe(
      true
    );
  });
  it('rejects wrong player with 409', () => {
    expect(validatePlayerTurn('rakip', game)).toEqual({
      ok: false,
      error: 'Şu an senin sıran değil.',
      status: 409,
    });
  });
});

describe('validateMoveFormat', () => {
  it('rejects non-objects with 400', () => {
    expect(validateMoveFormat(null).ok).toBe(false);
    expect(validateMoveFormat('e2e4').ok).toBe(false);
  });
  it('rejects invalid squares', () => {
    expect(validateMoveFormat({ from: 'e9', to: 'e4' })).toEqual({
      ok: false,
      error: 'Geçersiz kare pozisyonu.',
      status: 400,
    });
    expect(validateMoveFormat({ from: 'e2', to: 'z9' }).ok).toBe(false);
    expect(validateMoveFormat({ from: '', to: 'e4' }).ok).toBe(false);
  });
  it('accepts valid moves (case-insensitive)', () => {
    expect(validateMoveFormat({ from: 'E2', to: 'e4' }).ok).toBe(true);
    expect(validateMoveFormat({ from: 'a1', to: 'h8' }).ok).toBe(true);
  });
});
