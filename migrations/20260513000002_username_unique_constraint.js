/**
 * Enforce case-insensitive UNIQUE constraint on users.username.
 *
 * Before this migration there was only a non-unique index for case-
 * insensitive lookup (`idx_users_username_lower_cafe`); registration
 * code (authController.register) only checked email, so two accounts
 * could exist with the same username (e.g. "Emin" and "emin", or two
 * "emin"s with different emails).
 *
 * After this migration:
 *   - DB-level guard: LOWER(username) must be unique across all rows
 *   - authController.register also rejects duplicates with a friendly
 *     Turkish error before INSERT (avoids 500-on-pg-error UX)
 *
 * Must run AFTER 20260513000001_reset_users_keep_admins.js so any
 * pre-existing duplicate `username` collisions in the legacy test data
 * are removed before the unique index is created (otherwise the index
 * creation would fail).
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower_unique
      ON users (LOWER(username));
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_users_username_lower_unique;`);
};
