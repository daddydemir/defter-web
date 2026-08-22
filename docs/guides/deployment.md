# Deployment

## Docker ile

```bash
# Kökte
cp .env.example .env
# .env içini doldur: POSTGRES_*, AUTH_SECRET, REDIS_HOST/PASS, TURNSTILE_SECRET, VITE_TURNSTILE_SITEKEY

docker compose up --build -d
docker compose logs -f api
```

- `api` → `:4000` (health `/api/health`), `web` → `:80` (nginx, `dist`).
- Migration’lar `src/index.ts` → `runMigrations()` ile otomatik. Yeni `migrations/*.sql` eklemek yeterli.
- Frontend sitekey’i build-time gömülür: `VITE_TURNSTILE_SITEKEY` değişirse `docker compose build web` gerekir; backend secret’i runtime’da okunur, sadece `up -d` yeterli.

## Ortam Değişkenleri Özeti

| Değişken | Nerede | Zorunlu |
|----------|--------|---------|
| `DATABASE_URL` veya `POSTGRES_HOST/PORT/USER/PASSWORD/DB` | api | Evet |
| `AUTH_SECRET` | api | Prod’da evet |
| `REDIS_HOST`, `REDIS_PASS` veya `REDIS_URL` | api | Önerilir (yoksa memory fallback) |
| `TURNSTILE_SECRET` | api | Önerilir (yoksa captcha atlanır) |
| `VITE_TURNSTILE_SITEKEY` | web build arg | Turnstile aktifse evet |

Detay için `guides/environment-variables.md`.

## Reverse Proxy

Nginx/Caddy arkasında `trustProxy:true` sayesinde `req.ip` ve `X-Forwarded-For` doğru alınır. WebSocket için proxy’de `ws:true` (Vite dev proxy zaten ayarlı; prod nginx’te `Upgrade` header’ı geçir).

## Yedekleme

- **DB:** `pg_dump` ile günlük; `migrations` tablosu ile şema versiyonlanır.
- **Redis:** Rate limit sayaçları ephemeral, yedek gerekmez.

## Güncelleme

```bash
git pull
docker compose build
docker compose up -d
```

Yeni migration varsa container start’ında uygulanır. Büyük şema değişiminde `SELECT * FROM migrations` ile durumu kontrol et.
