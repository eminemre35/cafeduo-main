# CafeDuo

Üniversite öğrencileri için oyunlaştırılmış kafe sadakat platformu. Kullanıcı kafede check-in yapar, 2 kişilik oyun oynar, puan kazanır, ödüllere dönüştürür.

**Stack:** Node 20 + Express, React + Vite + TS, PostgreSQL 15 (pgvector), Redis 7, Socket.IO, Docker Compose + Caddy 2 production.

## Komutlar

- `npm run dev` — concurrently backend (nodemon) + frontend (vite)
- `npm test` — jest (817 test, ~30s)
- `npm run test:ci` — jest + coverage; CI'da çalışır, threshold 50/40/50/50
- `npm run quality` — lint + typecheck (commit öncesi şart)
- `npm run lint` / `lint:fix` / `format` / `format:check` / `typecheck`
- `npm run smoke:prod` — production health probe
- `npm run migrate:up` / `migrate:status` / `migrate:create <name>`
- `npm run test:e2e:smoke` — Playwright smoke (Chromium)

## Workflow

- **Branch açma**, doğrudan `main`'e push (her push `deploy-vps.yml` tetikler → prod deploy)
- `npm run quality && npm test` yerelde yeşil olmadan commit ETME
- Husky pre-commit `lint-staged` çalıştırır (eslint --fix + prettier --write staged dosyalar)
- Commit sonrası: `gh run watch <id>` ile deploy bekle, smoke fail → `git revert HEAD && git push`
- Production: https://cafeduotr.com, health: `/api/health` → `{database:true}`

## Mimari Notlar

- **Backend:** `backend/server.js` (1100+ LOC monolit, bölünmeyi bekliyor); `routes/` → `controllers/` → `services/repositories/`; middleware: `authenticateToken`, `csrfMiddleware`, rate limit (Redis store)
- **Frontend:** `App.tsx` → `CafeSelection` (GPS check-in) → `Dashboard` (tabs: games/leaderboard/achievements); `hooks/useLiveScoreGame.ts` aim+quiz ortak yaşam döngüsü için
- **Realtime:** Socket.IO `game_state_updated` event, fallback polling (aim 2.2s, quiz 15s)
- **Game registry:** `shared/gameRegistry.js` (CommonJS, hem backend hem frontend okur) — 3 oyun: Nişancı Düellosu, Bilgi Yarışı, Retro Satranç
- **Settlement:** `backend/handlers/game/settlementUtils.js` — kazanan `min(stake, loser.points)` puan transferi
- **Idempotency:** Live submissions `submissionKey: "{prefix}|{gameId}|{user}|{round}|{score}|{done}"` ile dedupe

## Windows + PowerShell Gotcha'ları

- **`npm` doğrudan çalışmaz** (execution policy `npm.ps1`'i bloke eder); CMD üzerinden: `cmd /c "npm test"`
- **claude.exe PATH** her zaman olmayabilir; tam yol `%APPDATA%\Claude\claude-code\<version>\claude.exe` veya kullanıcı PATH'e eklenir
- **`.husky/pre-commit` BOM'suz UTF-8 olmalı** — `Set-Content` UTF-8 with BOM yazar; kullan: `[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))`
- **SSH port 22** geçici fail2ban/rate-limit ile kapanabilir (~10-15 dak sonra açılır)

## Test Patterns

- Jest config: `setupFilesAfterEnv` (NOT `setupFilesAfterEach` — bu typo seed'i yüklemez!)
- Mock pattern: `lib/api`, `lib/multiplayer`, `lib/socket` jest.mock blokları (bkz. `hooks/useLiveScoreGame.test.ts`)
- Fake timers + async promise zorluk: `setTimeout` spy ile timer arming'i doğrula (direkt invoke etmek brittle)
- Coverage hesaplanır: frontend (components/hooks/contexts/lib) + backend (services/controllers/handlers/repositories/middleware/utils)

## Vite / TS Gotcha'ları

- **Jest CommonJS emit `import.meta` parse edemiyor** → tüm `import.meta.env` erişimi `lib/viteEnv.ts` üzerinden (`getViteEnvVar()`). Bu modül tek `no-new-func` exception'ını içerir.
- TypeScript şu an permissive (`strict: false`); ileride sertleştirme planlı
- ESLint v9 flat config (`eslint.config.mjs`), 4 katman: TS / backend / scripts / tests
- ESLint v9 + `@eslint/js@^9` uyumlu (10.x ile çakışır)

## Production / Deploy

- **Deploy path:** sunucuda `/opt/cafeduo-main`, container'lar Docker Compose ile
- **`.github/workflows/deploy-vps.yml`:** rsync → migrate:status → docker compose up --build → smoke
- **Husky prod fix:** `"prepare": "husky || true"` zorunlu (Dockerfile `npm ci --only=production` devDeps'i kaldırır, husky binary olmaz)
- **Sentry DSN şu an boş** (production env'de set edilmemiş)
- **Dokploy** alternatifi de configure edilmiş (`deploy/docker-compose.dokploy.yml`)

## Bilinen Tech Debt

- `backend/server.js` 1100+ LOC monolitik (modülerize bekliyor)
- `backend/services/gameMoveService.js` 1070 LOC (DB+memory ikiz; bölme planı PR #4)
- 3 büyük frontend komponent: `RetroChess.tsx` (929), `AdminDashboard.tsx` (856), `lib/api.ts` (745) — split adayı
- TypeScript strict mode kapalı
- 109 ESLint warning (`any`, `console.log`, vb.) — kural-kural error'a çevrilecek
- Coverage threshold şu an 50/40/50/50; testler %67 lines, %54 branches
- Phase mekaniği yok (PR #5'te eklenecek)
- Player progression (XP/level/rank) yok (PR #6 planlı)
