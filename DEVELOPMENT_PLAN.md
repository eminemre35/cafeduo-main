# CafeDuo Geliştirme Planı

**Tarih:** 27 Şubat 2026  
**Durum:** Doküman bazlı analiz tamamlandı  
**Hedef:** Projeyi production-ready seviyeye taşımak

---

## 📊 Mevcut Durum Analizi

### ✅ Tamamlanmış İyileştirmeler

Dokümantasyon ve kod analizi sonucunda şu iyileştirmelerin **halihazırda uygulanmış** olduğu tespit edildi:

#### 1. Performans İyileştirmeleri (OPTIMIZATIONS.md)
- ✅ **DB Connection Pool:** [`backend/db.js:29-68`](backend/db.js) - Pool configuration implemented (max: 20, idle timeout, monitoring)
- ✅ **Lobby Cache TTL:** [`backend/services/lobbyCacheService.js:30`](backend/services/lobbyCacheService.js) - Increased to 60s
- ✅ **Redis SCAN Usage:** [`backend/middleware/cache.js:57-95`](backend/middleware/cache.js) - KEYS replaced with SCAN cursor
- ✅ **SELECT * Fixes:** [`backend/controllers/storeController.js:29-36`](backend/controllers/storeController.js) - Explicit columns specified
- ✅ **LIMIT Clauses:** [`backend/controllers/storeController.js:34`](backend/controllers/storeController.js) - LIMIT 100 added to queries
- ✅ **Achievement Check:** [`backend/handlers/profileHandlers.js:14-17`](backend/handlers/profileHandlers.js) - SELECT columns specified (N+1 pattern still exists)

#### 2. Güvenlik İyileştirmeleri (SECURITY_AUDIT.md)
- ✅ **Socket.IO Auth:** [`lib/socket.ts:77-79`](lib/socket.ts) - JWT token authentication implemented
- ✅ **Token Blacklist:** [`backend/middleware/socketAuth.js:76-111`](backend/middleware/socketAuth.js) - Blacklist checking active
- ✅ **Fail-Closed Mode:** [`backend/middleware/socketAuth.js:88`](backend/middleware/socketAuth.js) - Redis errors reject connections

#### 3. Kod Kalitesi
- ✅ **Migration System:** [`migrations/`](migrations/) folder exists with migration files
- ✅ **Structured Logging:** Winston logger with request IDs
- ✅ **Error Contract:** Unified error format with codes

---

## 🔴 Kritik Öncelikli Görevler (P0)

### 1. SELECT * Anti-Pattern'inin Kalan Örneklerinin Düzeltilmesi
**Durum:** Kısmi olarak düzeltilmiş, hala 5+ örnek var

**Etkilenen Dosyalar:**
- `backend/handlers/profileHandlers.js:21-22` - achievements SELECT *
- `backend/handlers/commerceHandlers.js:80,372` - rewards SELECT *
- `backend/controllers/cafeController.js:183` - cafes SELECT *

**Yapılacaklar:**
```javascript
// ÖNCESİ
const achievementsRes = await pool.query('SELECT * FROM achievements ORDER BY points_reward ASC');

// SONRASI
const achievementsRes = await pool.query(`
  SELECT id, title, description, condition_type, condition_value, points_reward
  FROM achievements
  ORDER BY points_reward ASC
`);
```

**Tahmini Süre:** 2 saat  
**Etki:** 40% bandwidth azalması, daha hızlı cache serialization

---

### 2. N+1 Query Pattern'inin Achievement Check'te Düzeltilmesi
**Durum:** Henüz düzeltilmemiş

**Sorun:** [`backend/handlers/profileHandlers.js:26-45`](backend/handlers/profileHandlers.js)
- Her achievement için 2 ayrı query (INSERT + UPDATE)
- 10 achievement = 20 query yerine 2 query ile yapılabilir

