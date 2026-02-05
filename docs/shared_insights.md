# 💡 Shared Insights & Cross-Agent Comms

> Use this file to log architectural decisions, API changes, or design tokens that affect multiple domains.

## 📡 Backend -> Frontend
- **2026-02-05 / Shop API Contract Change**:
  `/api/shop/buy` now accepts `rewardId`; server resolves reward `title/cost` from DB.
  Client-side `userId` and client-supplied reward price/title are no longer trusted.
- **2026-02-05 / Auth Requirement Change**:
  `POST /api/coupons/use` now requires authenticated `cafe_admin`/`admin`.
- **Redis Integration**: We are adding Redis. This might cause a brief downtime in Socket.IO connections during deployment.
- **API Latency**: We aim to reduce game creation time from ~200ms to <50ms.

## 🎨 Frontend -> Backend
- **2026-02-05 / Frontend Updated**:
  `api.shop.buy()` signature changed from `(userId, rewardId)` to `(rewardId)`.

## 🛡️ Architect Notes
- Keep `schema.sql` synchronized with any migration.
- Ensure `types.ts` is updated if API response structure changes for performance reasons.
- `JWT_SECRET` is now mandatory in runtime environment for all deployments.
