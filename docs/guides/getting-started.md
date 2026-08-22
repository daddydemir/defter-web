# Başlangıç

Bu rehber Defter’i yerel makinede ayağa kaldırıp ilk notunu oluşturman için gereken minimum adımları anlatır.

## Ön Gereksinimler

- Node.js 22+
- PostgreSQL 16 (veya Docker)
- Redis 7 (rate limit için; yoksa memory fallback ile çalışır)

## Kurulum

```bash
# Repoları klonla (full stack tek repo olarak da gelebilir)
git clone <repo-url> defter
cd defter

# Ortam değişkenlerini hazırla
cp .env.example .env        # kök (docker-compose)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env  # gerekirse VITE_TURNSTILE_SITEKEY ekle

# .env içini doldur — en az:
# DATABASE_URL veya POSTGRES_HOST/PORT/USER/PASSWORD/DB
# AUTH_SECRET=$(openssl rand -hex 32)
```

## İlk Çalıştırma — Docker ile (önerilen)

```bash
docker compose up --build
# api  → http://localhost:4000  (health: /api/health)
# web  → http://localhost:80    (Vite build, nginx)
```

Migration’lar `api` ayağa kalkarken otomatik uygulanır (`001_*.sql` → `012_rate_limit.sql`).

## İlk Çalıştırma — Manuel

```bash
# Terminal 1 — API
cd backend
npm ci
npm run dev          # tsx watch src/index.ts → http://localhost:4000

# Terminal 2 — Web
cd frontend
npm ci
npm run dev          # vite → http://localhost:5173 (proxy /api → :4000)
```

## Temel Kullanım Senaryosu

1. **Kayıt ol:** `http://localhost:80` → *Kayıt ol* → kullanıcı adı (3-20, `a-zA-Z0-9_`), e-posta, parola ≥8. Turnstile anahtarları yoksa captcha atlanır.
2. **İlk not:** *Yeni not* → başlık + içerik yaz → 2 sn sonra “Kaydedildi” rozeti. Tablo için `/tablo`, başlık için `/baslik` slash menüsünü dene.
3. **Organize et:** Solda *Yeni klasör/etiket* ile oluştur, notu sürüklemeden `Klasör` seçici ile taşı, etiketi `Enter` ile ekle.
4. **Paylaş:** Editörde *Paylaş* → arkadaş seç (önce *Arkadaşlar*’dan ekle) veya *Herkese açık link* oluştur → `/share/:token`’ı kopyala.
5. **Analitik:** *Paylaşım Analizi* → not seç → 7/30/90 gün grafiği.
6. **QR giriş:** Giriş ekranında *QR kod ile giriş* → QR’ı PWA’daki *QR Tara* ile tara → onayla → masaüstü otomatik giriş yapar.

## Sık Yapılan Hatalar

| Hata | Çözüm |
|------|-------|
| `401 Unauthorized` tüm isteklerde | `localStorage notes-token` temizle, tekrar giriş yap; `AUTH_SECRET` değiştiyse tüm token’lar geçersizdir |
| `TURNSTILE_SECRET not set — captcha skipped` log’u | Prod’da `TURNSTILE_SECRET` ve `VITE_TURNSTILE_SITEKEY`’i `.env`’e ekle, frontend’i rebuild et (`VITE_` build-time gömülür) |
| `redis connection error, falling back to memory` | `REDIS_HOST`/`REDIS_PASS` (veya `REDIS_URL`) kontrol et; Redis olmadan da çalışır ama rate limit instance başına olur |
| `Not içeriği en fazla ... karakter` | Admin → Limitler’den global veya kullanıcı özel limitini artır |
| Tablo GFM’e serialize olmuyor | `colspan/rowspan` kullanma; `TableKit(resizable:false)` GFM dışı tabloyu HTML’e düşürür |
| `pair_logins` / `rate_limit_*` tablosu yok | `npm run build` migration kopyalamayı atladıysa `backend/dist/migrations`’i kontrol et; container’ı yeniden build et |

Sonraki adım: `guides/development.md` (kod düzeni) ve `guides/deployment.md` (prod).
