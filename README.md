<div align="center">

# ☕ CafeDuo

**Üniversite Öğrencileri İçin Oyunlaştırılmış Kafe Sadakat Platformu**

Kafelere gel, arkadaşlarınla oyun oyna, puan kazan, gerçek ödüller al!

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Gerçek%20Zamanlı-010101?logo=socket.io)](https://socket.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/Testler-145%20geçiyor-brightgreen)]()
[![Docker](https://img.shields.io/badge/Docker-Hazır-2496ED?logo=docker)](Dockerfile)
[![License: MIT](https://img.shields.io/badge/Lisans-MIT-blue)](LICENSE)

[Özellikler](#-özellikler) · [Hızlı Başlangıç](#-hızlı-başlangıç) · [Ekran Görüntüleri](#-ekran-görüntüleri) · [Mimari](#️-mimari) · [Katkıda Bulunma](#-katkıda-bulunma)

</div>

---

## 🎯 Problem

Türkiye'de kafeler müşteri bağlılığını artırmakta zorlanıyor. Geleneksel sadakat kartları kaybolur, uygulamalar indirilmez, sosyal etkileşim eksik kalır.

## 💡 Çözüm

**CafeDuo**, üniversite öğrencilerini kafe kültürüyle buluşturan **oyunlaştırılmış** bir platformdur:

1. **Check-in**: Kafeye geldiğinde PIN ile otur
2. **Oyna**: Aynı kafedeki arkadaşlarınla gerçek zamanlı oyunlar oyna
3. **Kazan**: Her galibiyet puan kazandırır
4. **Harca**: Puanlarını bedava kahve, tatlı ve indirimlere dönüştür

---

## ✨ Özellikler

### 🎮 Çok Oyunculu Oyunlar
| Oyun | Açıklama |
|------|----------|
| ✊✋✌️ **Taş Kağıt Makas** | Klasik oyun, gerçek zamanlı eşleşme |
| ⚔️ **Gladyatör Arena** | Sıra tabanlı savaş oyunu |
| 🎯 **Oyun Lobisi** | Anında oluştur veya katıl |
| 🔍 **Canlı Eşleşme** | Aynı kafedeki rakipleri bul |

### 📍 Kafe Check-in Sistemi
- **PIN Doğrulama** — Her masaya özel güvenli kodlar
- **Konum Bazlı** — Sadece geçerli kafe lokasyonlarında çalışır
- **Arkadaş Keşfi** — Aynı kafede kimlerin olduğunu gör
- **Harita Entegrasyonu** — Leaflet ile yakındaki kafeleri bul

### 🏆 Puan & Liderlik Tablosu
- 🎯 Oyun kazanarak puan topla
- 📅 Günlük check-in bonusu
- 🌍 Genel sıralama tablosu
- 🏅 Başarı rozetleri

### 🎁 Ödül Mağazası
- ☕ Puanları bedava içecek, atıştırmalık veya indirimlere dönüştür
- 📦 Envanter sistemi — kazanılan ödülleri yönet
- 📱 QR kodla kasada hızlı kullanım

### 🎨 Modern UI/UX
- 📱 Mobil ve masaüstü uyumlu responsive tasarım
- ✨ Framer Motion ile akıcı mikro-animasyonlar
- 🌙 Arcade tarzı göz alıcı karanlık tema
- 🔔 Toast bildirimleri ile anlık geri bildirim
- 💀 Skeleton loading ile profesyonel yükleme ekranları

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Stil** | Tailwind CSS v4 + Framer Motion |
| **Durum Yönetimi** | React Context + Custom Hooks |
| **Backend** | Node.js + Express.js |
| **Gerçek Zamanlı** | Socket.IO (WebSocket) |
| **Veritabanı** | PostgreSQL 15 |
| **Önbellek** | Redis (ioredis) |
| **Kimlik Doğrulama** | JWT + bcrypt + Google OAuth |
| **Güvenlik** | Helmet + Rate Limiting + reCAPTCHA |
| **E-posta** | Nodemailer |
| **Harita** | Leaflet + React-Leaflet |
| **Test** | Jest + React Testing Library + Playwright E2E |
| **DevOps** | Docker + Docker Compose |

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 18+
- PostgreSQL 15+ (veya Docker kullanın)

### Docker ile (Önerilen)

```bash
# Repoyu klonlayın
git clone https://github.com/eminemre35/cafeduo-main.git
cd cafeduo-main

# .env dosyasını oluşturun
cp .env.example .env

# Docker ile başlatın
docker-compose up -d

# Uygulama hazır:
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

### Manuel Kurulum

```bash
# 1. Bağımlılıkları yükleyin
npm install

# 2. Veritabanını oluşturun
createdb cafeduo
psql cafeduo < schema.sql

# 3. .env dosyasını düzenleyin
cp .env.example .env

# 4. Geliştirme sunucusunu başlatın
npm run dev
```

---

## 📊 Test

```bash
# Unit testler
npm test

# Coverage raporu
npm run test:coverage

# E2E testler (Playwright)
npm run test:e2e

# Tüm testler
npm run test:all

# Canlı ortam smoke testi
npm run smoke:live
```

**Test Durumu:** 145 test geçiyor ✅

---

## 🏗️ Mimari

```
┌──────────────────────────────────────────────────────┐
│                    İstemci (React)                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │ Bileşenler │  │ Socket.IO  │  │ React Router   │  │
│  │ (UI)       │  │ İstemci    │  │ (Navigasyon)   │  │
│  └────────────┘  └────────────┘  └────────────────┘  │
└──────────────────┬───────────────────────────────────┘
                   │ HTTP / WebSocket
                   ▼
┌──────────────────────────────────────────────────────┐
│                   API Sunucusu                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │ Express    │  │ Socket.IO  │  │ JWT + Helmet   │  │
│  │ Routes     │  │ Sunucu     │  │ Güvenlik       │  │
│  └────────────┘  └────────────┘  └────────────────┘  │
└──────────────────┬───────────────────────────────────┘
                   │ SQL
                   ▼
┌──────────────────────────────────────────────────────┐
│          PostgreSQL + Redis                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │ Kullanıcılar│ │  Oyunlar   │  │   Ödüller      │  │
│  └────────────┘  └────────────┘  └────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## 📂 Proje Yapısı

```
cafeduo-main/
├── components/           # React bileşenleri
│   ├── dashboard/        # Ana panel bölümleri
│   ├── ui/               # Yeniden kullanılabilir UI
│   └── ...
├── hooks/                # Custom React hooks
├── contexts/             # React context (Auth, Toast)
├── backend/              # Express.js API
│   ├── server.js         # Ana sunucu
│   └── db.js             # Veritabanı bağlantısı
├── e2e/                  # Playwright E2E testleri
├── schema.sql            # Veritabanı şeması
├── docker-compose.yml    # Docker kurulumu
└── Dockerfile            # Container tanımı
```

---

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! 

1. Repoyu forklayın
2. Feature branch oluşturun (`git checkout -b feature/harika-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: harika özellik eklendi'`)
4. Push edin (`git push origin feature/harika-ozellik`)
5. Pull Request açın

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.

---

<div align="center">

**Üniversite öğrencileri için ☕ ve 🎮 ile yapıldı**

⭐ Projeyi beğendiyseniz yıldız bırakmayı unutmayın!

</div>
