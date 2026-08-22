# Arkadaşlar

## Ne Yapar

Kullanıcı adına göre arama, istek gönderme/kabul/ret ve arkadaş listesi. İstekler `pending` → `accepted` yaşam döngüsündedir; karşılıklı istek otomatik kabul edilir.

## Neden Eklendi

Özel paylaşımın spam’e dönüşmemesi için önce arkadaşlık kurulması gerekir. Ayrıca sosyal bağ, not paylaşımının keşfedilebilirliğini artırır.

## Nasıl Çalışır

- **Arama:** `GET /api/friends/search?q` — `q≥2`, `username ILIKE %q%`, `id <> me` LIMIT 20; `friendships` LEFT JOIN ile `friendship: none|pending_outgoing|pending_incoming|friends` hesaplanır, e-posta asla dönmez.
- **Liste:** `GET /api/friends` ve `GET /api/friends/requests` (`incoming`/`outgoing` ayrı sorgular).
- **İstek:** `POST /api/friends/request {userId}` — kendine istek 400, hedef yoksa 404, mevcut satır varsa `Already friends` / `Request already sent`; ters yönde `pending` varsa `UPDATE status=accepted` (oto-kabul).
- **Kabul/Ret/Sil:** `POST /:id/accept` (`addressee=me AND pending`), `POST /:id/decline` (her iki taraf pending’i silebilir), `DELETE /:id` (`accepted`’i sil).
- **İstemci:** `Sidebar` ve `NoteList`’te `UserRound` + `friendReqCount` rozeti; `FriendsDialog` üç sekmeli (`friends|requests|add`). `App.tsx` 30 sn visibility-aware polling ile yeni `incoming`’i `localStorage` diff’leyip toast gösterir (12 sn otomatik kapanır).

## Fayda

- **Kullanıcı:** Kullanıcı adıyla bul, tek tıkla ekle, istek gelince anında haber al — e-posta paylaşmadan.
- **Geliştirici:** Basit durum makinesi, ek servis yok; polling `document.visibilityState` ile arka planda durur.

## Sınırlamalar ve Trade-off’lar

- **Polling:** WebSocket yerine 30 sn polling — basitlik ve sunucu maliyeti için seçildi; gerçek zamanlı değil.
- **Engelleme:** Arkadaşlık silme var, ancak kullanıcı engelleme (block) yok — admin `banned_at` ile global engelleme yapılır.
- **Arama kapsamı:** Sadece `username`, e-posta veya not içeriğine göre arama yok.
