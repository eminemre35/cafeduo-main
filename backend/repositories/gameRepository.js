const createGameRepository = ({ pool, supportedGameTypes }) => {
  const WAITING_GAMES_SELECT = `
    SELECT
      id,
      host_name as "hostName",
      game_type as "gameType",
      points,
      table_code as "table",
      status,
      guest_name as "guestName",
      created_at as "createdAt"
    FROM games
    WHERE status = 'waiting'
      AND game_type = ANY($1::text[])
  `;

  const findLatestActiveGameByUsername = async (username) => {
    const result = await pool.query(
      `
        SELECT
          id,
          host_name as "hostName",
          game_type as "gameType",
          points,
          table_code as "table",
          status,
          guest_name as "guestName",
          player1_move as "player1Move",
          player2_move as "player2Move",
          game_state as "gameState",
          created_at as "createdAt"
        FROM games
        WHERE (host_name = $1 OR guest_name = $1)
          AND status = 'active'
          AND game_type = ANY($2::text[])
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [username, [...supportedGameTypes]]
    );

    return result.rows[0] || null;
  };

  const listWaitingGamesByCafe = async ({ cafeId }) => {
    const result = await pool.query(
      `
        ${WAITING_GAMES_SELECT}
        AND EXISTS (
          SELECT 1
          FROM users u
          WHERE LOWER(u.username) = LOWER(games.host_name)
            AND u.cafe_id = $2
        )
        ORDER BY created_at DESC
      `,
      [[...supportedGameTypes], cafeId]
    );

    return result.rows;
  };

  const listWaitingGamesByTable = async ({ tableCode }) => {
    const result = await pool.query(
      `
        ${WAITING_GAMES_SELECT}
        AND table_code = $2
        ORDER BY created_at DESC
      `,
      [[...supportedGameTypes], tableCode]
    );

    return result.rows;
  };

  const listWaitingGames = async () => {
    const result = await pool.query(
      `
        ${WAITING_GAMES_SELECT}
        ORDER BY created_at DESC
      `,
      [[...supportedGameTypes]]
    );

    return result.rows;
  };

  return {
    findLatestActiveGameByUsername,
    listWaitingGamesByCafe,
    listWaitingGamesByTable,
    listWaitingGames,
  };
};

module.exports = {
  createGameRepository,
};
