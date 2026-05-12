/**
 * Reset all non-admin/non-cafe-admin users.
 *
 * Goal: production has accumulated test/early-access users with stale data.
 * Wipe everyone whose role is 'user', keep admins + cafe admins (the
 * `emin3619` super-admin and the `iibfkantin` cafe manager are both in
 * those roles). Zero out scoreboard fields on the survivors so the
 * leaderboard starts clean.
 *
 * CASCADE behavior (defined in 20240224000001_initial_schema.js):
 *   - user_items.user_id ON DELETE CASCADE  → coupon inventory removed
 *   - password_reset_tokens.user_id ON DELETE CASCADE → tokens removed
 *
 * games has no FK on host_name / guest_name (they're VARCHAR), so games
 * rows referencing deleted users become orphans by name. We rewrite those
 * names to a sentinel so history queries don't crash UI fetches.
 *
 * Irreversible — production deploy MUST be preceded by `pg_dump cafeduo
 * > backup_pre_reset_$(date +%Y%m%d).sql` for recovery.
 */
exports.up = (pgm) => {
  pgm.sql(`
    -- 1. Wipe role='user' rows (cascades user_items + password_reset_tokens)
    DELETE FROM users WHERE role = 'user';

    -- 2. Zero the scoreboard fields on surviving admins + cafe_admins
    UPDATE users
       SET points = 0,
           wins = 0,
           games_played = 0
     WHERE role IN ('admin', 'cafe_admin');

    -- 3. Rename orphan game participants (FK is by name, not id, so
    --    they're now pointing at non-existent users)
    UPDATE games
       SET host_name = '[Silinmiş Kullanıcı]'
     WHERE host_name NOT IN (SELECT username FROM users);
    UPDATE games
       SET guest_name = '[Silinmiş Kullanıcı]'
     WHERE guest_name IS NOT NULL
       AND guest_name NOT IN (SELECT username FROM users);
  `);
};

exports.down = () => {
  // Intentionally a no-op. This migration is destructive and not
  // reversible — restore from the pre-deploy pg_dump if rollback is
  // needed.
  console.warn(
    '[migration 20260513000001_reset_users_keep_admins] down() is a no-op — restore DB from backup if rollback is required'
  );
};
