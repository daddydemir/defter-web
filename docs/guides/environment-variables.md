# Ortam Değişkenleri

## Backend (`backend/.env` veya kök `.env` → `api` servisi)

| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| `DATABASE_URL` | Tek satır Postgres URL (alternatif: `POSTGRES_HOST` vb.) | `postgres://postgres:change-me@localhost:5432/notes` |
| `PORT` | API portu | `4000` |
| `HOST` | Bind adresi | `0.0.0.0` |
| `AUTH_SECRET` | HMAC token imzası, uzun rastgele | `openssl rand -hex 32` |
| `REDIS_HOST` | Redis host, içinde `:port` olabilir | `213.238.180.233:6379` |
| `REDIS_PORT` | Ayrı port (HOST içinde yoksa) | `6379` |
| `REDIS_PASS` / `REDIS_PASSWORD` | Redis parolası | `Yq0tkHTErhcQwyZ` |
| `REDIS_URL` | Alternatif tek URL | `redis://:pass@host:6379/0` |
| `TURNSTILE_SECRET` | Cloudflare Turnstile secret | `0x4AAAA...` |

## Frontend (`frontend/.env` veya kök `.env` → `web` build arg)

| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| `VITE_TURNSTILE_SITEKEY` | Turnstile sitekey (build-time gömülür) | `0x4AAAA...` |
| `VITE_API_PROXY` | Vite dev proxy hedefi | `http://localhost:4000` |
| `WEB_PORT` | Host’a expose edilecek web portu | `35804` |
| `API_PORT` | Host’a expose edilecek api portu | `29868` |

## Notlar

- `TURNSTILE_SECRET` boşsa captcha dev modunda atlanır; `VITE_TURNSTILE_SITEKEY` boşsa widget render edilmez.
- `REDIS_*` boşsa rate limit memory fallback ile çalışır (log’da `falling back to memory`).
- `AUTH_SECRET` değişirse tüm mevcut token’lar geçersiz olur — kullanıcılar tekrar giriş yapar.
