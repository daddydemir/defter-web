# Defter — Giriş

## Projenin Amacı

**Defter**, bireysel ve ekip kullanımına uygun, modern bir not alma uygulamasıdır. Kullanıcıların notlarını klasör ve etiketlerle organize etmesini, zengin metin (markdown + tablo, görsel, kod bloğu) ile yazmasını, notları arkadaşlarıyla veya herkese açık bağlantıyla paylaşmasını ve not üzerinde gerçek zamanlı işbirliği yapmasını sağlar. Yönetici ve geliştirici rolleriyle operasyonel ihtiyaçlar doğrudan ürünün içinde çözülür.

> **Tek cümle:** Notlarınız tek yerde — yazın, organize edin, paylaşın ve birlikte düzenleyin.

## Problem Tanımı

Mevcut not uygulamaları genellikle üç eksende yetersiz kalır:

1. **Parçalanmış deneyim:** Yazma, organizasyon ve paylaşım ayrı araçlara dağılır; bir notu arkadaşla paylaşmak için dışa aktarma veya manuel link üretme gerekir.
2. **Kötü birlikte çalışma:** Gerçek zamanlı imleç ve çakışmasız senkronizasyon olmadan ortak not düzenlemek veri kaybına yol açar.
3. **Operasyonel körlük:** Büyüme sırasında kaç not oluşturuldu, hangi endpoint ne kadar çağrılıyor, kim neyi engelliyor gibi sorular cevapsız kalır.

Diğer yandan, herkese açık notlar için görüntülenme takibi, bot koruması ve ölçekli rate limiting gibi ihtiyaçlar çoğu MVP not uygulamasında sonradan yamanır — Defter bunları ilk günden mimariye dahil eder.

## Hedef Kitle

- **Bireysel kullanıcılar:** Günlük notlar, fikirler, kod snippet’leri ve dokümantasyon için hızlı, aranabilir bir defter isteyenler.
- **Küçük ekipler / öğrenci grupları:** Bir not üzerinde birlikte çalışma, arkadaş ekleme ve izin bazlı paylaşım ihtiyacı olanlar.
- **Operasyon ekipleri:** Admin (moderasyon, limit yönetimi, ban) ve developer (metrik, rate limit gözlemi) rollerine ihtiyaç duyan platform sahipleri.

## Temel Değer Önerisi

- **Hızlı ve kesintisiz yazma:** TipTap tabanlı editör + Yjs işbirliği, 2 saniye boşta debounce + 30 sn güvenlik aralığı ile otomatik kayıt; sekme gizlenince/kapanırken anında flush.
- **Esnek organizasyon:** Klasörler, etiketler, sabitleme, anında filtreleme ve arama — sunucuya gitmeden client-side filtre.
- **Paylaşımın iki yolu:** Arkadaşlara `view`/`edit` yetkisiyle özel paylaşım + tek tıkla herkese açık link (public share) ve görüntülenme analitiği.
- **Güvenlik ve dayanıklılık:** RSA+AES şifreli auth payload, HMAC imzalı token (30 gün), Cloudflare Turnstile bot koruması, Redis tabanlı rate limit (memory fallback), otomatik şifre hash’leme (scrypt).
- **Gözlemlenebilirlik:** Developer panelinde kullanıcı/not/call metrikleri, günlük çubuk grafikler, endpoint ve rate-limit top listeleri — harici APM olmadan.
- **PWA:** Offline dayanıklı, `standalone` kurulum, `/api` istekleri asla cache’lenmez.

## Kısa Mimari Özet

```
┌─────────────┐      HTTPS + WS       ┌─────────────────────────┐
│  Frontend   │ ───────────────────▶ │  Backend (Fastify 5)    │
│  React 18   │  REST /api/*         │  ┌──────────────────┐   │
│  Vite + PWA │  WS /api/collab      │  │ auth / notes /    │   │
│  TipTap/Yjs │                      │  │ folders / tags /  │   │
│  Tailwind   │                      │  │ friends / admin / │   │
└─────────────┘                      │  │ analytics / dev / │   │
       ▲                             │  │ public            │   │
       │                             │  └────────┬──────────┘   │
       │                             │           │              │
       │                             │  ┌────────▼─────────┐    │
       │                             │  │  PostgreSQL 16   │    │
       │                             │  │  (notes, users,  │    │
       └─────────────────────────────┘  │   friendships,   │    │
                                      │   share_views,   │    │
                                      │   endpoint_     │    │
                                      │   metrics,      │    │
                                      │   pair_logins,  │    │
                                      │   rate_limit_*) │    │
                                      │  └────────────────┘    │
                                      │  ┌────────────────┐    │
                                      │  │  Redis 7       │    │
                                      │  │  (rate limit   │    │
                                      │  │   fixed-window │    │
                                      │  │   counters)    │    │
                                      │  └────────────────┘    │
                                      └─────────────────────────┘
```

**İstek akışı:** `preHandler` → Redis rate limit (429 + `Retry-After`/`X-RateLimit-*`) → `requireAuth`/`requireAdmin`/`requireDev` → handler → `onResponse` metrik buffer → 30 sn’de bir `endpoint_metrics` ve `rate_limit_daily` flush.

**Repolama:** `defter-api` (Fastify, `src/` + `migrations/`), `defter-web` (Vite, `src/components/*`). Full stack `docker-compose.yml` (`api:4000`, `web:80`) ile ayağa kalkar; dev’de Vite proxy `/api` → `localhost:4000` (WS dahil).

**Kimlik doğrulama:** `Authorization: Bearer <payload.hmac>` (HMAC-SHA256, 30 gün TTL). Login/register gövdesi mümkünse istemci tarafında RSA-AES ile şifrelenir, sunucuda `privateDecrypt` ile açılır.

Bir sonraki bölümde her bir özelliğin *ne, neden, nasıl* çalıştığını detaylandırıyoruz — bkz. `features/`.
