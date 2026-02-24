# CafeDuo Production-Ready Aksiyon Planı

**Tarih:** 24 Şubat 2026  
**Hedef:** Projeyi production seviyesine taşımak  
**Süre:** 3-4 sprint (6-8 hafta)

---

## 🎯 Öncelik Matrisi

### Sprint 1 (Hafta 1-2): Kritik Güvenlik ve Stabilite — P0

#### 1. Socket.IO Auth Middleware ✅ En Kritik
**Sorun:** Herhangi bir istemci game room'lara auth olmadan erişebilir.

**Çözüm:**
```typescript
// lib/socket.ts - Client
this.socket = io(SOCKET_URL, {
    auth: {
        token: localStorage.getItem('token')
    },
    withCredentials: true,
});

// backend/server.js - Server
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
        const decoded = jwt.verify(token, ***REMOVED***);
        socket.userId = decoded.id;
        socket.username = decoded.username;
        next();
    } catch (err) {
        next(new Error('Invalid token'));
    }
});
```

**Manuel İşlem Yok** - Kod değişikliği

---

#### 2. App.tsx / AuthContext Çift State Birleştirme
**Sorun:** İki paralel auth state yönetimi, çift token verify çağrısı.

**Çözüm:**
- `App.tsx` içindeki auth state'i tamamen kaldır
- `AuthContext` kullanımını tam aktif hale getir
- Session restore'u yalnızca `AuthContext.tsx`'te yap

**Manuel İşlem Yok** - Refactoring

---

#### 3. DB Migration Sistemi Kurulumu
**Sorun:** Schema değişiklikleri güvenli yönetilemiyor.

**Çözüm:** `node-pg-migrate` veya `knex` kullan

```bash
# Package ekle
npm install --save-dev node-pg-migrate

# Script ekle (package.json)
"migrate:create": "node-pg-migrate create",
"migrate:up": "node-pg-migrate up",
"migrate:down": "node-pg-migrate down"
```

**Migration 001:** Mevcut `schema.sql`'i migration'a dönüştür  
**Migration 002:** Performance indekslerini ekle

**Manuel İşlem Yok** - Kurulum ve script

---

### Sprint 2 (Hafta 3-4): Backend Refactoring — P0/P1

#### 4. gameHandlers.js Parçalama (2231 satır → ~200 satır/modül)

**Hedef Yapı:**
```
backend/handlers/
├── gameHandlers.js           (200 satır — routing logic)
├── gameCreateHandler.js      (150 satır)
├── gameJoinHandler.js        (200 satır)
├── gameFinishHandler.js      (180 satır)
├── gameResignHandler.js      (100 satır)
├── gameDrawOfferHandler.js   (120 satır)
└── gameDeleteHandler.js      (80 satır)
```

**Manuel İşlem Yok** - Code refactoring

---

#### 5. DB Indeksleri Ekleme (Migration 002)

```sql
-- Migration: 002_add_performance_indexes.sql

-- Lobby query optimization
CREATE INDEX idx_games_status_table_created 
ON games(status, table_code, created_at DESC) 
WHERE status = 'waiting';

-- Active game lookup
CREATE INDEX idx_games_host_active 
ON games(host_name, status) 
WHERE status IN ('waiting', 'active');

CREATE INDEX idx_games_guest_active 
ON games(guest_name, status) 
WHERE status IN ('waiting', 'active');

-- User stats
CREATE INDEX idx_users_points_desc 
ON users(points DESC);

CREATE INDEX idx_users_cafe_active 
ON users(cafe_id) 
WHERE cafe_id IS NOT NULL;
```

**Manuel İşlem Yok** - Migration script

---

#### 6. Redis Cache ile Lobby Optimizasyonu

**Stratej

i:**
- Lobby listesi 2-3 saniye TTL ile Redis'e cache'lenir
- Socket.IO `lobby_updated` event'i cache invalidation trigger'ı olur
- `/api/games` endpoint cache-aware olur

```javascript
// backend/routes/gameRoutes.js
router.get('/games', authenticateToken, cache({ ttl: 3 }), gameHandlers.getGames);

// Cache invalidation on game create/join/delete
emitLobbyUpdate(); // → clears cache + socket emit
```

**Manuel İşlem Yok** - Backend kod değişikliği

---

### Sprint 3 (Hafta 5-6): Frontend Kalite ve UX — P1

#### 7. Frontend Responsive Sorunları Düzeltme

**Tespit Edilen Sorunlar:**
- `Dashboard.tsx` (594 satır) çok büyük
- Mobilde text truncation sorunları (`truncate` 15+ yerde)
- `min-width`, `max-w-`, `overflow` kullanımı tutarsız
- 360px genişlikte bazı component'ler taşıyor

