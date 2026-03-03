# Sprint 3: 90 -> 100 Puan Geliştirme Planı

## Genel Bakış

- **Mevcut Puan:** 90/100
- **Hedef Puan:** 100/100
- **Sprint Süresi:** 2 hafta
- **Öncelik:** Performance, Security, UX
- **Başlangıç Tarihi:** 1 Mart 2026
- **Bitiş Tarihi:** 15 Mart 2026

### Puan Dağılımı

| Görev | Puan | Kategori | Öncelik |
|-------|------|----------|---------|
| SELECT * Migration | +2 | Performance | P0 |
| LIMIT Clauses | +1 | Performance/Security | P0 |
| Redis KEYS -> SCAN | +1 | Performance | P0 |
| CSRF Token | +2 | Security | P0 |
| APM Monitoring (Sentry) | +1 | Observability | P1 |
| User-Friendly Error Messages | +1 | UX | P1 |
| Loading States/Skeleton Screens | +1 | UX | P1 |
| PWA Support | +1 | UX/Performance | P2 |

---

## Mevcut Durum Analizi

### Sprint 1 & 2 Sonrası Tamamlananlar

- ✅ SELECT * anti-pattern düzeltildi (commerceHandlers, profileHandlers, storeController, adminHandlers)
- ✅ N+1 achievement check optimize edildi
- ✅ Frontend polling 4s -> 15s
- ✅ Socket.IO primary, polling fallback
- ✅ CI/CD pipeline mevcut
- ✅ Database migration sistemi aktif
- ✅ Test coverage: 542/542 tests pass

### Kalan Sorunlar

1. **SELECT * Kalanlar:** Bazı dosyalarda hala `SELECT *` kullanımı var
2. **LIMIT Clauses:** Tüm user-facing query'lerde LIMIT yok
3. **Redis KEYS:** `redis.keys()` kullanımı SCAN'e çevrilmeli
4. **CSRF:** CSRF koruması mevcut değil
5. **APM:** Production monitoring (Sentry) eksik
6. **Error Messages:** Teknik hata mesajları kullanıcıya gösteriliyor
7. **Loading States:** Skeleton screens eksik
8. **PWA:** Vite 7 uyumluluk sorunu nedeniyle PWA disabled

---

## Görevler

### 🔴 Kritik Öncelik (Hafta 1)

#### 1. SELECT * Migration [+2 puan]

**Dosyalar:**
- `backend/controllers/cafeController.js`
- `backend/handlers/profileHandlers.js`
- `backend/handlers/commerceHandlers.js` (kalan kısımlar)
- `backend/repositories/gameRepository.js`
- `backend/handlers/adminHandlers.js` (kalan kısımlar)

**Açıklama:**
Tüm `SELECT *` sorgularını explicit columns'a çevir. Sprint 1'de bazı dosyalar düzeltildi ancak tamamlanmadı.

**Örnek Değişiklik:**
```javascript
// ÖNCESİ
const result = await pool.query('SELECT * FROM cafes ORDER BY name');

// SONRASI
const result = await pool.query(`
  SELECT id, name, latitude, longitude, radius, table_count,
         secondary_latitude, secondary_longitude, secondary_radius
  FROM cafes
  ORDER BY name
`);
```

**Test:**
```bash
npm run test
# Tüm testler geçmeli
grep -r "SELECT \*" backend/ --include="*.js" | grep -v ".test.js" | wc -l
# Sonuç: 0 olmalı
```

**Tracking:** Issue #1

---

#### 2. LIMIT Clauses Ekle [+1 puan]

**Dosyalar:**
- `backend/handlers/profileHandlers.js` - User achievements query
- `backend/handlers/commerceHandlers.js` - User items query
- `backend/controllers/storeController.js` - Inventory query
- `backend/handlers/adminHandlers.js` - Admin list queries

**Açıklama:**
User-facing tüm query'lere LIMIT ekle. Default değerler:
- Leaderboard: 50
- Inventory: 100
- History: 25
- Admin lists: 100

**Örnek Değişiklik:**
```javascript
// ÖNCESİ
const result = await pool.query(
  'SELECT * FROM user_items WHERE user_id = $1 ORDER BY redeemed_at DESC',
  [userId]
);

// SONRASI
const result = await pool.query(
  `SELECT id, user_id, item_id, item_title, code, is_used, redeemed_at, used_at
   FROM user_items
   WHERE user_id = $1
   ORDER BY redeemed_at DESC
   LIMIT 100`,
  [userId]
);
```

