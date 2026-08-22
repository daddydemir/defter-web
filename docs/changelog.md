# Changelog

Tüm önemli değişiklikler bu dosyada toplanır. Sürümleme `YYYY-MM` tarih bazlıdır; kırıcı değişiklikler **Breaking** ile işaretlenir.

## 2026-08 — Mevcut Durum

### Eklenenler
- **Rate limiting (012):** Redis (ioredis) tabanlı, memory fallback’li fixed-window. `rate_limit_daily` / `rate_limit_ip_daily` tabloları, `X-RateLimit-*` header’ları ve developer panelinde engellenen istek grafikleri.
- **QR ile giriş (011):** `pair_logins` tablosu, `POST /pair/start` → QR, `GET /pair/wait` poll, `POST /pair/approve` (auth’lu). SHA256 hash, 3 dk TTL, tek kullanımlık teslim.
- **Beyaz tema iyileştirmesi:** Açık tema değişkenleri (`--bg:#eef1f6`, `--border:#d7dce8`) ve kart gölgeleri; `SettingsPage` önizlemesi senkronize.
- **Bot koruması:** Cloudflare Turnstile — `TURNSTILE_SECRET` / `VITE_TURNSTILE_SITEKEY` ile `login`/`register` doğrulaması, env boşsa dev modunda atlanır.
- **Developer rolü (010):** `is_developer`, `endpoint_metrics` tablosu, `GET /api/dev/metrics` (13 paralel sorgu) ve `DeveloperPage` (exclusive routing).
- **Paylaşım analitiği:** `GET /api/analytics` + `GET /analytics/notes/:id/daily`, `share_views` kaydı ve `ShareAnalyticsPage` (7/30/90 gün).
- **Tablo desteği:** `@tiptap/extension-table` (`TableKit`), slash `/tablo` (3×3), yüzen tablo menüsü ve `tiptap-markdown` GFM serileştirme.

### İyileştirmeler
- **Otomatik kayıt:** `SAVE_IDLE_MS 1500→2000`, `SAVE_MAX_WAIT_MS 5000→30000`, duplicate payload koruması (`lastSentRef`).
- **Arkadaş polling:** 15s → 30s, `visibilitychange` ile arka planda duraklatma ve `saveChainsRef` ile not başına sıralı PATCH.
- **Admin panel:** Sekme göstergesi `border-b-2` ile kayma düzeltmesi, tablolarda `overflow-x-auto` + `min-w-*`, aksiyon hücrelerinde `flex-wrap`, mobil kartlarda developer rozeti ve Dev yap/kaldır düğmeleri.

### Düzeltmeler
- `GET /api/dev/metrics` günlük serilerde `count` → `views` alan adı uyuşmazlığı (grafiklerin düz kalması) düzeltildi.
- `Backend typecheck`: `ioredis` import’u `import { Redis }` ile düzeltildi, `auth.ts` duplicate `ip` değişkeni temizlendi.

---

## 2026-07 — Çekirdek

- **Migrations 001-009:** `notes`/`folders`/`tags`/`note_tags` (001), `users` + `user_id` FK’leri ve `UNIQUE(user_id,name)` (002), `friendships` + `note_shares` (003), `username` kolonu (004), `is_admin`/`banned_at` (005), `share_token` (006), `auth_logs` (007), `settings` + `max_notes/max_note_chars` (008), `share_views` (009).
- **Auth:** `scrypt` parola, HMAC token (30 gün), `privateDecrypt` RSA+AES şifreli gövde, `GET /public-key`.
- **Notlar:** CRUD, klasör/etiket, `mapNote` tek sorguda `json_agg`, limitler (`MAX_TITLE_LENGTH 500`).
- **Paylaşım:** Arkadaşa `view/edit` (`friendships` kontrolü) + herkese açık `share_token` (`/share/:token` public, `share_views` fire-and-forget).

---

## Migration Sırası

`001_init` → `002_users` → `003_friends_and_shares` → `004_username` → `005_admin` → `006_share_links` → `007_auth_logs` → `008_limits` → `009_share_views` → `010_developer_role` → `011_qr_login` → `012_rate_limit`

Her migration `migrations` tablosunda idempotent uygulanır (`BEGIN` → SQL → `INSERT migrations` → `COMMIT`).

## Sürüm Notu

Henüz semantik versiyon etiketlenmedi; `main` branch tek kaynak. Kırıcı şema değişikliklerinde yeni migration eklenir, mevcut `down` yoktur — geri alma için `psql` ile manuel `ALTER/DROP` gerekir.

