# ADR 004 — Redis Tabanlı Rate Limit (Memory Fallback’li)

- **Durum:** Accepted
- **Tarih:** 2025-08

## Bağlam

Login/register, QR polling, arkadaş istekleri ve autosave gibi endpoint’ler bot ve kötüye kullanıma açık. Limitler IP ve rota bazında olmalı, metrikleri developer panelinde görünmeli.

## Karar

Rate limit `ioredis` ile Redis’te fixed-window sayaçlar (`rl:<ip>:<METHOD route>:<winId>` → `INCR` + `EXPIRE`) üzerinden uygulanacak. Redis yoksa memory `Map` fallback’e düşülecek. Her `429`’da `rate_limit_daily` ve `rate_limit_ip_daily` tablolarına 30 sn buffer ile flush edilecek. Kural seti `rateLimit.ts`’te merkezi (`DEFAULT 120/dk`, login 8/dk, register 5/dk vb.), `/api/health` muaf.

## Gerekçe

- **Dağıtık doğruluk:** Memory limit çok instance’ta tutarsız; Redis tek kaynak sayacı sağlar. `ioredis` `lazyConnect` ve düşük `maxRetriesPerRequest` ile Redis çökse bile servis ayakta kalır.
- **Basitlik:** Fixed window tek `INCR` ile çalışır; sliding window (ZSET) iki kat işlem gerektirir — mevcut trafik için fixed window yeterli.
- **Gözlemlenebilirlik:** Engellenenler ayrı tablolarda günlük toplanır, `dev/metrics`’te top route/IP ve günlük seri olarak döner.

Alternatifler elendi: `express-rate-limit` memory store — dağıtık değil; Nginx rate limit — uygulama seviyesinde rota bazlı esneklik yok.

## Sonuçlar

- **Olumlu:** Tek `preHandler` hook, `X-RateLimit-*`/`Retry-After` header’ları istemciye şeffaf; Redis down olsa bile koruma devam eder.
- **Olumsuz:** Pencere sınırında burst (fixed window kenarında iki kat istek) mümkün; NAT arkasında çok kullanıcı tek IP’de toplanır — kullanıcı bazlı limit eklenmedi.
