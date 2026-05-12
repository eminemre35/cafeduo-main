const express = require('express');
const { requireCafeAdmin, requireOwnership } = require('../middleware/auth');

const createCommerceRoutes = ({ authenticateToken, cache, commerceHandlers }) => {
  const router = express.Router();

  router.post('/rewards', authenticateToken, requireCafeAdmin, commerceHandlers.createReward);
  router.get('/rewards', cache(600), commerceHandlers.getRewards);
  router.delete('/rewards/:id', authenticateToken, requireCafeAdmin, commerceHandlers.deleteReward);

  router.post('/shop/buy', authenticateToken, commerceHandlers.buyShopItem);
  router.get(
    '/users/:id/items',
    authenticateToken,
    requireOwnership('id'),
    commerceHandlers.getUserItems
  );
  router.post('/coupons/use', authenticateToken, requireCafeAdmin, commerceHandlers.useCoupon);
  router.get(
    '/shop/inventory/:userId',
    authenticateToken,
    requireOwnership('userId'),
    commerceHandlers.getShopInventory
  );

  // Daily reward wheel (PR #36) — per-user per-cafe per-day, spin once.
  // Cafe admins can edit their cafe's wheel slices via setCafeWheel.
  router.get('/wheel/:cafeId', authenticateToken, commerceHandlers.getDailyWheel);
  router.post('/wheel/:cafeId/spin', authenticateToken, commerceHandlers.spinDailyWheel);
  router.put('/wheel/:cafeId', authenticateToken, requireCafeAdmin, commerceHandlers.setCafeWheel);

  return router;
};

module.exports = { createCommerceRoutes };
