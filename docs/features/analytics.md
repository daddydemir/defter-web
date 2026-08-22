# Paylaşım Analitiği

## Ne Yapar

Kullanıcının herkese açık notlarının görüntülenme sayıları, tekil IP’ler ve günlük zaman serisi. Not bazında drill-down ve 7/30/90 gün aralığı.

## Neden Eklendi

Public link tek tıkla yayılır ama etkisi ölçülmezse değeri anlaşılmaz. Hangi not kaç kez görüldü, ne zaman pik yaptı soruları ürünün viral döngüsünü besler ve spam tespiti için de sinyal sağlar.

## Nasıl Çalışır

- **Kayıt:** `GET /api/share/:token` her çağrıldığında `INSERT INTO share_views(note_id, ip, user_agent)` fire-and-forget yapılır. `share_views` index’leri `note_id` ve `viewed_at`.
- **Özet (`GET /api/analytics`, requireAuth):** 4 paralel sorgu:
  - `totalViews` ve `totalUniqueIps` (`count`, `count(DISTINCT ip)` where `user_id=me AND share_token IS NOT NULL`)
  - `notes[]` (`noteId,title,shareToken,viewCount,uniqueIpCount,firstViewAt,lastViewAt` `LEFT JOIN` + `GROUP BY n.id` `ORDER viewCount DESC`)
  - `daily[]` son 30 gün (`to_char(viewed_at,'YYYY-MM-DD')` → `GROUP BY day`)
  - `todayViews` (`viewed_at >= CURRENT_DATE` UTC)
- **Not detayı (`GET /api/analytics/notes/:id/daily?days` 1-365):** `notes` sahipliği ve `share_token NOT NULL` doğrulanır, sonra `share_views`’ten `GROUP BY day`.
- **İstemci (`ShareAnalyticsPage`):** Stat kartları (Eye/CalendarDays/UsersRound/FileText), solda “Tümü” + `NoteRow` listesi (kopyala/aç), sağda `DailyBarChart` (boş günler 0 doldurulur `fillDays`), aralık seçici (seçili notta aktif), toplam ve `timeAgo(lastViewAt)`.

## Fayda

- **Kullanıcı:** Hangi notun tuttuğunu ve ne zaman paylaşıldığını anında görme; public link’in canlılığını ölçme.
- **Geliştirici:** Tek tablo + 4 sorgu ile düşük maliyetli metrik; public `GET` her çağrıda ek yük minimum (async insert).

## Sınırlamalar ve Trade-off’lar

- **IP tekilleştirme:** `ip` bazlı unique sayımı, CGNAT ve VPN’de yanıltıcı; çerez tabanlı fingerprint yok (gizlilik için bilinçli).
- **Gün tanımı:** `to_char(viewed_at,'YYYY-MM-DD')` DB timezone’una bağlı; UTC kullanan sunucuda kullanıcının yerel gününden sapabilir — deterministik `YYYY-MM-DD` string’i ile istemci kayması önlenir ama yine UTC diliminde.
- **Gerçek zamanlı değil:** Grafikler `ShareAnalyticsPage` yenile ile güncellenir; push yok.