**Test:**
```bash
# Test: User with 150 items should get max 100
npm run test -- --testNamePattern="inventory"
```

**Tracking:** Issue #2

---

#### 3. Redis KEYS -> SCAN Migration [+1 puan]

**Dosyalar:**
- `backend/middleware/cache.js`
- `backend/services/lobbyCacheService.js`

**Açıklama:**
`redis.keys(pattern)` kullanımı O(N) blocking operation. `redis.scan()` ile non-blocking hale getir.

**Örnek Değişiklik:**
```javascript
// ÖNCESİ
const clearCache = async (pattern) => {
  const keys = await redis.keys(pattern); // BLOCKING O(N)
  if (keys.length > 0) {
    await redis.del(keys);
  }
};

// SONRASI
const clearCache = async (pattern) => {
  let cursor = '0';
  let totalDeleted = 0;
  const batch = [];

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH', pattern,
      'COUNT', 100
    );
    cursor = nextCursor;

    if (keys.length > 0) {
      batch.push(...keys);
      if (batch.length >= 100) {
        await redis.del(...batch);
        totalDeleted += batch.length;
        batch.length = 0;
      }
    }
  } while (cursor !== '0');

  if (batch.length > 0) {
    await redis.del(...batch);
    totalDeleted += batch.length;
  }

  if (totalDeleted > 0) {
    logger.info(`Cleared ${totalDeleted} cache keys matching: ${pattern}`);
  }
};
```

**Test:**
```bash
# Redis monitoring ile test
redis-cli MONITOR | grep SCAN
# Cache invalidation sırasında blocking yok
```

**Tracking:** Issue #3

---

#### 4. CSRF Token Ekle [+2 puan]

**Dosyalar:**
- `backend/middleware/csrf.js` (yeni)
- `backend/server.js` (middleware registration)
- `lib/api.ts` (token handling)
- `contexts/AuthContext.tsx` (token storage)

**Açıklama:**
State-changing POST/PUT/DELETE endpoint'leri için CSRF koruması ekle. JWT ile çalışan bir CSRF implementasyonu kullan.

**Implementasyon:**
```javascript
// backend/middleware/csrf.js
const crypto = require('crypto');

const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('base64');
};

const csrfProtection = async (req, res, next) => {
  // GET requests için atla
  if (req.method === 'GET') {
    return next();
  }

  // WebSocket upgrade için atla
  if (req.headers.upgrade === 'websocket') {
    return next();
  }

  const token = req.headers['x-csrf-token'];
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: 'CSRF token validation failed',
      code: 'CSRF_INVALID'
    });
  }

  next();
};

const getCSRFToken = (req) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCSRFToken();
  }
  return req.session.csrfToken;
};

module.exports = { csrfProtection, getCSRFToken };
```

**Endpoint:**
```javascript
// GET /api/csrf-token
app.get('/api/csrf-token', (req, res) => {
  res.json({ token: getCSRFToken(req) });
});
```

**Frontend:**
```typescript
// lib/api.ts - Her request'e CSRF token ekle
const csrfToken = localStorage.getItem('csrf_token');
if (csrfToken && ['POST', 'PUT', 'DELETE'].includes(method)) {
  headers['x-csrf-token'] = csrfToken;
}
```

**Test:**
```bash
# CSRF token olmadan POST request 403 dönmeli
curl -X POST http://localhost:3001/api/games -H "Content-Type: application/json"
# Expected: 403 CSRF_INVALID

# CSRF token ile başarılı
curl -X POST http://localhost:3001/api/games \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: <valid_token>"
```

**Tracking:** Issue #4

---

### 🟡 Orta Öncelik (Hafta 1-2)

#### 5. APM Monitoring (Sentry) Ekle [+1 puan]

**Dosyalar:**
- `backend/sentry.js` (yeni)
- `backend/server.js` (Sentry init)
- `sentry.client.config.ts` (yeni)
- `sentry.server.config.ts` (yeni)

**Açıklama:**
Production error tracking ve performance monitoring için Sentry entegrasyonu.

**Backend:**
```javascript
// backend/sentry.js
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});

module.exports = Sentry;
```

