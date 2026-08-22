# Yönetim Paneli

## Ne Yapar

Yöneticilerin kullanıcıları, notları, giriş günlüklerini ve global limitleri tek ekrandan yönetmesi. Sekmeler: Kullanıcılar, Notlar, Günlükler, Limitler.

## Neden Eklendi

Büyüyen toplulukta spam, kötüye kullanım ve kaynak tüketimi kaçınılmaz. Admin paneli olmadan her müdahale için doğrudan DB erişimi gerekirdi; bu da yavaş ve hataya açık.

## Nasıl Çalışır

- **Yetkilendirme:** `GET /api/admin/*` → `requireAuth` + `requireAdmin` (`is_admin`), `banned_at` kontrolü. `meId` kendine işlem yasağı.
- **Kullanıcılar (`GET /api/admin/users`):** `noteCount` ve `friendCount` alt sorgularla, `max_notes/max_note_chars` override’ları ile birlikte `ORDER created_at DESC`. Masaüstü tablo (8 kolon) + mobil kart listesi; `StatusBadge` (Yönetici/Engelli/Aktif + violet Developer rozeti). İşlemler:
  - Detay, Şifre sıfırla (`POST /:id/reset-password`, `is_admin=false` şartı), Yönetici yap/kaldır (`PATCH /:id/role`, son admin korunur), Developer yap/kaldır (`PATCH /:id/dev-role`, engelli yapılamaz), Engelle/Kaldır (`PATCH /:id/ban|unban`, admin’e işlem yok), Limit düzenleme (`PATCH /:id/limits`).
  - Tablolar `overflow-x-auto` + `min-w-[820px]` ve aksiyon hücreleri `flex-wrap` ile dar ekranda alt satıra sarar.
- **Kullanıcı Detayı (`GET /api/admin/users/:id`):** Notlar, publicShares (viewCount/uniqueIp dahil), arkadaşlar, limit editörü. Silme `DELETE /users/:userId/notes/:noteId`.
- **Notlar (`GET /api/admin/notes?q`):** `title/content ILIKE`, `ShareChips` (public Globe + `sharedWith edit/view`), viewCount.
- **Günlükler (`GET /api/admin/logs?q&success&limit&offset`):** `auth_logs` + `users` LEFT JOIN, filtreler ve sayfalama. Kartlarda `timeAgo`.
- **Limitler (`GET/PATCH /api/admin/settings`):** `settings` tablosu (`max_notes_per_user`, `max_note_content_length`), `LIMIT_BOUNDS` doğrulaması (1-100k / 100-2M). Kullanıcı limitleri boş bırakılırsa global varsayılana düşer.

## Fayda

- **Yönetici:** Kod bilmeden moderasyon, kota yönetimi ve destek; tümü Türkçe ve mobil uyumlu.
- **Geliştirici:** Tek `adminRoutes` dosyasında toplu, tutarlı hata mesajları (`Kendi rolünüzü değiştiremezsiniz`, `Son yöneticinin yetkisi kaldırılamaz`).

## Sınırlamalar ve Trade-off’lar

- **Tek admin eşiği:** Son adminin yetkisi sistem tarafından korunur, ancak iki admin aynı anda birbirini düşürmeye çalışırsa yarış koşulu teorik olarak mümkün (transaction yok, count-then-update).
- **Sayfalama basit:** Not/günlük listeleri 200-300 limitle, cursor değil offset — çok büyük veri setlerinde yavaşlayabilir.
- **Denetim kaydı:** Admin eylemleri için ayrı audit log yok, sadece `auth_logs` var.
