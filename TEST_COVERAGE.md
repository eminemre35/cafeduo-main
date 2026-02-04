# Test Coverage Tracker

> Guncelleme: 2026-02-04
> Komut: `npm run test:coverage -- --runInBand`

## Ozet

- Test suite: `9/9` passing
- Test sayisi: `109/109` passing
- Snapshot: `0`

## Coverage (Guncel)

| Metric | Deger |
|--------|-------|
| Statements | 25.13% |
| Branches | 16.03% |
| Functions | 22.78% |
| Lines | 25.56% |

## Kritik Gozlem

- Test altyapisi stabil ve tum aktif testler geciyor.
- Coverage hedefi (%70) ile mevcut seviye arasinda fark var.
- Ozellikle su dosyalarda coverage `%0`:
  - `components/AdminDashboard.tsx`
  - `components/ArenaBattle.tsx`
  - `components/CafeDashboard.tsx`
  - `components/CafeSelection.tsx`
  - `components/dashboard/GameSection.tsx`
  - `components/dashboard/RewardSection.tsx`
  - `components/dashboard/StatusBar.tsx`
  - `lib/socket.ts`

## Sonraki Adim Onerisi

1. `components/dashboard/*` icin unit test ekle (hizli coverage artisi).
2. `lib/socket.ts` icin mock tabanli test ekle.
3. `AdminDashboard` ve `CafeDashboard` icin smoke + kritik akis testleri yaz.
