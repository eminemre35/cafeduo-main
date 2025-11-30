# CafeDuo Proje Bağlamı ve Mimarisi

## 1. Mimari Genel Bakış (Ayrık Yapı)

Proje, Önyüz (Frontend) ve Arka Uç (Backend) kısımlarının ayrı ayrı barındırıldığı ve API aracılığıyla haberleştiği ayrık (decoupled) bir mimariye sahiptir.

- **Önyüz (Frontend - React/Vite)**:
  - **Barındırma**: cPanel (Statik Dosyalar `public_html` içinde)
  - **Derleme (Build) Süreci**: Yerel `npm run build` -> `dist` klasörünü ZIP yap -> cPanel'e yükle.
  - **Ortam**:
    - **Geliştirme (Dev)**: Vite proxy kullanır (`/api` -> `localhost:3001`).
    - **Canlı (Production)**: Doğrudan Render API'sine istek atar (`https://cafeduo-api.onrender.com/api`).

- **Arka Uç (Backend - Node.js/Express)**:
  - **Barındırma**: Render.com (Web Service)
  - **Deployment**: GitHub'a Push yapıldığında otomatik güncellenir.
  - **Veritabanı**: PostgreSQL (Supabase üzerinde, Transaction Pooler Port 6543).
  - **Ortam Değişkenleri**:
    - `DATABASE_URL`: Supabase bağlantı adresi.
    - `GMAIL_USER` / `GMAIL_PASS`: E-posta servisleri için.

- **Veritabanı (PostgreSQL)**:
  - **Sağlayıcı**: Supabase
  - **Bağlantı**: Transaction Pooler üzerinden (IPv4 uyumlu).

## 2. Önemli Yapılandırma Dosyaları

### Önyüz (Frontend)
- **`lib/api.ts`**: Merkezi API istemcisi. Geliştirme ve Canlı ortam arasındaki URL geçişini yönetir.
  ```typescript
  const API_URL = import.meta.env.PROD
    ? 'https://cafeduo-api.onrender.com/api'
    : '/api';
  ```
- **`vite.config.ts`**: Vite yapılandırması, yerel geliştirme için proxy ayarlarını içerir.

### Arka Uç (Backend)
- **`backend/server.js`**: Ana uygulama giriş noktası. API rotalarını ve veritabanı başlatma işlemlerini yönetir.
- **`backend/db.js`**: `pg` havuzu (pool) kullanarak veritabanı bağlantı mantığını içerir.

## 3. Canlıya Alma (Deployment) Rehberi

### Backend Deployment
1. Değişiklikleri GitHub'a gönderin:
   ```bash
   git add .
   git commit -m "Backend güncellemesi"
   git push origin main
   ```
2. Render.com değişikliği algılayıp otomatik olarak yeniden deploy edecektir.

### Frontend Deployment
1. Projeyi yerel bilgisayarınızda derleyin (build alın):
   ```bash
   npm run build
   ```
2. Oluşan `dist` klasörünün içeriğini bir ZIP dosyası haline getirin.
3. ZIP dosyasını cPanel hostinginizdeki `public_html` klasörüne yükleyin.
4. ZIP dosyasını orada dışarı aktarın (Extract), mevcut dosyaların üzerine yazın.

## 4. Sorun Giderme

- **CORS Hataları**: Backend'deki `cors` middleware ayarlarının cPanel alan adınızdan gelen isteklere izin verdiğinden emin olun.
- **Veritabanı Bağlantısı**: Eğer Render bağlanamazsa, `DATABASE_URL` ayarını ve Supabase Transaction Pooler ayarlarını kontrol edin.
- **Frontend API Hataları**: Tarayıcı geliştirici araçlarındaki (F12) Network sekmesini kontrol edin. İsteklerin `localhost` veya cPanel'deki olmayan bir yola değil, `https://cafeduo-api.onrender.com/api/...` adresine gittiğinden emin olun.
