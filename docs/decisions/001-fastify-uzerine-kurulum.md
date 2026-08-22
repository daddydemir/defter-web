# ADR 001 — HTTP Çatısı Olarak Fastify 5 Seçimi

- **Durum:** Accepted
- **Tarih:** 2025-08

## Bağlam

Defter’in backend’i REST + WebSocket (collab) sunar. İstek başına auth, rate limit ve metrik hook’ları gerekir. Ekip TypeScript ile çalışır, `async/await` ve şema doğrulama önemlidir. Express en yaygın seçenek; Koa ve Fastify alternatifler.

## Karar

HTTP sunucusu `Fastify 5` (`trustProxy:true`, `logger:true`, `@fastify/cors`) üzerine kurulacak. Tüm route’lar `prefix` ile modüler kaydedilecek (`/api/auth`, `/api/notes`, `/api/admin` …). WebSocket upgrade’i Node `http` server üzerinden `ws` ile ele alınacak.

## Gerekçe

- **Performans:** Fastify’in schema tabanlı serileştirmesi ve düşük overhead’i, özellikle yüksek frekanslı `PATCH /api/notes/:id` autosave trafiğinde Express’e göre belirgin avantaj sağlar.
- **Hook modeli:** `preValidation`, `preHandler`, `onResponse` hook’ları rate limit → auth → handler → metrik zincirini tek yerde kurmaya izin verir; Express middleware zincirine göre daha öngörülebilir.
- **TypeScript:** `FastifyRequest` augmentation (`req.userId`, `req.user`) ve `routeOptions.url` ile tip güvenli rota deseni elde edilir.
- **Ekosistem uyumu:** `y-websocket` upgrade’i ham `http.Server` gerektirir; Fastify bunu `server.on('upgrade')` ile doğal destekler.

Alternatifler elendi: Express — plugin ekosistemi geniş ama validasyon ve hook disiplini zayıf; Koa — minimal ama TypeScript ve şema desteği için ekstra katman gerekirdi.

## Sonuçlar

- **Olumlu:** Tek `buildApp()` içinde tüm cross-cutting concern’ler; `attachRateLimit`/`attachMetrics` sıralı ve test edilebilir; `trustProxy` ile `req.ip` doğru alınır.
- **Olumsuz:** Fastify 5’in NodeNext ESM çözünürlüğü (`moduleResolution: NodeNext`) `ioredis` default import’unda tip uyuşmazlıklarına yol açabilir — `import { Redis }` ile çözülmüştür.

