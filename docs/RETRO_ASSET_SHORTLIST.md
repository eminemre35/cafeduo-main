# Retro Asset Shortlist (CafeDuo)

Bu liste lisans tarafı temiz, retro-fütüristik stile uygun ve web oyununa uygun hafif paketlerden oluşur.

## Entegre Edilenler (Bugün)
1. **Platformer Pack Redux (Kenney, CC0)**
- Source: https://opengameart.org/content/platformer-pack-redux-360-assets
- Lisans: CC0 1.0 (ticari kullanım serbest, attribution zorunlu değil)
- Kullanım: Oyun ekranları arka plan + HUD ikonları

2. **8-bit Sound Effects Pack 001**
- Source: https://opengameart.org/content/8-bit-sound-effects-pack-001
- Lisans: Paket README'sine göre ticari/non-ticari serbest; geliştirici attribution istiyor
- Kullanım: Buton, başarı, hata, hit efektleri

## Sonraki Sprint İçin Önerilen Kaliteli Paketler
1. **Kenney Input Prompts Pixel 16**
- Source: https://kenney.nl/assets/input-prompts-pixel-16
- Kullanım: Mobil/desktop kontrol ikonlarını standartlaştırma

2. **Kenney UI Pack: Sci-Fi**
- Source: https://kenney.nl/assets/ui-pack-sci-fi
- Kullanım: Oyun içi panel, buton, badge ve modal tutarlılığı

3. **Kenney Particle Pack**
- Source: https://kenney.nl/assets/particle-pack
- Kullanım: Hit feedback, combo, reward sparkle animasyonları

4. **OpenGameArt Chiptune Collection**
- Source: https://opengameart.org/content/chiptune-collection
- Kullanım: Oyun başı kısa loop müzikleri (sessiz/low volume)

## Teknik Entegrasyon Notu
- Tüm asset URL'leri `public/assets/games/...` altında tutulur.
- Kod tarafı merkez dosyaları:
  - `lib/gameAssets.ts`
  - `lib/gameAudio.ts`
- Oyun bileşenleri:
  - `components/ReflexRush.tsx`
  - `components/ArenaBattle.tsx`
  - `components/OddEvenSprint.tsx`

## Lisans Disiplini
- Her yeni paket için `public/assets/games/ATTRIBUTION.md` güncelle.
- CC-BY / attribution isteyen paketlerde footer veya credits modal ekle.
- “No redistribution” kısıtı olan dosyaları repo içine almayın, runtime CDN ile çekin.

