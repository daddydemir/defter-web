# Paylaşım

## Ne Yapar

İki paylaşım modu:

1. **Özel paylaşım (arkadaşlara):** `view` (salt okunur) veya `edit` yetkisiyle belirli kullanıcılara not paylaşma.
2. **Herkese açık link:** `shareToken` (24 byte base64url) ile kimlik doğrulamasız okunabilir URL (`/share/:token`).

## Neden Eklendi

Notun değerinin bir kısmı başkalarının görebilmesinde. Arkadaş paylaşımı kalıcı işbirliği, public link ise tek tıkla dışa yayma (ödev, dokümantasyon, blog taslağı) için gerekli. İki modun izinleri birbirinden bağımsız olmalı.

## Nasıl Çalışır

- **Özel:** `POST /api/notes/:id/shares {userId, permission}` — sadece `owner` çağırabilir, hedef `friendships.status=accepted` olmalı. Varsa update, yoksa insert. `GET /api/notes/:id/shares`, `PATCH .../:shareId`, `DELETE` ile yönetim. İstemcide `ShareDialog` ve `Admin ShareChips` ile görünür. Paylaşılan notlarda `sharedByUsername` ve `permission` rozeti gösterilir; `Editor` `readOnly = permission==='view'` olur.
- **Public:** `POST /api/notes/:id/share` — `UPDATE notes SET share_token = COALESCE(existing, randomBase64url)`. `DELETE` ile kapatma (`NULL`). `GET /api/share/:token` (public) `share_views(ip, user_agent)` satırını fire-and-forget yazar ve `{id,title,content,createdAt,updatedAt,username}` döner. `shareToken` partial unique index’i çakışmayı önler.
- **İstemci:** `Editor` sağ üstte `Share2` ikonu (owner) veya `Düzenle/Görüntüle · username` etiketi (misafir). `ShareAnalyticsPage` public link metriklerini gösterir.

## Fayda

- **Kullanıcı:** Bir notu hem ekiple düzenlenebilir hem de dış dünyaya salt okunur link olarak sunma, ek araç olmadan.
- **Geliştirici:** İzin modeli basit (`owner` > `edit` > `view` > `none`), tek tablolu (`note_shares`) ve public için ek tablo yok.

## Sınırlamalar ve Trade-off’lar

- **Public link tek:** Not başına bir token; süreli link veya parola koruması yok.
- **İptal etkisi:** Token sıfırlanınca eski URL tamamen ölür, yönlendirme yok.
- **Arkadaş bağı:** Özel paylaşım `friendships` gerektirir — yabancıya doğrudan paylaşım yok (spam ve yetki şişmesini önlemek için bilinçli kısıt).
