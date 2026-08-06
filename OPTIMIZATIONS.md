# OPTIMIZATIONS.md

Bu doküman, CafeDuo backend'inde yapılmış performans optimizasyonlarının
kalıcı kaydıdır. `AGENTS.md`'deki "Must-follow constraints" kuralları bu
bulgulara atıf yapar — kuralı çiğnemeden önce burayı oku.

---

## Finding 1 — `SELECT *` yasak, kolonlar açıkça yazılır

**Sorun:** `SELECT *` ile tüm kolonlar çekilir; satır genişledikçe (ör. `game_state`
JSONB blokları) gereksiz veri taşınır, ağ ve decode maliyeti artar.

**Kural:** Kullanıcıya dönen her sorguda kolonlar açıkça listelenir.

**Doğrulama:** Üretim kodunda `SELECT *` bulunmaz (test bunu zorlar:
`storeController.test.js` → `expect(queryStr).not.toContain('SELECT *')`).

**İyi örnek** (`backend/controllers/authController.js`):

```sql
SELECT id, email, username FROM users WHERE LOWER(TRIM(email)) = ANY($1::text[]) LIMIT 1
```

---

## Finding 2 — User-facing sorgularda `LIMIT` zorunlu

**Sorun:** Sınırsız listeler (leaderboard, inventory, history) zamanla büyür;
sayfalar yavaşlar, bellek şişer.

**Kural:** Liste sorguları varsayılan `LIMIT 100`, leaderboard `LIMIT 50`.

**İyi örnek** (`backend/controllers/cafeController.js`):

```sql
SELECT ... FROM cafes WHERE is_active = true ORDER BY name LIMIT 100
```

---

## Finding 3 — N+1 sorgu deseni yasak

**Sorun:** Döngü içinde sorgu çalıştırmak (N kullanıcı için N ayrı sorgu) yerine
tek sorguda birleştirmek gerekir; aksi halde veritabanı round-trip sayısı N+1
olur ve gecikme doğrusal büyür.

**Kural:** Döngü+query yerine CTE veya JOIN kullanılır.

**İyi örnek** (`backend/handlers/adminHandlers.js`):

```sql
SELECT u.id, u.username, c.name AS cafe_name
FROM users u
LEFT JOIN cafes c ON u.cafe_id = c.id
WHERE u.role = 'admin'
```

**Ayrıca:** `backend/handlers/tournamentHandlers.js` ve
`backend/jobs/tournamentJobs.js`'te katılımcı puanları tek `JOIN` ile toplanır.

---

## Finding 4 — Cache invalidation `SCAN` ile yapılır

**Sorun:** `clearCache()` fonksiyonları pattern silerken `KEYS` kullanırsa Redis
tek thread'de bloke olur (O(N) ve büyük key uzayında servisi durdurur).

**Kural:** Invalidation her zaman imleçli `SCAN` ile iterate edilir.

**İyi örnek** (`backend/middleware/cache.js`):

```js
const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
```

Aynı desen: `backend/middleware/rateLimit.js`,
`backend/services/lobbyCacheService.js`.

---

## Finding 5 — `redis.keys(pattern)` asla kullanılmaz

**Sorun:** `KEYS` komutu tüm key uzayını tarar ve Redis'i bloke eder; üretimde
saniyeler sürebilir.

**Kural:** `redis.scan()` imleçle ilerlenir, sonuçlar toplanır.

**Doğrulama:** Üretim kodunda `redis.keys(` çağrısı yoktur; tüm taramalar
`scan(cursor, 'MATCH', pattern, 'COUNT', ...)` desenindedir.

---

## Özet tablo

| Finding | Kural                           | Kodda nerede                                         |
| ------- | ------------------------------- | ---------------------------------------------------- |
| 1       | `SELECT *` yasak                | authController, cafeController, commerceHandlers     |
| 2       | Liste sorgularında `LIMIT`      | authController (LIMIT 1), cafeController (LIMIT 100) |
| 3       | N+1 yasak → JOIN/CTE            | adminHandlers, tournamentHandlers, tournamentJobs    |
| 4       | Cache invalidation SCAN ile     | cache.js, rateLimit.js, lobbyCacheService.js         |
| 5       | `redis.keys()` yasak → `scan()` | cache.js, rateLimit.js, lobbyCacheService.js         |
