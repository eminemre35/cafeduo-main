# CafeDuo Teknik ve Sistem Mimarisi

## 1. Genel Sistem Özeti
CafeDuo, özellikle Pamukkale Üniversitesi kampüsleri için tasarlanmış **oyunlaştırılmış bir sadakat (loyalty) platformudur**. Öğrencilerin kampüs kafelerinde check-in yapmalarını, diğer öğrencilerle çok oyunculu (multiplayer) oyunlar oynamalarını, puan kazanmalarını ve bu puanlarla ödül almalarını sağlar.

Sistem, ayrık (decoupled) bir backend API'si ile haberleşen bir **Tek Sayfalı Uygulama (SPA)** olarak inşa edilmiştir. Gerçek zamanlı özellikler (multiplayer oyunlar) **WebSocket (Socket.IO)** teknolojisi ile desteklenmektedir.

### Temel Değer Önermesi
- **Kullanıcılar**: Yemek beklerken oyun oynar, sosyalleşir ve ödül kazanır.
- **Kafeler**: Oyunlaştırma yoluyla müşteri sadakatini ve etkileşimini artırır.

---

## 2. Teknoloji Yığını (Stack)

### Frontend (İstemci Tarafı)
- **Framework**: React 18 + TypeScript
- **Derleme Aracı**: Vite 7 (Yüksek performanslı bundler)
- **Stil**: TailwindCSS 4 (Utility-first CSS) + Lucide React (İkonlar)
- **Yönlendirme**: React Router DOM 7
- **Durum Yönetimi**: React Hooks (`useState`, `useEffect`, `useContext`)
- **Gerçek Zamanlı İletişim**: `socket.io-client`
- **HTTP İstemcisi**: Özelleştirilmiş `api` aracı (Fetch API sarıcısı)

### Backend (Sunucu Tarafı)
- **Çalışma Zamanı**: Node.js
- **Framework**: Express.js
- **Veritabanı Arayüzü**: `pg` (node-postgres) - Doğrudan SQL sorguları için
- **Kimlik Doğrulama**: JWT (JSON Web Tokens) + Google OAuth (via `@react-oauth/google`)
- **Gerçek Zamanlı Motor**: `socket.io` (Express sunucusu ile entegre)
- **Güvenlik**: `helmet`, `cors`, `express-rate-limit`, `bcrypt` (şifreleme)
- **Loglama**: `winston`

### Veritabanı
- **Motor**: PostgreSQL
- **Barındırma**: Harici Bulut (Env değişkenlerine göre Render/Railway vb.)
- **Yönetim**: Manuel SQL migrasyonları (`schema.sql`)

---

## 3. Sistem Mimarisi Şeması

```mermaid
graph TD
    Client[İstemci (Tarayıcı/Mobil)]
    LB[Yük Dengeleyici / Reverse Proxy]
    Server[Node.js + Express Sunucusu]
    DB[(PostgreSQL Veritabanı)]
    Socket[Socket.IO Motoru]

    Client -- HTTP/REST API --> LB
    Client -- WebSocket (Anlık Olaylar) --> LB
    LB --> Server
    
    subgraph Backend_Servisleri
        Server -- Sorgu/İşlem --> DB
        Server -- Doğrulama --> GoogleOAuth[Google OAuth]
        Server <--> Socket
    end

    Socket -- Oyun Hamlelerini Yayınla --> Client
```

---

## 4. Veritabanı Şeması

Veritabanı ilişkisel ve normalize edilmiştir. Önemli tablolar:

### `users` (Kullanıcılar)
- **Amaç**: Kullanıcı kimliği, giriş bilgileri ve istatistikleri tutar.
- **Önemli Sütunlar**: `id`, `username`, `email` (Benzersiz), `password_hash`, `points` (puan), `wins` (galibiyet), `role` (user/admin/cafe_admin), `cafe_id`, `table_number`.

### `cafes` (Kafeler)
- **Amaç**: Uygulamanın kullanıldığı fiziksel mekanlar.
- **Önemli Sütunlar**: `id`, `name` (Benzersiz), `address`, `total_tables`, `pin` (doğrulama için).