**Öncelikli Düzeltmeler:**

1. **Dashboard Component Split:**
```
components/dashboard/
├── Dashboard.tsx              (sadece layout orchestration)
├── DashboardHeader.tsx
├── GameTab.tsx
├── LeaderboardTab.tsx
├── AchievementsTab.tsx
└── RewardTab.tsx
```

2. **Responsive Breakpoint Standardizasyonu:**
```css
/* Tailwind config standardizasyonu */
sm: 640px   (mobil landscape)
md: 768px   (tablet)
lg: 1024px  (desktop)
xl: 1280px  (geniş desktop)
```

3. **Text Truncation Pattern:**
```tsx
// Kötü: truncate tek başına
<span className="truncate">{text}</span>

// İyi: min-w-0 ile container belirt
<div className="min-w-0 flex-1">
  <span className="truncate">{text}</span>
</div>
```

4. **Mobil Test Matrix:**
- iPhone SE (375px)
- iPhone 12/13 (390px)
- Galaxy S20 (360px)
- iPad Mini (768px)

**Manuel İşlem Yok** - Code refactoring + test

---

#### 8. Component Dizin Reorganizasyonu

```
components/
├── auth/
│   ├── AuthModal.tsx
│   └── ResetPasswordPage.tsx
├── game/
│   ├── ArenaBattle.tsx
│   ├── TankBattle.tsx
│   ├── RetroChess.tsx
│   ├── ReflexRush.tsx
│   ├── KnowledgeQuiz.tsx
│   ├── MemoryDuel.tsx
│   ├── OddEvenSprint.tsx
│   ├── UnoSocial.tsx
│   ├── Okey101Social.tsx
│   └── MonopolySocial.tsx
├── dashboard/
│   ├── StatusBar.tsx
│   ├── GameSection.tsx
│   ├── RewardSection.tsx
│   └── [new splits]
├── admin/
│   ├── AdminDashboard.tsx
│   ├── AddUserModal.tsx
│   ├── AddCafeModal.tsx
│   └── AssignCafeAdminModal.tsx
├── cafe/
│   ├── CafeSelection.tsx
│   ├── CafeDashboard.tsx
│   └── cafe-admin/
└── shared/
    ├── Navbar.tsx
    ├── Footer.tsx
    ├── Hero.tsx
    ├── ErrorBoundary.tsx
    └── ...
```

**Manuel İşlem Yok** - File reorganization

---

### Sprint 4 (Hafta 7-8): DevOps ve Monitoring — P1

#### 9. CI/CD Pipeline (GitHub Actions)

**Dosya:** `.github/workflows/ci.yml`

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
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npm run migrate:up
        env:
          ***REMOVED***: postgres://postgres:postgres@localhost:5432/cafeduo_test
      
      - name: Run unit tests
        run: npm run test:ci
      
      - name: Run E2E tests
        run: npx playwright install --with-deps && npm run test:e2e
      
      - name: Build frontend
        run: npm run build
```

**Manuel İşlem:** GitHub'a push edilince otomatik çalışır

---

#### 10. Server-Side Session Invalidation (Redis Token Blacklist)

```javascript
// backend/middleware/auth.js
const authenticateToken = async (req, res, next) => {
    // ... mevcut kod ...
    
    // Token blacklist check
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
        return sendAuthError(res, {
            status: 401,
            code: 'TOKEN_REVOKED',
            message: 'Token has been revoked'
        });
    }
    
    // ... devam ...
};

// Logout endpoint
router.post('/auth/logout', authenticateToken, async (req, res) => {
    const token = req.headers.authorization?.slice(7);
    if (token) {
        // Token'ı blacklist'e ekle (TTL = token expiry time)
        const decoded = jwt.decode(token);
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        await redis.setex(`blacklist:${token}`, expiresIn, '1');
    }
    res.json({ success: true });
});
```

**Manuel İşlem Yok** - Backend kod değişikliği

---

## 🔧 Manuel Gerekli Olan İşlemler

### 1. Google OAuth Credentials (Opsiyonel ama Önerilir)

**Nerede:** Google Cloud Console  
**Ne yapacaksınız:**
1. https://console.cloud.google.com/apis/credentials
2. "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: Web application
4. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://cafeduotr.com`
5. Authorized redirect URIs:
   - `http://localhost:3000`
   - `https://cafeduotr.com`

**Çıktı:** `GOOGLE_CLIENT_ID` ve `***REMOVED***`  
**.env'ye ekle:**
```bash
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
***REMOVED***=GOCSPX-xxxxx
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
ENABLE_GOOGLE_AUTH=true
```

---

### 2. reCAPTCHA Keys (Önerilir)

