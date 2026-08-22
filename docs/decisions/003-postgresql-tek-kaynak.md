# ADR 003 — Birincil Veri Kaynağı Olarak PostgreSQL

- **Durum:** Accepted
- **Tarih:** 2025-07

## Bağlam

Uygulama ilişkisel verilere ihtiyaç duyar: kullanıcılar, notlar, klasörler, etiketler, arkadaşlıklar, paylaşımlar, günlükler, limitler, metrikler. Arama `ILIKE`, join’ler ve transaction’lar yaygındır.

## Karar

Tek bir `PostgreSQL` kümesi birincil kaynak olacak. Şema `migrations/*.sql` ile versiyonlanır (`migrations` tablosu ile idempotent). `pg` havuzu (`pool`) tüm sorgular için kullanılır. NoSQL veya ayrı arama motoru (Elastic) kullanılmayacak.

## Gerekçe

- **İlişkisel model:** `notes ↔ folders/tags` ve `friendships` gibi join’ler doğal; `UNIQUE(user_id, name)` ve `CHECK` constraint’leri uygulama katmanında değil DB’de garanti edilir.
- **Operasyonel basitlik:** Tek DB, tek yedekleme, tek migration akışı. `ILIKE %q%` kısa metinler ve düşük hacim için yeterli; FTS eklemek ek indeks ve bakım getirirdi.
- **Gözlemlenebilirlik:** `auth_logs`, `share_views`, `endpoint_metrics`, `rate_limit_daily` gibi metrik tabloları aynı DB’de, aynı SQL ile sorgulanır — harici zaman serisi DB’sine gerek kalmaz.

Alternatifler elendi: MongoDB — join ve transaction zayıf; MySQL — `ILIKE` ve partial index desteği PostgreSQL’de daha güçlü.

## Sonuçlar

- **Olumlu:** `BEGIN/COMMIT` ile not+tag atomikliği, `COALESCE(json_agg(...))` ile tek sorguda zengin `mapNote` çıktısı, migration’lar sıralı ve tekrarlanabilir.
- **Olumsuz:** `GET /api/notes` 500 limitli ve sayfasız; çok büyük arşivlerde offset tabanlı sayfalama eklemek gerekecek. FTS ihtiyacı doğarsa `tsvector` eklenecek.
