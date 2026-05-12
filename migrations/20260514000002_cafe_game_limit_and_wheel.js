/**
 * Per-cafe rules and the daily-spin wheel.
 *
 * Each cafe now runs as its own little economy:
 *   - cafes.daily_game_limit (INT, default 10)  — max games a single user
 *     can host in this cafe per calendar day.
 *   - cafes.daily_reward_wheel (JSONB)          — array of {points, weight}
 *     slices that the user-facing daily wheel draws from. Cafe admins
 *     can rewrite this from their panel.
 *
 * games.cafe_id (INT, FK cafes) — every newly created game records which
 * cafe it was played in. Older games have NULL; that's fine for the limit
 * counter since it only considers today's rows.
 *
 * user_daily_spins — append-only ledger of "user X claimed the daily wheel
 * at cafe Y on date Z". A UNIQUE expression-index on
 * (user_id, cafe_id, DATE(spun_at AT TIME ZONE 'Europe/Istanbul')) is the
 * enforcement primitive: pg refuses a second insert on the same Turkish
 * calendar day, so the spin endpoint can't be raced into giving someone
 * two daily rewards in the same cafe.
 */
exports.up = (pgm) => {
  // A. cafes.daily_game_limit
  pgm.addColumn('cafes', {
    daily_game_limit: {
      type: 'INTEGER',
      notNull: true,
      default: 10,
    },
  });

  // B. cafes.daily_reward_wheel (JSONB array of {points, weight})
  pgm.addColumn('cafes', {
    daily_reward_wheel: {
      type: 'JSONB',
      notNull: true,
      default: pgm.func(
        `'[{"points":10,"weight":40},{"points":25,"weight":30},{"points":50,"weight":18},{"points":100,"weight":10},{"points":250,"weight":2}]'::jsonb`
      ),
    },
  });

  // C. games.cafe_id — every new game records its cafe
  pgm.addColumn('games', {
    cafe_id: {
      type: 'INTEGER',
      references: 'cafes(id)',
      onDelete: 'SET NULL',
    },
  });
  pgm.createIndex('games', ['cafe_id', 'created_at'], {
    name: 'idx_games_cafe_created',
  });

  // D. user_daily_spins ledger
  pgm.createTable('user_daily_spins', {
    id: { type: 'SERIAL', primaryKey: true },
    user_id: {
      type: 'INTEGER',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    cafe_id: {
      type: 'INTEGER',
      notNull: true,
      references: 'cafes(id)',
      onDelete: 'CASCADE',
    },
    points_won: { type: 'INTEGER', notNull: true },
    spun_at: {
      type: 'TIMESTAMP WITH TIME ZONE',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // The unique daily key uses Europe/Istanbul so a Turkish midnight rollover
  // (the user's day boundary) controls eligibility — not UTC, which would
  // surprise users at 3 AM local.
  pgm.sql(`
    CREATE UNIQUE INDEX idx_user_daily_spins_once_per_day
      ON user_daily_spins (
        user_id,
        cafe_id,
        ((spun_at AT TIME ZONE 'Europe/Istanbul')::date)
      );
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('user_daily_spins');
  pgm.dropIndex('games', ['cafe_id', 'created_at'], { name: 'idx_games_cafe_created' });
  pgm.dropColumn('games', 'cafe_id');
  pgm.dropColumn('cafes', 'daily_reward_wheel');
  pgm.dropColumn('cafes', 'daily_game_limit');
};