**Nerede:** https://www.google.com/recaptcha/admin/create  
**Ne yapacaksınız:**
1. reCAPTCHA v2 seç ("I'm not a robot" checkbox)
2. Domain ekle:
   - `localhost` (test için)
   - `cafeduotr.com`
3. Submit

**Çıktı:** Site Key ve Secret Key  
**.env'ye ekle:**
```bash
RECAPTCHA_SITE_KEY=6LeXXXXXXXXXXXXXXXXXXXXXXXXXXX
***REMOVED***=6LeXXXXXXXXXXXXXXXXXXXXXXXXXXX
ENABLE_RECAPTCHA=true
```

---

### 3. SMTP Email Servisi (Opsiyonel)

**Önerilen Servis:** SendGrid (ücretsiz 100 email/gün) veya MailGun

**SendGrid Setup:**
1. https://signup.sendgrid.com/
2. "Settings" → "API Keys" → "Create API Key"
3. Full Access veya Mail Send seç

**.env'ye ekle:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM=noreply@cafeduotr.com
ENABLE_EMAIL_VERIFICATION=true
```

---

### 4. Production JWT Secret Generation

**Komut:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Çıktı:** 128 karakterlik random hex string  
**Production .env'ye ekle:**
```bash
***REMOVED***=<üretilen-128-char-string>
```

⚠️ **ÖNEMLİ:** Bu secret'ı asla git'e commit etmeyin!

---

## 🚀 Deployment Checklist

### Production Ortamı İçin (.env.production)

```bash
NODE_ENV=production
PORT=3001

# Database - Render/Railway/Supabase PostgreSQL
***REMOVED***=postgres://user:pass@host:5432/cafeduo
DB_SSL=true

# Redis - Upstash/Redis Cloud
***REMOVED***=redis://default:pass@host:6379

# Secrets (yukarıda oluşturulanlar)
***REMOVED***=<generated-secret>
GOOGLE_CLIENT_ID=<google-credentials>
***REMOVED***=<google-credentials>
***REMOVED***=<recaptcha-secret>
RECAPTCHA_SITE_KEY=<recaptcha-site>

# CORS
CORS_ORIGIN=https://cafeduotr.com,https://www.cafeduotr.com

# Rate Limiting
RATE_LIMIT_STORE=redis
RATE_LIMIT_REDIS_PREFIX=cafeduo:prod:ratelimit

# Logging
LOG_LEVEL=info
REQUEST_LOG_SLOW_MS=1200

# Features
ENABLE_GOOGLE_AUTH=true
ENABLE_RECAPTCHA=true
ENABLE_EMAIL_VERIFICATION=false
```

---

## 📊 Sprint Özet Tablosu

| Sprint | Hafta | P0 | P1 | Manuel İş | Risk |
|--------|-------|----|----|-----------|------|
| 1 | 1-2 | Socket Auth, Auth State, Migration | - | JWT Secret | Yüksek |
| 2 | 3-4 | gameHandlers Parçalama | Indeksler, Redis Cache | - | Orta |
| 3 | 5-6 | - | Frontend Responsive, Component Split | - | Düşük |
| 4 | 7-8 | - | CI/CD, Token Blacklist | Google/reCAPTCHA Keys | Düşük |

---

## ✅ Başarı Kriterleri

### Sprint 1 Sonunda
- [ ] Socket.IO bağlantısı auth ile korunuyor
- [ ] Tek bir auth state yönetimi var (AuthContext)
- [ ] Migration sistemi çalışıyor
- [ ] Production JWT secret güvenli

### Sprint 2 Sonunda
- [ ] `gameHandlers.js` < 300 satır
- [ ] Lobby query P95 < 250ms
- [ ] Redis cache hit rate > %80
- [ ] Tüm testler yeşil

### Sprint 3 Sonunda
- [ ] 360px genişlikte text clipping 0
- [ ] Dashboard component'leri < 200 satır
- [ ] Mobile UI Playwright testleri pass
- [ ] Component dizin yapısı temiz

### Sprint 4 Sonunda
- [ ] GitHub Actions CI pipeline aktif
- [ ] PR'larda otomatik test çalışıyor
- [ ] Token blacklist çalışıyor
- [ ] Production deployment otomatize

---

## 🎁 Bonus İyileştirmeler (Sonra)

- Backend TypeScript geçişi
- PWA service worker aktifleştirme
- Refresh token rotasyonu
- Socket.IO Redis adapter
- Sentry error tracking
- Bundle size optimizasyonu

---

## 🤝 Yardım ve Destek

Her sprint için detaylı implementation guide'lar hazırlanacak. Sorularınız için:
- Expert review raporuna bakın: `plans/cafeduo-expert-review.md`
- Her sprint başında o sprint'e özel detay doküman hazırlanacak
- Implementation sırasında takıldığınız noktalarda sorabilirsiniz
