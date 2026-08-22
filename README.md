# Defter

Notlarınız tek yerde — yazın, organize edin, paylaşın ve birlikte düzenleyin.

Modern not alma platformu: **Fastify + PostgreSQL + Redis** (API) / **React + Vite + TipTap/Yjs + Tailwind + PWA** (Web). Zengin editör, gerçek zamanlı işbirliği, arkadaş ve public paylaşım, admin/developer panelleri, analitik ve bot koruması tek pakette.

## Hızlı Başlangıç

```bash
cp .env.example .env
# .env içini doldur: DATABASE_URL, AUTH_SECRET, REDIS_HOST/PASS (opsiyonel), TURNSTILE_*
docker compose up --build -d
# web  → http://localhost:80
# api  → http://localhost:4000  (health: /api/health)
```

Geliştirme için `guides/getting-started.md`’ye bakın.

## Dokümantasyon — Scalar Docs

Tüm doküman `docs/` altında, API `docs/api/openapi.yaml` (OpenAPI 3.1) ile Scalar uyumludur.

- **Yerel önizleme (Scalar CLI):**
  ```bash
  npx @scalar/cli preview docs/api/openapi.yaml
  # veya
  npx @scalar/cli serve docs/api/openapi.yaml --watch
  ```
- Alternatif: [Scalar Studio](https://docs.scalar.com) → *Import OpenAPI File* → `docs/api/openapi.yaml`’ı yükle.
- Statik site: `docs/` klasörünü herhangi bir markdown → HTML pipeline’ı ile yayınlayabilirsin; `docs/api/openapi.yaml` Scalar tarafından otomatik render edilir.

**Doküman haritası:**

| Yol | İçerik |
|-----|--------|
| `docs/introduction.md` | Amaç, problem, hedef kitle, mimari özet |
| `docs/features/*.md` | 12 feature dosyası (notlar, editör, işbirliği, paylaşım, arkadaşlar, auth, QR, rate limit, analitik, admin, developer, PWA) |
| `docs/decisions/*.md` | 7 ADR (Fastify, TipTap/Yjs, Postgres, Redis limit, Turnstile, HMAC+şifreli gövde, markdown kaynak) |
| `docs/guides/*.md` | getting-started, development, deployment, environment-variables, roles-and-permissions |
| `docs/api/openapi.yaml` | Tüm endpoint’ler, şemalar, auth, örnekler (3.1) |
| `docs/changelog.md` | Migration sırası ve sürüm notları |

Sorun/öneri için issue açın veya `docs/`’ta doğrudan düzenleme yapıp PR gönderin.