### `games` (Oyunlar)
- **Amaç**: Aktif ve geçmiş oyun oturumlarını (lobileri) takip eder.
- **Önemli Sütunlar**: `id`, `host_name`, `game_type` (örn: 'Taş Kağıt Makas'), `status` (waiting/active), `table_code`.

### `user_items` (Envanter)
- **Amaç**: Alınan ödülleri ve kullanım durumlarını kaydeder.
- **Önemli Sütunlar**: `id`, `user_id`, `item_title`, `code` (Benzersiz), `is_used` (kullanıldı mı), `redeemed_at`.

---

## 5. Temel İş Akışları & Mantık

### 5.1. Kimlik Doğrulama & Oturum
1. **Giriş**: Kullanıcı bilgilerini girer -> POST `/api/auth/login`.
2. **Token**: Sunucu bir **JWT** döner. İstemci bunu `localStorage`'a kaydeder.
3. **Oturum Yenileme**: Uygulama açıldığında, `useEffect` yerel depolamadaki token'ı kontrol eder.
4. **Google Girişi**: OAuth akışı ile e-posta doğrulanır ve hesap oluşturulur.

### 5.2. Kafe Check-in Sistemi
1. **Kullanıcı İşlemi**: Listeden bir kafe seçer.
2. **PIN Doğrulama**: Kullanıcı 4 haneli PIN kodunu girer (kafe personeli sağlar).
3. **Kontrol**: Sunucu PIN'i `cafes` tablosundan doğrular.
4. **Sonuç**: Başarılıysa kullanıcıya bir `table_number` atanır ve oyun kurabilir/katılabilir.

### 5.3. Gerçek Zamanlı Multiplayer (Socket.IO)
*Örnek: Taş Kağıt Makas*
1. **Bağlantı**: İstemci `ws://api-url` adresine bağlanır.
2. **Katılma**: İstemci `gameId` ile `rps_join` olayını gönderir.
3. **Hamle**: İstemci `rps_move` ile hamlesini gönderir (rakibe gizli).
4. **Senkronizasyon**:
   - Sunucu hamleleri bellekte (`rpsGames` Map) saklar.
   - İki oyuncu da hamle yapınca Sunucu `rps_round_result` olayını yayınlar.
5. **Güncelleme**: İstemciler sonucu alır, arayüzü ve animasyonları günceller.

### 5.4. Ödül & Mağaza
1. **Satın Alma**: Kullanıcı al butonuna basar -> POST `/api/shop/buy`.
2. **İşlem**:
   - Sunucu `users.points` >= `reward.cost` kontrolü yapar.
   - Puanı düşer.
   - `user_items` tablosuna kayıt ekler.
3. **Kullanım**: Kullanıcı QR/Kodunu personele gösterir -> Personel (Kafe Admin) doğrular ve `is_used = true` yapar.

---

## 6. Dizin Yapısı

```
cafeduo-main/
├── backend/            # Sunucu tarafı kodları
│   ├── server.js       # Başlangıç noktası, API rotaları, Socket kurulumu
│   ├── db.js           # Veritabanı bağlantı havuzu
│   └── ...
├── components/         # React Bileşenleri (Arayüz)
│   ├── Dashboard.tsx   # Ana lobi
│   ├── RockPaperScissors.tsx # Oyun mantığı
│   └── ...
├── lib/                # Ortak araçlar
│   ├── api.ts          # Axios/Fetch sarıcısı
│   └── socket.ts       # Socket.IO istemcisi
├── scripts/            # Bakım ve yardımcı scriptler
├── public/             # Statik dosyalar
└── types.ts            # TypeScript tip tanımları
```

## 7. Dağıtım (Deployment) Stratejisi

### Frontend
- **Tür**: Statik Site
- **Derleme**: `npm run build` -> `dist/` klasörünü oluşturur.
- **Barındırma**: Nginx, Apache, Vercel veya cPanel dosya yöneticisi üzerinden sunulabilir.

### Backend
- **Tür**: Uzun süre çalışan Node.js Süreci
- **Süreç Yöneticisi**: Geliştirme için `nodemon`, canlı ortam için `pm2`.
- **Ortam**: Linux (Ubuntu) önerilir.
- **Env Değişkenleri**: `.env` dosyası ile yönetilir (Veritabanı bilgileri, API anahtarları).
