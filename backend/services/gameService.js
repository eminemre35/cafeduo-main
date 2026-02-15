const createGameService = ({
  isDbConnected,
  gameRepository,
  getMemoryGames,
  getMemoryUsers,
  supportedGameTypes,
}) => {
  const listWaitingGames = async ({
    adminActor,
    hasCheckIn,
    actorCafeId,
    actorTableCode,
    requestedTableCode,
    scopeAllRequested,
  }) => {
    if (!adminActor && !hasCheckIn) {
      return [];
    }

    const effectiveTableCode = adminActor
      ? requestedTableCode
      : scopeAllRequested
        ? null
        : actorTableCode;

    if (await isDbConnected()) {
      if (!adminActor && scopeAllRequested) {
        return gameRepository.listWaitingGamesByCafe({ cafeId: actorCafeId });
      }

      if (effectiveTableCode) {
        return gameRepository.listWaitingGamesByTable({ tableCode: effectiveTableCode });
      }

      return gameRepository.listWaitingGames();
    }

    const memoryUsers = Array.isArray(getMemoryUsers?.()) ? getMemoryUsers() : [];
    return getMemoryGames().filter((game) => {
      if (String(game.status || '').toLowerCase() !== 'waiting') return false;
      if (!supportedGameTypes.has(String(game.gameType || '').trim())) return false;

      if (!adminActor && scopeAllRequested) {
        const hostName = String(game.hostName || '').trim().toLowerCase();
        const hostUser = memoryUsers.find(
          (user) => String(user?.username || '').trim().toLowerCase() === hostName
        );
        const hostCafeId = Number(hostUser?.cafe_id ?? hostUser?.cafeId ?? 0);
        if (hostCafeId !== actorCafeId) return false;
      }

      if (effectiveTableCode && String(game.table || '').trim().toUpperCase() !== effectiveTableCode) {
        return false;
      }

      return true;
    });
  };

  const getActiveGameForUser = async (username) => {
    if (await isDbConnected()) {
      return gameRepository.findLatestActiveGameByUsername(username);
    }

    const game = getMemoryGames().find(
      (item) =>
        (item.hostName === username || item.guestName === username) &&
        item.status === 'active' &&
        supportedGameTypes.has(String(item.gameType || '').trim())
    );

    return game || null;
  };

  return {
    listWaitingGames,
    getActiveGameForUser,
  };
};

module.exports = {
  createGameService,
};