**Önerilen Çözüm:**
```javascript
// CTE kullanarak tek query'de tüm achievement'ları kontrol et
const result = await pool.query(`
  WITH user_stats AS (
    SELECT id, points, wins, games_played
    FROM users WHERE id = $1
  ),
  eligible AS (
    SELECT a.id, a.points_reward
    FROM achievements a, user_stats u
    WHERE (
      (a.condition_type = 'points' AND u.points >= a.condition_value) OR
      (a.condition_type = 'wins' AND u.wins >= a.condition_value) OR
      (a.condition_type = 'games_played' AND u.games_played >= a.condition_value)
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_achievements ua 
      WHERE ua.user_id = u.id AND ua.achievement_id = a.id
    )
  )
  INSERT INTO user_achievements (user_id, achievement_id)
  SELECT $1, id FROM eligible
  ON CONFLICT DO NOTHING
  RETURNING (SELECT SUM(points_reward) FROM eligible)
`, [userId]);
```

**Tahmini Süre:** 3 saat (test dahil)  
**Etki:** 10x performans artışı

---

### 3. Frontend Polling'in Socket.IO Push'a Dönüştürülmesi
**Durum:** Hala 4 saniyelik polling aktif

**Sorun:** [`hooks/useGames.ts:512-529`](hooks/useGames.ts)
- Her 4 saniyede bir REST API çağrısı
- 100 kullanıcı = 1,500 request/dakika

**Önerilen Çözüm:**
```typescript
// PRIMARY: Socket.IO event listener
useEffect(() => {
  const socket = socketService.getSocket();
  
  const handleLobbyUpdated = () => {
    void fetchGames({ silent: true });
    void checkActiveGame({ preserveUntilConfirmedEmpty: true });
  };
  
  socket.on('lobby_updated', handleLobbyUpdated);
  
  // FALLBACK: 15 saniye polling (güvenlik ağı)
  const fallbackInterval = setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    void fetchGames({ silent: true });
  }, 15000);
  
  return () => {
    socket.off('lobby_updated', handleLobbyUpdated);
    clearInterval(fallbackInterval);
  };
}, []);
```

**Backend değişikliği:**
```javascript
// backend/handlers/gameHandlers.js
const emitLobbyUpdate = (tableCode) => {
  io.emit('lobby_updated', { tableCode, timestamp: Date.now() });
};

// Her game create/join/delete sonrası çağır
await lobbyCacheService.onGameCreated({ tableCode, cafeId });
emitLobbyUpdate(tableCode); // EKLE
```

**Tahmini Süre:** 6 saat  
**Etki:** 75% API yükü azalması

---

### 4. Production Secrets Rotation
**Durum:** CRITICAL - Secrets git history'de commit edilmiş

**Yapılacaklar:**
1. Tüm production secret'ları rotate et (JWT_SECRET, DATABASE_URL, REDIS_URL)
2. Git history'den `.env` dosyasını temizle
3. `.gitignore`'da `.env` olduğunu doğrula

**Komutlar:**
```bash
# 1. Secret rotation
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Yeni JWT_SECRET'ı .env'ye ekle

# 2. Git history temizleme
pip install git-filter-repo
git filter-repo --invert-paths --path .env

# 3. Force push (DİKKAT: Takımla koordine et!)
git push origin --force --all

# 4. Doğrulama
git log --all --full-history -- .env  # Boş sonuç dönmeli
```

**Tahmini Süre:** 2 saat  
**Etki:** Critical güvenlik açığı kapatılır

---

## 🟠 Yüksek Öncelikli Görevler (P1)

### 5. Database Migration Sistemi Tam Kullanımı
**Durum:** Migration dosyaları var ama `server.js`'te hala manuel schema var

**Sorun:** [`backend/server.js`](backend/server.js) içinde `initDb()` fonksiyonu schema'yı manuel oluşturuyor

**Yapılacaklar:**
1. Mevcut `initDb()` mantığını migration'a taşı
2. `npm run migrate:up` her deployment'ta otomatik çalışsın
3. Performance index'leri migration olarak ekle

**Tahmini Süre:** 4 saat  
**Etki:** Güvenli schema değişikliği, rollback desteği

---

### 6. gameHandlers.js Dosyasının Parçalanması
**Durum:** 2231 satırlık monolitik dosya

