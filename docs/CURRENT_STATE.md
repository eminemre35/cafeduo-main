# CafeDuo Current State

Last updated: 2026-03-07

## Summary

CafeDuo is live at `https://cafeduotr.com` and currently operates with cookie-first authentication, strict production deploy gating, and authenticated public smoke validation.

Current repo-head validation:

- `npm run test` passes
- `npm run test:ci` passes
- `npm run build` passes
- `npm run migrate:status` passes in informational mode when DB is unreachable locally
- `npm run test:e2e -- --project=chromium` passes locally
- Production health endpoint returns `OK`
- Production version endpoint returns a live commit hash

## Source Of Truth

Use these as the primary operational references:

- [`DEPLOYMENT.md`](/home/emin/cafeduo-main/DEPLOYMENT.md)
- [`.github/workflows/deploy-vps.yml`](/home/emin/cafeduo-main/.github/workflows/deploy-vps.yml)
- [`docs/COOKIE_AUTH_TROUBLESHOOTING.md`](/home/emin/cafeduo-main/docs/COOKIE_AUTH_TROUBLESHOOTING.md)
- [`docs/PRODUCTION_MIGRATION_BASELINE.md`](/home/emin/cafeduo-main/docs/PRODUCTION_MIGRATION_BASELINE.md)

Historical analysis documents are useful for context, but they are not the source of truth for current production behavior.

## Current Production Decisions

- Deployment model: same-origin frontend + backend behind `cafeduotr.com`
- Auth model: cookie-first, header/handshake fallback still enabled for compatibility
- Cookie domain: `COOKIE_DOMAIN=` must stay empty for same-origin deployment
- Cookie policy: `sameSite='lax'`, `secure=true` in production
- JWT secret policy: production startup and deploy validation require `JWT_SECRET` length `>= 64`
- Blacklist policy: `BLACKLIST_FAIL_MODE=closed`
- Rate-limit store failure policy: production defaults to fail-closed unless explicitly overridden
- Public smoke: validates authenticated cookie flow, `/api/auth/me`, socket auth, and logout
- Deploy gate: production env secrets, migration status, and smoke must pass before release

## Active Risks

- The main quality risk is CI E2E stability, not core application behavior. The current fix standardizes Playwright and E2E API readiness on `127.0.0.1` to eliminate `localhost -> ::1` drift in GitHub Actions.
- Coverage is still materially low for large realtime game components such as `TankBattle`, `RetroChess`, and the social card/board games.
- Root local `.env` can still trigger a Vite warning if it contains `NODE_ENV`; this is a local operator issue, not a production runtime issue.
- Manual edits on VPS `.env` remain temporary unless `DEPLOY_ENV_B64` is updated in GitHub secrets.

## Immediate Priorities

1. Keep GitHub Actions green by preserving deterministic Chromium E2E host resolution.
2. Keep runtime security defaults aligned with production-safe behavior.
3. Raise coverage on large realtime and social game components without destabilizing deploy quality.
