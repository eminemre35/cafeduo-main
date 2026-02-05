# 🏛️ Council Decision Log

> Records of the CafeDuo High Council debates.
> Members: VOLT (Speed), AEGIS (Security), MUSE (Quality).

## Template
### [Date] Topic Name
- **🚀 VOLT**: [Innovation proposal]
- **🛡️ AEGIS**: [Risk analysis]
- **🎨 MUSE**: [Quality/UX check]
- **⚖️ VERDICT**: [Final decision approved by Governor]

---

## Decisions

### 2026-02-05 P0 Security Hardening
- **🚀 VOLT**: Keep momentum by applying route-level guards first, then refactor.
- **🛡️ AEGIS**: Eliminate insecure defaults and client-trusted purchase payloads.
- **🎨 MUSE**: Keep behavior stable for users while tightening backend controls.
- **⚖️ VERDICT**: Approved and applied.
  1. `***REMOVED***` fallback removed; startup fails fast without secret.
  2. `POST /api/rewards` and `DELETE /api/rewards/:id` locked behind auth + cafe-admin role.
  3. Duplicate rewards endpoint block removed to avoid route shadowing.
  4. `POST /api/coupons/use` locked behind auth + cafe-admin role.
  5. `/api/shop/buy` now validates reward from DB and no longer trusts client cost/title.
  6. Frontend buy contract updated to send only `rewardId`.

### 2026-02-05 Redis Strategy
- **🚀 VOLT**: Use `redis:alpine` in docker-compose. Fast, simple.
- **🛡️ AEGIS**: Must use environment variables for connection strings. Security first.
- **🎨 MUSE**: Ensure Frontend handles reconnection gracefully (Toast notifications).
- **⚖️ VERDICT**: **Plan B** (Docker + Env + UX Check) was approved.
