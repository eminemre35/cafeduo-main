/**
 * Tournament routes — cafe-scoped time-windowed prize competitions.
 *
 * Endpoints:
 *   GET    /api/tournaments?cafeId=N      list active+upcoming (cached 60s)
 *   GET    /api/tournaments/:id/leaderboard top 20 with cumulative points (cached 15s, busted on settlement)
 *   POST   /api/tournaments                create  (requireCafeAdmin)
 *   DELETE /api/tournaments/:id            cancel only `scheduled` (requireCafeAdmin)
 *
 * Mirrors the createCommerceRoutes factory pattern so server.js can wire it
 * up with the same {authenticateToken, cache, tournamentHandlers} bag.
 */
const express = require('express');
const { requireCafeAdmin } = require('../middleware/auth');

const createTournamentRoutes = ({ authenticateToken, cache, tournamentHandlers }) => {
  const router = express.Router();

  router.get('/tournaments', cache(60), tournamentHandlers.listTournaments);
  router.get(
    '/tournaments/:id/leaderboard',
    authenticateToken,
    cache(15),
    tournamentHandlers.getLeaderboard
  );
  router.post(
    '/tournaments',
    authenticateToken,
    requireCafeAdmin,
    tournamentHandlers.createTournament
  );
  router.delete(
    '/tournaments/:id',
    authenticateToken,
    requireCafeAdmin,
    tournamentHandlers.cancelTournament
  );

  return router;
};

module.exports = { createTournamentRoutes };
