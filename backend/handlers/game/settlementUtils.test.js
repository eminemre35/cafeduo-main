/**
 * settlementUtils unit tests
 *
 * Settlement is the only place where user.points moves between accounts, so it
 * earns dedicated coverage even though gameHandlers.test.js exercises it
 * indirectly. The DB path is exercised through a hand-rolled pg-client mock
 * that records each SQL call; the memory path runs against a plain in-memory
 * user array.
 */

const {
  applyDbSettlement,
  applyMemorySettlement,
  isNonCompetitiveGameType,
  normalizeParticipantKey,
} = require('./settlementUtils');

const makeDbClient = (userRows) => {
  const calls = [];
  const usersByLowerName = new Map(
    userRows.map((u) => [String(u.username || '').toLowerCase(), u])
  );
  return {
    calls,
    query: jest.fn(async (sql, params = []) => {
      calls.push({ sql, params });
      // FOR UPDATE select on the users table: return matching rows
      if (/FROM\s+users/i.test(sql) && /LOWER\(username\)\s*=\s*ANY/i.test(sql)) {
        const needles = (params[0] || []).map((n) => String(n).toLowerCase());
        const rows = needles.map((needle) => usersByLowerName.get(needle)).filter(Boolean);
        return { rows };
      }
      // UPDATE statements: mutate the local row map so subsequent reads see new values
      if (/^\s*UPDATE\s+users/i.test(sql)) {
        // Inspect the WHERE clause: $N is the id placeholder, always last param
        const id = params[params.length - 1];
        const row = userRows.find((u) => u.id === id);
        if (row) {
          if (/points\s*=\s*points\s*\+\s*\$1/i.test(sql)) row.points += params[0];
          if (/wins\s*=\s*wins\s*\+\s*1/i.test(sql)) row.wins = (row.wins || 0) + 1;
          if (/points\s*=\s*GREATEST\(points\s*-\s*\$1/i.test(sql)) {
            row.points = Math.max(0, row.points - params[0]);
          }
          if (/games_played\s*=\s*games_played\s*\+\s*1/i.test(sql)) {
            row.games_played = (row.games_played || 0) + 1;
          }
          if (/wins\s*=\s*wins\s*\+\s*\$1/i.test(sql)) {
            row.wins = (row.wins || 0) + params[0];
          }
        }
        return { rowCount: row ? 1 : 0 };
      }
      return { rows: [] };
    }),
  };
};

describe('settlementUtils helpers', () => {
  describe('normalizeParticipantKey', () => {
    it('trims and lowercases names', () => {
      expect(normalizeParticipantKey('  Alice  ')).toBe('alice');
      expect(normalizeParticipantKey('ALICE')).toBe('alice');
      expect(normalizeParticipantKey(null)).toBe('');
      expect(normalizeParticipantKey(undefined)).toBe('');
    });
  });

  describe('isNonCompetitiveGameType', () => {
    it('returns false for every supported game type (set is empty by design)', () => {
      expect(isNonCompetitiveGameType('Nişancı Düellosu')).toBe(false);
      expect(isNonCompetitiveGameType('Bilgi Yarışı')).toBe(false);
      expect(isNonCompetitiveGameType('Retro Satranç')).toBe(false);
      expect(isNonCompetitiveGameType('anything')).toBe(false);
    });
  });
});

describe('applyMemorySettlement', () => {
  const baseGame = (overrides = {}) => ({
    hostName: 'Alice',
    guestName: 'Bob',
    gameType: 'Nişancı Düellosu',
    points: 50,
    ...overrides,
  });

  const makeUsers = () => [
    { id: 1, username: 'Alice', points: 200, wins: 0, gamesPlayed: 0 },
    { id: 2, username: 'Bob', points: 100, wins: 0, gamesPlayed: 0 },
  ];

  it('transfers the full stake when loser has enough points', () => {
    const users = makeUsers();
    const result = applyMemorySettlement({
      game: baseGame({ points: 50 }),
      winnerName: 'Alice',
      isDraw: false,
      getMemoryUsers: () => users,
    });

    expect(result.transferredPoints).toBe(50);
    expect(users[0].points).toBe(250); // 200 + 50
    expect(users[0].wins).toBe(1);
    expect(users[0].gamesPlayed).toBe(1);
    expect(users[1].points).toBe(50); // 100 - 50
    expect(users[1].wins).toBe(0);
    expect(users[1].gamesPlayed).toBe(1);
  });

  it('clamps the transfer to loser.points when stake exceeds it', () => {
    const users = makeUsers();
    users[1].points = 20; // Bob only has 20
    const result = applyMemorySettlement({
      game: baseGame({ points: 50 }),
      winnerName: 'Alice',
      isDraw: false,
      getMemoryUsers: () => users,
    });

    expect(result.transferredPoints).toBe(20); // not 50
    expect(users[0].points).toBe(220);
    expect(users[1].points).toBe(0); // floored, not negative
  });

  it('transfers nothing on a draw but still increments games_played for both', () => {
    const users = makeUsers();
    const result = applyMemorySettlement({
      game: baseGame({ points: 50 }),
      winnerName: null,
      isDraw: true,
      getMemoryUsers: () => users,
    });

    expect(result.transferredPoints).toBe(0);
    expect(users[0].points).toBe(200);
    expect(users[1].points).toBe(100);
    expect(users[0].gamesPlayed).toBe(1);
    expect(users[1].gamesPlayed).toBe(1);
    expect(users[0].wins).toBe(0);
    expect(users[1].wins).toBe(0);
  });

  it('handles a missing loser (e.g. BOT) by transferring zero', () => {
    const users = [{ id: 1, username: 'Alice', points: 200, wins: 0, gamesPlayed: 0 }];
    const result = applyMemorySettlement({
      game: baseGame({ guestName: 'BOT', points: 50 }),
      winnerName: 'Alice',
      isDraw: false,
      getMemoryUsers: () => users,
    });

    // Winner still credited but stake comes out of nowhere → transferable=0
    expect(result.transferredPoints).toBe(0);
    expect(users[0].points).toBe(200); // no fake bonus
    expect(users[0].wins).toBe(1);
    expect(users[0].gamesPlayed).toBe(1);
  });

  it('handles a missing winner by falling back to no-op transfer', () => {
    const users = [{ id: 2, username: 'Bob', points: 100, wins: 0, gamesPlayed: 0 }];
    const result = applyMemorySettlement({
      game: baseGame({ points: 50 }),
      winnerName: 'Alice', // not in memory
      isDraw: false,
      getMemoryUsers: () => users,
    });

    expect(result.transferredPoints).toBe(0);
    // The fallback branch still increments games_played for whoever it finds
    expect(users[0].gamesPlayed).toBe(1);
    expect(users[0].wins).toBe(0); // only winner gets a win, and winner isn't in users
  });

  it('treats a negative stake as zero', () => {
    const users = makeUsers();
    const result = applyMemorySettlement({
      game: baseGame({ points: -10 }),
      winnerName: 'Alice',
      isDraw: false,
      getMemoryUsers: () => users,
    });
    expect(result.transferredPoints).toBe(0);
    expect(users[0].points).toBe(200);
    expect(users[1].points).toBe(100);
  });

  it('returns early when there are no participants', () => {
    const result = applyMemorySettlement({
      game: { hostName: '', guestName: '', points: 50 },
      winnerName: '',
      isDraw: false,
      getMemoryUsers: () => [],
    });
    expect(result.transferredPoints).toBe(0);
  });

  it('is case-insensitive when matching winner to participant', () => {
    const users = makeUsers();
    const result = applyMemorySettlement({
      game: baseGame({ points: 30 }),
      winnerName: 'alice', // lowercase
      isDraw: false,
      getMemoryUsers: () => users,
    });
    expect(result.transferredPoints).toBe(30);
    expect(users[0].points).toBe(230);
    expect(users[1].points).toBe(70);
  });
});

describe('applyDbSettlement', () => {
  it('transfers stake from loser to winner in DB mode', async () => {
    const users = [
      { id: 1, username: 'Alice', points: 200, wins: 0, games_played: 0 },
      { id: 2, username: 'Bob', points: 100, wins: 0, games_played: 0 },
    ];
    const client = makeDbClient(users);

    const result = await applyDbSettlement({
      client,
      game: { host_name: 'Alice', guest_name: 'Bob', points: 50, game_type: 'Nişancı Düellosu' },
      winnerName: 'Alice',
      isDraw: false,
    });

    expect(result.transferredPoints).toBe(50);
    expect(users[0].points).toBe(250);
    expect(users[0].wins).toBe(1);
    expect(users[0].games_played).toBe(1);
    expect(users[1].points).toBe(50);
    expect(users[1].games_played).toBe(1);
  });

  it('clamps stake to loser.points in DB mode', async () => {
    const users = [
      { id: 1, username: 'Alice', points: 200, wins: 0, games_played: 0 },
      { id: 2, username: 'Bob', points: 10, wins: 0, games_played: 0 },
    ];
    const client = makeDbClient(users);

    const result = await applyDbSettlement({
      client,
      game: { host_name: 'Alice', guest_name: 'Bob', points: 50, game_type: 'Nişancı Düellosu' },
      winnerName: 'Alice',
      isDraw: false,
    });

    expect(result.transferredPoints).toBe(10);
    expect(users[0].points).toBe(210);
    expect(users[1].points).toBe(0);
  });

  it('does not transfer on draw but increments games_played for both', async () => {
    const users = [
      { id: 1, username: 'Alice', points: 200, wins: 0, games_played: 0 },
      { id: 2, username: 'Bob', points: 100, wins: 0, games_played: 0 },
    ];
    const client = makeDbClient(users);

    const result = await applyDbSettlement({
      client,
      game: { host_name: 'Alice', guest_name: 'Bob', points: 50, game_type: 'Retro Satranç' },
      winnerName: null,
      isDraw: true,
    });

    expect(result.transferredPoints).toBe(0);
    expect(users[0].points).toBe(200);
    expect(users[1].points).toBe(100);
    expect(users[0].games_played).toBe(1);
    expect(users[1].games_played).toBe(1);
    expect(users[0].wins).toBe(0);
    expect(users[1].wins).toBe(0);
  });

  it('uses FOR UPDATE locking on the users SELECT', async () => {
    const users = [
      { id: 1, username: 'Alice', points: 100, wins: 0, games_played: 0 },
      { id: 2, username: 'Bob', points: 100, wins: 0, games_played: 0 },
    ];
    const client = makeDbClient(users);
    await applyDbSettlement({
      client,
      game: { host_name: 'Alice', guest_name: 'Bob', points: 10, game_type: 'Nişancı Düellosu' },
      winnerName: 'Alice',
      isDraw: false,
    });
    const selectCall = client.calls.find((c) => /FROM\s+users/i.test(c.sql));
    expect(selectCall).toBeDefined();
    expect(/FOR UPDATE/i.test(selectCall.sql)).toBe(true);
  });
});
