# VDS Migration Playbook

CafeDuo'yu bir VDS'ten başka bir VDS'e taşıma rehberi. Felaket kurtarma (DR) prosedürü olarak da kullanılır.

> 🧪 **Bu prosedür test edildi (2026-05-24).** B2 yedeğinden restore smoke test geçti: 9 users / 7 cafes / 51 games / 5 user_items — prod ile birebir eşleşti.

---

## 📋 Mevcut kurulum (referans)

| Bileşen              | Değer                                                                                |
| -------------------- | ------------------------------------------------------------------------------------ |
| **Şu anki VDS**      | `217.60.254.141` (Hostligo, Ubuntu 22.04, 2 core, 3.8 GB RAM)                        |
| **Dokploy panel**    | `http://217.60.254.141:3000`                                                         |
| **Container prefix** | `cafeduo-proje-3qsnfh-*` (api / web / postgres / redis)                              |
| **Dokploy kod yolu** | `/etc/dokploy/compose/cafeduo-proje-3qsnfh/code/`                                    |
| **GitHub repo**      | `eminemrre/cafeduo-main` (`main` branch'e push → otomatik deploy)                    |
| **Domain**           | `cafeduotr.com` + `www.cafeduotr.com` (Traefik route'lar)                            |
| **TLS**              | Let's Encrypt (otomatik, Caddy/Traefik yönetir)                                      |
| **B2 bucket**        | `cafeduo-backups` (us-east-005), Application Key bucket-scoped                       |
| **SSH key**          | `C:\Users\emine\.ssh\id_ed25519_cafeduo` (yerel), `/root/.ssh/authorized_keys` (VDS) |

---

## 💾 Neyin yedeği var, neyin yok

| Veri                  | Konum                                                              |            Otomatik mi?            |
| --------------------- | ------------------------------------------------------------------ | :--------------------------------: |
| **Kod**               | GitHub `eminemrre/cafeduo-main`                                    |             ✅ (push)              |
| **PostgreSQL**        | B2 `cafeduo-backups/daily/cafeduo-*.dump`                          |     ✅ (günlük 03:00 UTC cron)     |
| **Dokploy env**       | B2 `cafeduo-backups/dokploy-env/cafeduo-dokploy-env-*.txt`         | ⚠️ (manuel — değişiklikte tetikle) |
| **B2 creds**          | VDS `/root/.config/rclone/rclone.conf` + bu doküman + yerel `.env` |                 —                  |
| **TLS sertifikaları** | Caddy/Traefik otomatik yeniden alır                                |      ✅ (yeni VDS'te bedava)       |
| **Redis cache**       | Yedeklenmiyor (kaybedilebilir: rate-limit state, JWT blacklist)    |                 —                  |
| **Static uploads**    | Yok (kullanıcı upload özelliği yok şu an)                          |                 —                  |

---

## 🚀 Migration adımları

### Adım 0 — Yeni VDS hazırla

- [ ] Ubuntu 22.04+ kur
- [ ] SSH key'i ekle: `~/.ssh/authorized_keys`'e public key ekle (yerelde `id_ed25519_cafeduo.pub`)
- [ ] Docker + Docker Compose kur:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```

### Adım 1 — Eski VDS'te son hazırlık (eski hâlâ aktif)

- [ ] **DNS TTL'i düşür** (domain registrar paneli): `cafeduotr.com` A record TTL → `300s` (5 dk). Tipik default 3600+. Bu önceden yapılmazsa migration sırasında trafik saatlerce eski VDS'e gider.
- [ ] **Manuel backup tetikle:**
  ```bash
  ssh -i ~/.ssh/id_ed25519_cafeduo root@217.60.254.141 \
    "bash /opt/cafeduo-backup/backup.sh"
  ```
- [ ] **Dokploy env'leri yenile:**
  ```bash
  ssh -i ~/.ssh/id_ed25519_cafeduo root@217.60.254.141 << 'EOF'
  PG=$(docker ps --format '{{.Names}}' | grep dokploy-postgres | head -1)
  TS=$(date -u +%Y%m%d-%H%M%S)
  FILE=/tmp/cafeduo-dokploy-env-${TS}.txt
  docker exec $PG psql -U dokploy -d dokploy -At \
    -c "SELECT env FROM compose WHERE \"appName\" = 'cafeduo-proje-3qsnfh';" > $FILE
  rclone copy $FILE b2-cafeduo:cafeduo-backups/dokploy-env/
  rm $FILE
  EOF
  ```
- [ ] **B2'de en yeni dump'ı doğrula:**
  ```bash
  ssh -i ~/.ssh/id_ed25519_cafeduo root@217.60.254.141 \
    "rclone lsl b2-cafeduo:cafeduo-backups/daily/ | sort | tail -3"
  ```

### Adım 2 — Yeni VDS'te Dokploy kur

- [ ] Dokploy install:
  ```bash
  curl -sSL https://dokploy.com/install.sh | sh
  ```
- [ ] Panel'i aç: `http://NEW-VDS-IP:3000`
- [ ] Admin hesap oluştur

### Adım 3 — Yeni VDS'te cafeduo stack ekle (Dokploy panel)

- [ ] **Create Compose** → GitHub source: `eminemrre/cafeduo-main`, branch `main`, compose path `deploy/docker-compose.dokploy.yml`
- [ ] **Environment Variables:** B2'den en yeni dokploy-env'i indir:
  ```bash
  rclone copy b2-cafeduo:cafeduo-backups/dokploy-env/ ./dokploy-env/
  # En yeni dosyanın içeriğini Dokploy panel "Environment" textarea'sına yapıştır
  ```
- [ ] **Domains:** `cafeduotr.com` ve `www.cafeduotr.com` ekle, HTTPS aktif (Let's Encrypt otomatik)
- [ ] **Deploy** — kod GitHub'tan çekilir, container'lar build edilir, ayağa kalkar
- [ ] **NOT:** Bu noktada DNS hâlâ eski VDS'i gösteriyor. Yeni VDS'in IP'sine doğrudan istek atarak smoke test yapabilirsin (Host header ile):
  ```bash
  curl --resolve cafeduotr.com:443:NEW-VDS-IP https://cafeduotr.com/health
  ```

### Adım 4 — Yeni VDS'e Postgres restore

- [ ] B2'den son dump'ı indir + restore (cafeduo postgres container ayakta olmalı):

  ```bash
  # SSH new-vds
  LATEST=$(rclone lsf b2-cafeduo:cafeduo-backups/daily/ | sort | tail -1)
  rclone copy "b2-cafeduo:cafeduo-backups/daily/$LATEST" /tmp/

  PG=$(docker ps --format '{{.Names}}' | grep cafeduo-proje | grep postgres | head -1)
  DB_USER=$(docker exec $PG printenv POSTGRES_USER)
  DB_NAME=$(docker exec $PG printenv POSTGRES_DB)

  docker cp "/tmp/$LATEST" $PG:/tmp/dump
  docker exec $PG pg_restore --clean --if-exists -U $DB_USER -d $DB_NAME /tmp/dump
  docker exec $PG rm /tmp/dump
  rm "/tmp/$LATEST"
  ```

- [ ] **Verify** (kullanıcı sayısı eski VDS ile eşleşmeli):
  ```bash
  docker exec $PG psql -U $DB_USER -d $DB_NAME -c \
    "SELECT (SELECT count(*) FROM users) AS u, (SELECT count(*) FROM cafes) AS c, (SELECT count(*) FROM games) AS g;"
  ```

### Adım 5 — Yeni VDS'te backup sistemini kur

- [ ] rclone kur + B2 config:
  ```bash
  curl -fsSL https://rclone.org/install.sh | bash
  mkdir -p /root/.config/rclone
  cat > /root/.config/rclone/rclone.conf <<'EOF'
  [b2-cafeduo]
  type = s3
  provider = Other
  access_key_id = <KEY_ID>
  secret_access_key = <APP_KEY>
  endpoint = https://s3.us-east-005.backblazeb2.com
  region = us-east-005
  no_check_bucket = true
  force_path_style = true
  EOF
  chmod 600 /root/.config/rclone/rclone.conf
  ```
  > ⚠️ `no_check_bucket = true` SHART — Application Key bucket-scoped olduğu için rclone aksi halde 403 alır.
- [ ] Eski VDS'ten backup script'leri kopyala:
  ```bash
  # Eski VDS'te:
  scp /opt/cafeduo-backup/*.sh root@NEW-VDS-IP:/opt/cafeduo-backup/
  # Veya yeni VDS'te repo'dan:
  cp /etc/dokploy/compose/cafeduo-proje-3qsnfh/code/deploy/scripts/*.sh /opt/cafeduo-backup/ 2>/dev/null || true
  ```
- [ ] Crontab kur:
  ```bash
  (crontab -l 2>/dev/null | grep -v cafeduo-backup; \
    echo "0 3 * * * /opt/cafeduo-backup/backup.sh >> /var/log/cafeduo-backup.log 2>&1") | crontab -
  ```
- [ ] Manuel bir backup tetikle, B2'de görünür mü doğrula:
  ```bash
  bash /opt/cafeduo-backup/backup.sh
  rclone lsl b2-cafeduo:cafeduo-backups/daily/ | tail -3
  ```

### Adım 6 — DNS değişimi (asıl trafik geçişi)

- [ ] Domain registrar paneline git
- [ ] `cafeduotr.com` A record'unu **NEW-VDS-IP**'ye değiştir
- [ ] `www.cafeduotr.com` da güncel (genelde aynı A record veya CNAME root'a)
- [ ] DNS propagation bekle (TTL 300s ayarlıysa ~5 dk)
- [ ] Doğrula:
  ```bash
  dig +short cafeduotr.com
  curl -I https://cafeduotr.com
  ```

### Adım 7 — Son smoke test (yeni VDS canlı)

- [ ] `https://cafeduotr.com/health` → 200 OK
- [ ] `https://cafeduotr.com/api/meta/version` → 200 OK
- [ ] Browser'da test giriş yap, oyun başlat
- [ ] Sentry'de yeni hostname/IP görünüyor mu
- [ ] B2 backup cron çalışıyor mu (24 saat içinde yeni dump görünmeli)

### Adım 8 — Eski VDS'i kapat

- [ ] **24-48 saat bekle** (DNS propagation + her şey stabil)
- [ ] Eski VDS Dokploy stack'ini durdur
- [ ] Hostligo panel'inden VDS'i iptal et / kapat

---

## ⚠️ Bilinen tuzaklar

1. **B2 Application Key kapsam dar** — ListBuckets / CreateBucket yapamaz. rclone config'inde `no_check_bucket = true` olmadan upload başarısız olur (`AccessDenied: not entitled`).
2. **Dokploy env değişiklikleri** otomatik B2'ye gitmiyor — env değiştirdiğinde manuel `Adım 1`'deki komutu çalıştır.
3. **DNS TTL** önceden düşürülmezse migration sırasında trafik saatlerce eski VDS'e devam gider.
4. **B2 native API protokol uyumsuzluğu** — rclone B2 type ile "HTTP response to HTTPS client" hatası gelir; bu yüzden S3-compatible config tercih edilmiştir (`type = s3, provider = Other`).
5. **Redis volume** restore edilmez — JWT blacklist sıfırlanır, bütün kullanıcıların tokens'ı geçerli kalır. Güvenlik gereği migrasyon sonrası kullanıcılara yeniden giriş yaptırmak istersen `JWT_SECRET`'ı rotate et.
6. **Dokploy panel parolası** — yeni VDS'te ilk açılışta sıfırdan oluşturulur, eski panel parolası çalışmaz.
7. **Container ID'leri değişir** — yeni VDS'te container ismi `cafeduo-proje-XXXXXX` olur (yeni hash). `backup.sh` container'ı `docker ps | grep cafeduo-proje | grep postgres` ile bulduğu için sorun olmaz.

---

## 🔄 Sadece DB restore senaryosu (felaket, yeniden VDS yok)

Eğer sadece DB bozulduysa (VDS hâlâ ayakta), tüm migration'ı yapmaya gerek yok:

```bash
ssh -i ~/.ssh/id_ed25519_cafeduo root@217.60.254.141
LATEST=$(rclone lsf b2-cafeduo:cafeduo-backups/daily/ | sort | tail -1)
rclone copy "b2-cafeduo:cafeduo-backups/daily/$LATEST" /var/backups/cafeduo/
bash /opt/cafeduo-backup/restore.sh "/var/backups/cafeduo/$LATEST"
# Onay için "YES" yaz
```

---

## 🧪 Yıllık DR drill

Bu prosedürün hâlâ çalıştığını doğrulamak için yılda en az bir kez şu testi yap (production'ı etkilemez):

```bash
ssh -i ~/.ssh/id_ed25519_cafeduo root@217.60.254.141 << 'EOF'
LATEST=$(rclone lsf b2-cafeduo:cafeduo-backups/daily/ | sort | tail -1)
rclone copy "b2-cafeduo:cafeduo-backups/daily/$LATEST" /tmp/
docker run -d --name dr-drill --rm \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=test -e POSTGRES_DB=cafeduo \
  pgvector/pgvector:pg15
sleep 5
docker cp "/tmp/$LATEST" dr-drill:/tmp/dump
docker exec dr-drill pg_restore --clean --if-exists -U postgres -d cafeduo /tmp/dump
docker exec dr-drill psql -U postgres -d cafeduo -c \
  "SELECT (SELECT count(*) FROM users) AS u, (SELECT count(*) FROM cafes) AS c, (SELECT count(*) FROM games) AS g;"
docker rm -f dr-drill
rm "/tmp/$LATEST"
EOF
```

Çıktıdaki sayılar prod ile eşleşiyorsa yedek sistem sağlıklı.
