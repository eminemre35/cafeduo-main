# System Heartbeat

> **Status:** 🟡 In Progress (P0 Security Fixes Applied)

## Vital Signs
- **Backend Security**: JWT fallback secret removed; `JWT_SECRET` is now required at startup.
- **AuthZ Hardening**: `POST /api/rewards`, `DELETE /api/rewards/:id`, `POST /api/coupons/use` now require authenticated cafe-admin privileges.
- **Data Integrity**: `/api/shop/buy` now uses DB-validated reward price/title instead of client-submitted values.
- **API Contract**: Frontend buy flow updated to send only `rewardId`.
- **Build**: `npm run build` passed on 2026-02-05.
- **Tests**: `npm run test:ci` still fails due to pre-existing test suite issues (Jest+Playwright scope and two broken tests).

## Next Checkup
- Fix pre-existing test suite issues (`jest.config.js` e2e scope, `Dashboard.test.tsx`, `OfflineFallback.test.tsx`).
- Implement `/api/auth/verify` or remove route if deprecated.
- Resolve `cafeController.getAllCafes` DB connection guard (`req.isDbConnected` usage).
