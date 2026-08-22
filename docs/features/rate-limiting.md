# Rate Limiting

## Ne Yapar

Tüm `/api` isteklerini IP ve endpoint bazında sabit pencerede sınırlar, aşıldığında `429` döner ve engellenenleri panel için sayar. Redis varsa dağıtık, yoksa memory fallback ile çalışır.

## Neden Eklendi

Not kayıt sıklığı (`PATCH /api/notes/:id` her 2 sn), arkadaş polling ve public paylaşımlar kötüye kullanıma açık. Bot trafiği login/register’ı, QR polling’i ve arkadaş isteklerini hedef alabilir. Ölçülmeyen koruma, koruma değildir — bu yüzden metrikler de aynı sistemde tutulur.

## Nasıl Çalışır

- **Kural seti (`rateLimit.ts`):** Varsayılan `60s 120 istek / IP / route`. Override’lar:
  - `POST /api/auth/login` 8/dk
  - `POST /api/auth/register` 5/dk
  - `POST /api/auth/pair/start` 10/dk, `GET /pair/wait` 30/dk, `POST /pair/approve` 20/dk, `GET /pair/info` 30/dk
  - `POST /api/auth/me/password` 5/dk, `POST /api/friends/request` 15/dk
  - `/api/health` muaf
- **Anahtar:** `rl:<ip>:<METHOD route>:<winId>` (`winId = floor(now / windowMs)`), `route = routeOptions.url` yoksa ham URL. X-Forwarded-For’daki ilk IP alınır.
- **Redis yolu:** `INCR` → `count==1` ise `EXPIRE ttlSec`, ardından `TTL` → `remaining`, `resetMs`. `ioredis` tek istek, `lazyConnect` ve `maxRetriesPerRequest:1`.
- **Memory fallback:** `Map<memKey, {count, resetAt}>`, `size>4000` ise eski pencereler temizlenir.
- **Yanıt:** Her istekte `X-RateLimit-Limit/Remaining/Reset`; engelde `Retry-After` + `429 {error, retryAfter}`. İstemci toast ile gösterebilir.
- **Metrikler:** Her 429’da `rate_limit_daily(day,method,route,count)` ve `rate_limit_ip_daily(day,ip,count)` buffer’larına `+1`; 30 sn’de `INSERT ... ON CONFLICT DO UPDATE SET count+=excluded.count` ile flush. Ortam değişkenleri: `REDIS_HOST` (içinde `:port` varsa ayrıştırılır), `REDIS_PORT`, `REDIS_PASS`/`REDIS_PASSWORD`, veya `REDIS_URL`.

## Fayda

- **Kullanıcı:** Normal kullanım hiç etkilenmez (120/dk bol), saldırı anında adil kuyruk.
- **Geliştirici:** Tek `preHandler` hook, dağıtık sayaç, panelde anlık ve günlük görünüm; Redis çökse bile servis ayakta.

## Sınırlamalar ve Trade-off’lar

- **Fixed window:** Pencere sınırında ani sıçrama (burst) mümkün; sliding window (ZSET) daha pürüzsüz olurdu ama iki kat Redis işlemi gerektirir — basitlik için kabul edildi.
- **IP tabanlı:** NAT arkasındaki çok kullanıcı tek IP’de toplanır; kullanıcı bazlı limit eklenmedi (auth sonrası eklenebilir).
- **Event kaybı riski:** Buffer 30 sn’de flush edilir; crash’te son pencere sayıları kaybolabilir — kabul edilebilir metrik kaybı.