**Hedef Yapı:**
```
backend/handlers/game/
├── index.js              (200 satır — routing)
├── createGameHandler.js  (150 satır)
├── joinGameHandler.js    (200 satır)
├── moveGameHandler.js    (300 satır)
├── finishGameHandler.js  (180 satır)
├── resignHandler.js      (100 satır)
├── drawOfferHandler.js   (120 satır)
└── deleteHandler.js      (80 satır)
```

**Tahmini Süre:** 8 saat  
**Etki:** Daha kolay bakım, daha iyi test edilebilirlik

---

### 7. JWT Claims'in Minimizasyonu
**Durum:** JWT'de gereksiz veriler var

**Sorun:** [`backend/controllers/authController.js:175-184`](backend/controllers/authController.js)
```javascript
// Mevcut: username, email, cafeId gereksiz
const token = jwt.sign({
  userId: user.id,
  username: user.username,  // GEREKSIZ
  email: user.email,        // GEREKSIZ
  role: user.role,
  cafeId: user.cafe_id,     // GEREKSIZ
  jti: crypto.randomUUID()
}, ...);
```

**Önerilen:**
```javascript
const token = jwt.sign({
  userId: user.id,
  role: user.role,
  jti: crypto.randomUUID()
}, ...);
```

**Not:** `backend/middleware/auth.js` zaten user'ı DB'den fresh çekiyor, JWT'deki data gereksiz.

**Tahmini Süre:** 2 saat  
**Etki:** Küçük token, daha az güvenlik riski

---

### 8. Social Games Multiplayer Implementation
**Durum:** MonopolySocial, UnoSocial, Okey101Social hotseat mode'da çalışıyor

**Sorun:** [`docs/SOCIAL_GAMES_MULTIPLAYER_SPEC.md`](docs/SOCIAL_GAMES_MULTIPLAYER_SPEC.md)
- PvP mode yalnızca aynı cihazda çalışıyor
- Gerçek multiplayer için Socket.IO entegrasyonu gerekli

**Kapsam:**
1. MonopolySocial Socket.IO entegrasyonu (öncelik)
2. UnoSocial Socket.IO entegrasyonu
3. Okey101Social Socket.IO entegrasyonu

**Tahmini Süre:** 30-40 saat  
**Etki:** Kullanıcı deneyimi büyük iyileşme, gerçek multiplayer

---

### 9. CI/CD Pipeline Kurulumu
**Durum:** GitHub Actions workflow eksik

**Yapılacaklar:**
1. `.github/workflows/ci.yml` oluştur
2. Her PR'da otomatik test çalıştır
3. Production deployment otomasyonu

**Örnek workflow:**
```yaml
name: CI
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
      redis:
        image: redis:alpine
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run migrate:up
      - run: npm run test:ci
      - run: npm run test:e2e
      - run: npm run build
```

**Tahmini Süre:** 4 saat  
**Etki:** Otomatik kalite kontrolü, daha az bug

---

## 🟡 Orta Öncelikli Görevler (P2)

### 10. Component Reorganization
**Durum:** Flat component dizini, 30+ component

**Hedef yapı:**
```
components/
├── auth/           (AuthModal, ResetPasswordPage)
├── game/           (TankBattle, RetroChess, vb.)
├── dashboard/      (Dashboard splits)
├── admin/          (AdminDashboard, modals)
├── cafe/           (CafeSelection, CafeDashboard)
└── shared/         (Navbar, Footer, ErrorBoundary)
```

**Tahmini Süre:** 6 saat  
**Etki:** Daha iyi kod organizasyonu

---

### 11. URL Normalization Utility Extraction
**Durum:** [`lib/api.ts`](lib/api.ts) ve [`lib/socket.ts`](lib/socket.ts) arasında duplikasyon

**Çözüm:** `lib/urlUtils.ts` oluştur, her iki dosya import etsin

**Tahmini Süre:** 1 saat  
**Etki:** 2KB bundle azalması, daha az bakım

---

### 12. httpOnly Cookie Migration (Phase 2)
**Durum:** Phase 1 (blacklist) tamamlanmış, Phase 2 bekliyor