**Frontend:**
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    new BrowserTracing({
      tracePropagationTargets: ['localhost', 'api.cafeduo.com'],
    }),
  ],
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  beforeSend(event) {
    // Hassas verileri temizle
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  },
});
```

**Environment Variables:**
```bash
# .env.production
SENTRY_DSN=https://<key>@sentry.io/<project>
VITE_SENTRY_DSN=https://<key>@sentry.io/<project>
```

**Test:**
```bash
# Test error
curl http://localhost:3001/api/test-error
# Sentry dashboard'da görünmeli
```

**Tracking:** Issue #5

---

#### 6. Error Messages Kullanıcı Dostu Hale Getir [+1 puan]

**Dosyalar:**
- `backend/middleware/errorContract.js`
- `components/ErrorBoundary.tsx` (yeni)
- `contexts/ToastContext.tsx` (error display)
- `lib/api.ts` (error parsing)

**Açıklama:**
Teknik hata mesajları yerine kullanıcı dostu mesajlar göster.

**Backend Error Mapping:**
```javascript
// backend/middleware/errorContract.js
const ERROR_MESSAGES = {
  DATABASE_ERROR: {
    userMessage: 'Veritabanına bağlanırken bir sorun oluştu. Lütfen tekrar deneyin.',
    logMessage: 'Database connection failed',
    statusCode: 503,
  },
  AUTH_INVALID_TOKEN: {
    userMessage: 'Oturumunuz süresi doldu. Lütfen tekrar giriş yapın.',
    logMessage: 'Invalid JWT token',
    statusCode: 401,
  },
  GAME_FULL: {
    userMessage: 'Bu oyun dolu. Başka bir masa seçin.',
    logMessage: 'Game is full',
    statusCode: 400,
  },
  // ... daha fazla error mapping
};

const formatErrorResponse = (error) => {
  const errorKey = error.code || 'UNKNOWN_ERROR';
  const errorConfig = ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.UNKNOWN_ERROR;

  return {
    error: errorConfig.userMessage,
    code: errorKey,
    statusCode: errorConfig.statusCode,
    requestId: error.requestId,
  };
};
```

**Frontend Error Display:**
```typescript
// components/ErrorBoundary.tsx
const ErrorMessages = {
  DATABASE_ERROR: 'Veritabanı bağlantı hatası. Lütfen sayfayı yenileyin.',
  NETWORK_ERROR: 'İnternet bağlantınızı kontrol edin.',
  AUTH_ERROR: 'Oturumunuz süresi doldu. Tekrar giriş yapın.',
  GAME_ERROR: 'Oyun yüklenirken hata oluştu.',
};

