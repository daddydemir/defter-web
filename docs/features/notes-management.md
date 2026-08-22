# Not Yönetimi

## Ne Yapar

Kullanıcıların not oluşturması, düzenlemesi, silmesi, sabitlemesi, klasör ve etiketlerle organize etmesi ve anında filtreleyip araması. Her not `title`, `content` (markdown), `folderId`, `isPinned`, `tags[]` alanlarına sahiptir; `permission` (`owner`/`edit`/`view`) ile kimlerin ne yapabileceği belirlenir.

- **Oluşturma:** `POST /api/notes` — `folderId` filtrede seçiliyse yeni not doğrudan o klasöre düşer.
- **Listeleme:** `GET /api/notes?search&folderId&tagId&view=pinned` — 500 limitle `is_pinned DESC, updated_at DESC`.
- **Filtreleme:** İstemcide `debouncedSearch` (200 ms), `view`, `filterFolder`, `filterTag` ile `useMemo` içinde yapılır — ek round-trip yok.
- **Taşıma & Sabitleme:** `PATCH /api/notes/:id { folderId, isPinned, tagIds }` — optimistik UI.
- **Arama:** Başlık ve içerikte `ILIKE %q%`.

## Neden Eklendi

Not uygulamalarının çekirdeği. Kullanıcı sayıyı hızla artırdığında bile liste akıcı kalmalı ve organizasyon maliyeti düşük olmalı. Klasör ve etiket ikisi birden gerekiyor: klasörler hiyerarşik, etiketler kesişimsel sorgular için.

## Nasıl Çalışır

- **Veri modeli:** `notes`, `folders`, `tags`, `note_tags` tabloları; `notes.folder_id` nullable FK, `note_tags` join tablosu `UNIQUE(user_id, name)` etiketleri kullanıcı bazında tekilleştirir.
- **Yetki:** `(user_id = me OR note_shares exists)` filtresi her sorguda uygulanır. Yazma işlemleri `owner` veya `edit` paylaşımı gerektirir.
- **Limitler:** `MAX_TITLE_LENGTH=500`, içerik uzunluğu `settings.max_note_content_length` (varsayılan 200k) ile sınırlandırılır; kullanıcı başına 2000 not varsayılan limiti `settings` ve `users.max_notes` override’ı ile yönetilir.
- **İstemci:** `App.tsx` üç listeyi paralel `Promise.all` ile çeker, `notesRef` ile geçmiş değeri korur, `saveChainsRef` ile aynı not için PATCH’leri sıraya koyar (paralel yarış yok).

## Fayda

- **Kullanıcı:** Yüzlerce notta bile anında filtre, tek tıkla sabitleme ve sürüklemeden taşıma.
- **Geliştirici:** Liste tek endpoint’te, filtreler basit query param’larla; istemci tarafı filtre sunucu yükünü azaltır.

## Sınırlamalar ve Trade-off’lar

- **500 limit:** `GET /api/notes` sayfasız; çok büyük arşivlerde pagination gerekir. Şu an istemci belleğinde tutulduğu için kabul edildi.
- **Tam metin arama:** `ILIKE` kullanır, FTS (tsvector) değil — Türkçe ve kısa metinler için yeterli, ancak büyük korpus ve sıralı aramada yetersiz.
- **Etiket silme:** `note_tags` cascade ile silinir; geri alma yok.