**Kapsam:**
1. Backend: httpOnly cookie ayarla
2. Frontend: localStorage token handling kaldır
3. CSRF protection ekle

**Risk:** Yüksek - Coordinated deployment gerekli

**Tahmini Süre:** 12 saat  
**Etki:** XSS attack surface eliminasyonu

---

### 13. Bundle Optimization
**Durum:** Kaboom, chess.js, framer-motion ağır paketler

**Yapılacaklar:**
1. `rollup-plugin-visualizer` ile bundle analizi
2. Lazy loading stratejisi optimize et
3. Chunk splitting iyileştir

**Tahmini Süre:** 4 saat  
**Etki:** Daha hızlı initial load

---

### 14. PWA Service Worker Activation
**Durum:** Vite 7 uyumsuzluğu nedeniyle devre dışı

**Yapılacaklar:**
1. `vite-plugin-pwa` 0.22.0+ ile Vite 7 uyumluluğu test et
2. Service worker aktifleştir
3. Offline fallback test et

**Tahmini Süre:** 3 saat  
**Etki:** Offline deneyim, PWA özellikleri

---

## 📅 Sprint Planı

### Sprint 1 (Hafta 1-2): Kritik Performans ve Güvenlik — P0
**Hedef:** Kritik güvenlik açıkları kapatılsın, performans bottleneck'leri çözülsün

| # | Task | Süre | Öncelik |
|---|------|------|---------|
| 1 | Production secrets rotation | 2h | CRITICAL |
| 2 | SELECT * anti-pattern düzeltme | 2h | CRITICAL |
| 3 | N+1 achievement check düzeltme | 3h | HIGH |
| 4 | Frontend polling → Socket.IO push | 6h | HIGH |

**Toplam:** ~13 saat

**Başarı Kriterleri:**
- [ ] Tüm secrets rotate edildi ve git history temizlendi
- [ ] `SELECT *` kullanımı kalmadı
- [ ] Achievement check tek query'de çalışıyor
- [ ] Polling 15s'ye düştü, Socket.IO primary oldu

---

### Sprint 2 (Hafta 3-4): Kod Kalitesi ve Refactoring — P1
**Hedef:** Monolitik dosyalar parçalansın, migration sistemi tam kullanılsın

| # | Task | Süre | Öncelik |
|---|------|------|---------|
| 5 | Database migration tam entegrasyonu | 4h | HIGH |
| 6 | gameHandlers.js parçalama | 8h | HIGH |
| 7 | JWT claims minimizasyonu | 2h | MEDIUM |
| 8 | CI/CD pipeline kurulumu | 4h | HIGH |

**Toplam:** ~18 saat

**Başarı Kriterleri:**
- [ ] Migration sistemi production'da kullanılıyor
- [ ] gameHandlers.js < 300 satır
- [ ] JWT token 30% küçüldü
- [ ] GitHub Actions her PR'da test çalıştırıyor

---

### Sprint 3 (Hafta 5-6): UX İyileştirmeleri — P1/P2
**Hedef:** Social games multiplayer, frontend organizasyon

| # | Task | Süre | Öncelik |
|---|------|------|---------|
| 9 | MonopolySocial multiplayer | 10h | HIGH |
| 10 | Component reorganization | 6h | MEDIUM |
| 11 | URL utils extraction | 1h | MEDIUM |
| 12 | Bundle optimization | 4h | MEDIUM |

**Toplam:** ~21 saat

**Başarı Kriterleri:**
- [ ] MonopolySocial gerçek multiplayer çalışıyor
- [ ] Component'ler domain bazlı organize edildi
- [ ] Bundle size 10% azaldı

---

### Sprint 4 (Hafta 7-8): Long-term İyileştirmeler — P2
**Hedef:** httpOnly cookies, PWA, UnoSocial/Okey101Social

| # | Task | Süre | Öncelik |
|---|------|------|---------|
| 13 | httpOnly cookie migration | 12h | MEDIUM |
| 14 | PWA service worker activation | 3h | MEDIUM |
| 15 | UnoSocial multiplayer | 8h | MEDIUM |
| 16 | Okey101Social multiplayer | 8h | MEDIUM |