export const getUserFriendlyMessage = (error: ApiError): string => {
  return ErrorMessages[error.code] || ErrorMessages.UNKNOWN_ERROR;
};
```

**Test:**
```bash
# Test: Database error durumunda kullanıcı dostu mesaj
npm run test -- --testNamePattern="error"
```

**Tracking:** Issue #6

---

#### 7. Loading States/Skeleton Screens Tamamla [+1 puan]

**Dosyalar:**
- `components/Skeleton.tsx` (yeni)
- `components/GameCard.tsx` (skeleton state)
- `components/Leaderboard.tsx` (skeleton state)
- `components/Store.tsx` (skeleton state)

**Açıklama:**
Veri yüklenirken gösterilecek skeleton screen'ler ekle.

**Skeleton Component:**
```typescript
// components/Skeleton.tsx
export const Skeleton = ({ className, variant = 'rect' }) => {
  return (
    <div
      className={`animate-pulse bg-gray-700 rounded ${className}`}
      style={{
        animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    />
  );
};

export const GameCardSkeleton = () => (
  <div className="bg-gray-800 rounded-lg p-4">
    <Skeleton className="h-4 w-3/4 mb-2" />
    <Skeleton className="h-3 w-1/2 mb-4" />
    <div className="flex gap-2">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
);

export const LeaderboardSkeleton = () => (
  <div className="space-y-2">
    {[...Array(10)].map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);
```

**Usage:**
```typescript
// components/Games.tsx
{isLoading ? (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(6)].map((_, i) => (
      <GameCardSkeleton key={i} />
    ))}
  </div>
) : (
  <GamesList games={games} />
)}
```

**Test:**
```bash
# Test: Loading state'de skeleton görünür
npm run test:e2e -- --project=chromium
```

**Tracking:** Issue #7

---

### 🟢 Düşük Öncelik (Hafta 2)

#### 8. PWA Support Etkinleştir [+1 puan]

**Dosyalar:**
- `vite.config.ts`
- `public/sw.js` (yeni)
- `public/manifest.json` (güncelle)
- `index.html` (PWA meta tags)

**Açıklama:**
Vite 7 uyumlu PWA implementasyonu. `vite-plugin-pwa` yerine manuel service worker.

**Service Worker:**
```javascript
// public/sw.js
const CACHE_NAME = 'cafeduo-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/logo-192.png',
  '/assets/logo-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

**Registration:**
```typescript
// index.tsx
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('SW registered:', reg))
      .catch((err) => console.log('SW registration failed:', err));
  });
}
```

**Manifest Update:**
```json
{
  "name": "CafeDuo",
  "short_name": "CafeDuo",
  "description": "Gamified Cafe Loyalty Platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f141a",
  "theme_color": "#0f141a",
  "icons": [
    {
      "src": "/assets/logo-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/assets/logo-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Test:**
```bash
# Lighthouse PWA score
npx lighthouse http://localhost:3000 --view
# PWA score: 90+ olmalı
```

**Tracking:** Issue #8

---

## Implementation Checklist

### Hafta 1 (P0 Görevler)

- [ ] **Task 1:** SELECT * Migration
  - [ ] `cafeController.js` - cafes query
  - [ ] `profileHandlers.js` - users/achievements queries
  - [ ] `gameRepository.js` - game queries
  - [ ] `adminHandlers.js` - remaining queries
  - [ ] Test: `grep -r "SELECT \*" backend/` returns 0
  - [ ] Test: All unit tests pass

- [ ] **Task 2:** LIMIT Clauses
  - [ ] `profileHandlers.js` - achievements LIMIT 100
  - [ ] `commerceHandlers.js` - rewards LIMIT 100
  - [ ] `storeController.js` - inventory LIMIT 100
  - [ ] `adminHandlers.js` - admin lists LIMIT 100
  - [ ] Test: Large dataset returns limited results

- [ ] **Task 3:** Redis KEYS -> SCAN
  - [ ] `cache.js` - clearCache function
  - [ ] `lobbyCacheService.js` - cache invalidation
  - [ ] Test: No blocking during cache clear
  - [ ] Test: All keys deleted correctly

- [ ] **Task 4:** CSRF Token
  - [ ] Create `csrf.js` middleware
  - [ ] Add `/api/csrf-token` endpoint
  - [ ] Update `api.ts` to send CSRF token
  - [ ] Update `AuthContext` to store CSRF token
  - [ ] Test: POST without CSRF returns 403
  - [ ] Test: POST with CSRF succeeds

### Hafta 2 (P1-P2 Görevler)

- [ ] **Task 5:** APM Monitoring (Sentry)
  - [ ] Install `@sentry/node` and `@sentry/react`
  - [ ] Create `sentry.js` backend config
  - [ ] Create `sentry.client.config.ts`
  - [ ] Add `SENTRY_DSN` to `.env.production`
  - [ ] Test: Error appears in Sentry dashboard
  - [ ] Test: Performance traces working

- [ ] **Task 6:** User-Friendly Error Messages
  - [ ] Create error message mapping
  - [ ] Update `errorContract.js`
  - [ ] Create `ErrorBoundary.tsx`
  - [ ] Update `ToastContext` for error display
  - [ ] Test: All errors show user-friendly messages
  - [ ] Test: Technical details hidden from users

- [ ] **Task 7:** Loading States/Skeleton Screens
  - [ ] Create `Skeleton.tsx` component
  - [ ] Create `GameCardSkeleton`
  - [ ] Create `LeaderboardSkeleton`
  - [ ] Create `StoreSkeleton`
  - [ ] Update `Games.tsx` to use skeleton
  - [ ] Update `Leaderboard.tsx` to use skeleton
  - [ ] Update `Store.tsx` to use skeleton
  - [ ] Test: Skeletons appear during loading

- [ ] **Task 8:** PWA Support
  - [ ] Create `public/sw.js`
  - [ ] Update `public/manifest.json`
  - [ ] Add PWA meta tags to `index.html`
  - [ ] Register service worker in `index.tsx`
  - [ ] Test: Lighthouse PWA score 90+
  - [ ] Test: Offline functionality works

---

## Test Planı

### Unit Tests

```bash
# Backend tests
npm run test

# Coverage report
npm run test:coverage

# Target: 80%+ coverage
```

### Integration Tests

```bash
# API integration tests
npm run test:integration

# Test CSRF protection
npm run test -- --testNamePattern="csrf"

# Test rate limiting
npm run test -- --testNamePattern="rateLimit"
```

### E2E Tests

```bash
# Full E2E suite
npm run test:e2e

# Specific scenarios
npm run test:e2e -- --spec=auth.spec.ts
npm run test:e2e -- --spec=game.spec.ts
npm run test:e2e -- --spec=shop.spec.ts
```

### Performance Tests

```bash
# Load test
artillery run load-test.yml

# Target: p95 latency < 100ms
# Target: 0% errors under load
```

### Security Tests

```bash
# CSRF test
curl -X POST http://localhost:3001/api/games
# Expected: 403 CSRF_INVALID

# SQL injection test
curl "http://localhost:3001/api/games?tableCode=' OR '1'='1"
# Expected: 400 Bad Request

# Rate limit test
for i in {1..100}; do curl http://localhost:3001/api/games; done
# Expected: 429 Too Many Requests
```

---

## Deployment Planı

### Pre-Deployment Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] No console errors in production build
- [ ] Sentry DSN configured
- [ ] Environment variables set
- [ ] Database migrations applied

### Deployment Steps

1. **Create Release Branch**
   ```bash
   git checkout -b release/sprint-3
   ```

2. **Run Full Test Suite**
   ```bash
   npm run test:all
   ```

3. **Create Migration (if needed)**
   ```bash
   npm run migrate:create sprint_3_changes
   npm run migrate:up
   ```

4. **Build Production Assets**
   ```bash
   npm run build
   ```

5. **Deploy to Staging**
   ```bash
   # CI/CD pipeline handles this
   # Manual verification required
   ```

6. **Smoke Tests on Staging**
   ```bash
   ./deploy/scripts/smoke-vps.sh
   ```

7. **Deploy to Production**
   ```bash
   # Via CI/CD or manual
   ./deploy/deploy-production.sh
   ```

8. **Post-Deployment Verification**
   - [ ] Health check: `GET /health`
   - [ ] API responding: `GET /api/games`
   - [ ] WebSocket connected
   - [ ] Sentry receiving errors
   - [ ] No error spikes in logs

### Rollback Plan

```bash
# If issues detected
./deploy/scripts/rollback.sh

# Or via CI/CD
git revert <commit-hash>
git push origin main
```

---

## Monitoring & Metrics

### Key Metrics to Track

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| API p95 Latency | 100ms | <80ms | Sentry/APM |
| Error Rate | <1% | <0.5% | Sentry |
| Cache Hit Rate | 90% | >95% | Redis INFO |
| DB Query Time | 50ms | <30ms | pg_stat_statements |
| PWA Score | N/A | >90 | Lighthouse |
| CSRF Violations | N/A | 0 | Logs |

### Alerts to Configure

- Error rate > 1% for 5 minutes
- API p95 latency > 200ms for 5 minutes
- Database connection pool > 80%
- Redis memory > 80%
- CSRF violations > 10/min

---

## Riskler ve Mitigasyon

### Risk 1: CSRF Token Breaking Existing Clients

**Mitigasyon:**
- CSRF token'ı optional olarak başlat
- Grace period: 1 hafta boyunca warning log
- Sonra strict mode'a geç

### Risk 2: Sentry Performance Overhead

**Mitigasyon:**
- Production'da sampling rate: 10%
- Sadece error tracking, profiling kapalı
- CDN edge caching

### Risk 3: PWA Service Worker Cache Staleness

**Mitigasyon:**
- Cache versioning (v1, v2, ...)
- Activate event'te eski cache'leri temizle
- Network-first strategy for API calls

### Risk 4: Redis SCAN Migration Bugs

**Mitigasyon:**
- Feature flag ile kontrol
- A/B test: %50 traffic SCAN, %50 KEYS
- Monitor Redis latency closely

---

## Sonraki Adımlar (Sprint 4)

Sprint 3 tamamlandıktan sonra:

1. **Social Games Multiplayer** (MonopolySocial, UnoSocial)
2. **Bundle Optimization** (Code splitting, lazy loading)
3. **Accessibility Improvements** (ARIA labels, keyboard nav)
4. **Mobile App** (React Native / Capacitor)

---

## İlgili Dokümanlar

- [`AGENTS.md`](../AGENTS.md) - Must-follow constraints
- [`OPTIMIZATIONS.md`](../OPTIMIZATIONS.md) - Performance audit
- [`docs/SPRINT_1_SUMMARY.md`](SPRINT_1_SUMMARY.md) - Sprint 1 results
- [`docs/SPRINT_2_SUMMARY.md`](SPRINT_2_SUMMARY.md) - Sprint 2 results
- [`DEVELOPMENT_PLAN.md`](../DEVELOPMENT_PLAN.md) - Full roadmap

---

**Son Güncelleme:** 1 Mart 2026  
**Sprint Sahibi:** Development Team  
**Review Date:** 8 Mart 2026 (Mid-sprint review)
