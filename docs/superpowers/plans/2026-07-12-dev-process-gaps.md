# Dev Süreci Eksikleri Kapanış Planı

## Bulgular

- Playwright shop smoke testi, APIRequestContext içindeki eski CSRF çerezi nedeniyle `PUT /api/users/:id` isteğinde `403 CSRF_TOKEN_INVALID` alıyordu.
- E2E check-in recovery yardımcısı, UI'da kapalı olan masa doğrulama alanını açmadan doldurmaya çalışıyordu.
- Üretim ve CI Node 20 kullanırken kilit dosyasındaki `lint-staged@17` ve `listr2@10` Node 22 gerektiriyordu; `npm ci` bu nedenle engine uyarısı üretiyordu.
- Katkı dokümanı yalnızca temel testleri tarif ediyor; audit, typecheck, build, E2E smoke ve deploy doğrulaması tek bir geliştirici kapısı olarak tanımlı değil.

## Uygulama sırası

1. E2E yardımcı akışlarında CSRF çift-submit ve doğrulama alanı görünürlük sözleşmesini sabitle.
2. `lint-staged` sürümünü Node 20 uyumlu sürüme çek ve package engine sözleşmesini yazılı hale getir.
3. `verify` komutunu audit, lint, typecheck, unit coverage ve build adımlarını fail-fast çalıştıracak şekilde ekle.
4. `CONTRIBUTING.md` içinde günlük geliştirme, PR ve canlıya çıkış kalite kapılarını güncelle.
5. Değişen dosyalar için hedefli testleri, tam unit suite'i, typecheck, lint, audit ve build'i çalıştır; E2E smoke sonucunu raporla.

## Kabul ölçütleri

- Shop smoke testi tekrarlı yerel çalışmada geçer.
- `npm ci` Node 20 üzerinde EBADENGINE uyarısı üretmez.
- `npm run verify` ilk hatada durur ve tüm zorunlu kalite adımlarını kapsar.
- Katkı dokümanı gerçek CI/deploy davranışıyla uyumludur.