**Toplam:** ~31 saat

**Başarı Kriterleri:**
- [ ] JWT httpOnly cookie'lerde
- [ ] PWA offline çalışıyor
- [ ] Tüm social games gerçek multiplayer

---

## 🎯 Toplam Effort Tahmini

| Sprint | P0/P1 Görevler | P2 Görevler | Toplam |
|--------|----------------|-------------|--------|
| 1 | 13h | 0h | 13h |
| 2 | 18h | 0h | 18h |
| 3 | 10h | 11h | 21h |
| 4 | 0h | 31h | 31h |
| **TOPLAM** | **41h** | **42h** | **83h** |

---

## 📋 Kalan Görevler Checklist

### Kritik (P0) — Hemen Yapılmalı
- [ ] Production secrets rotation ve git history cleaning
- [ ] Kalan SELECT * örneklerini düzelt
- [ ] Achievement check N+1 pattern düzelt
- [ ] Frontend polling → Socket.IO push

### Yüksek Öncelik (P1) — 1-2 Sprint
- [ ] Migration sistemi tam kullanımı
- [ ] gameHandlers.js refactoring
- [ ] JWT claims minimizasyonu
- [ ] CI/CD pipeline
- [ ] MonopolySocial multiplayer

### Orta Öncelik (P2) — 3-4 Sprint
- [ ] Component reorganization
- [ ] URL utils extraction
- [ ] httpOnly cookie migration
- [ ] Bundle optimization
- [ ] PWA service worker
- [ ] UnoSocial multiplayer
- [ ] Okey101Social multiplayer

---

## 🔍 Monitoring ve Validation

### Her Sprint Sonunda Çalıştırılacak Testler

```bash
# Backend tests
npm run test

# Frontend tests
npm run test:ci

# E2E tests
npm run test:e2e

# Build check
npm run build

# Migration status
npm run migrate:status

# Security scan
npm audit

# Bundle analysis
npm run build && du -sh dist/
```

### Performance Metrikleri

| Metrik | Baseline | Hedef | Ölçüm |
|--------|----------|-------|-------|
| API Requests/min | 1,500 | 375 | Server logs |
| DB Queries/sec | 50 | 20 | pg_stat_statements |
| Cache Hit Rate | 30% | 90% | Redis INFO |
| p95 API Latency | 250ms | <100ms | Load test |
| Bundle Size | 1.2MB | 1.1MB | Build output |

---

## 📚 Referans Dokümanlar

| Doküman | Amaç |
|---------|------|
| [`AGENTS.md`](AGENTS.md) | Must-follow constraints, repo conventions |
| [`OPTIMIZATIONS.md`](OPTIMIZATIONS.md) | Performance audit, quick wins |
| [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) | Security vulnerabilities, fixes |
| [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md) | Game state machine, lobby cache |
| [`plans/production-ready-action-plan.md`](plans/production-ready-action-plan.md) | Sprint planning, manual steps |
| [`plans/cafeduo-expert-review.md`](plans/cafeduo-expert-review.md) | Comprehensive review, architecture |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Production deployment guide |

---

## 🎁 Bonus İyileştirmeler (Sonra)

- Backend TypeScript migration
- Refresh token rotation
- Socket.IO Redis adapter (multi-instance scaling)
- Sentry error tracking
- Database read replica support
- GraphQL API layer
- Advanced caching strategies (CDN, service worker)

---

## ✅ Doğrulama

Bu plan oluşturulurken:
- ✅ Tüm [`docs/`](docs/) markdown dosyaları analiz edildi
- ✅ [`AGENTS.md`](AGENTS.md), [`OPTIMIZATIONS.md`](OPTIMIZATIONS.md) incelendi
- ✅ [`plans/`](plans/) altındaki planlar okundu
- ✅ Mevcut kod ile cross-reference yapıldı
- ✅ Tamamlanmış iyileştirmeler işaretlendi
- ✅ Kalan görevler önceliklendirildi

---

**Son Güncelleme:** 2026-02-27  
**Sonraki Review:** Her sprint sonunda güncellenecek
