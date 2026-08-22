# Gerçek Zamanlı İşbirliği

## Ne Yapar

Aynı not üzerinde birden fazla kullanıcının eşzamanlı yazması, imleç/seçim paylaşımı ve otomatik çakışma çözümü. Her not bir Yjs dokümanı (`note:<id>`) olarak senkronize edilir.

## Neden Eklendi

Paylaşımlı notlarda “son yazan kazanır” modeli veri kaybına yol açar. CRDT tabanlı Yjs, sıralı PATCH’lerin ötesinde karakter düzeyinde birleştirme sağlar ve çevrimdışı düzenlemeleri bile güvenle kaynaştırır.

## Nasıl Çalışır

- **Sunucu (`/api/collab?token=&note=`):** `ws` upgrade, `verifyToken` → `isUserActive` (ban kontrolü) → `hasNoteAccess` (`notes.user_id` veya `note_shares` varlığı) → `setupWSConnection(conn, req, {docName})`. `y-websocket`’in `setupWSConnection`’ı Yjs update’leri broadcast eder.
- **İstemci (`RichEditor` collab mod):** `collabNoteId` varsa `Y.Doc` + `WebsocketProvider('/api/collab', noteId, {params:{token,note}, connect:false})` → `Collaboration(document: ydoc)` + `CollaborationCaret(provider, {name, color})`. Renk 8’lik paletten `caretColor(userId hash)` ile deterministik seçilir.
- **Seed:** Provider `sync` olunca ve fragment boşsa, mevcut markdown geçici editörde parse edilip `prosemirrorToYXmlFragment` ile `Y.XmlFragment('default')`’e yazılır. Sonrasında Yjs yetkili kaynaktır; `mdOf` polling’i atlanır.
- **Kalıcılık:** Yjs dokümanı memory’de yaşar, periyodik `onUpdate → onChange → PATCH /api/notes/:id {content}` ile Postgres’e yedeklenir. Sunucu restart’ında doküman boşsa tekrar seed edilir.

## Fayda

- **Kullanıcı:** Gecikmesiz birlikte yazma, karşı tarafın imleç rengi ve adıyla nerede olduğunu görme.
- **Geliştirici:** Dış servis yok, aynı Postgres + WebSocket altyapısı içinde.

## Sınırlamalar ve Trade-off’lar

- **Kalıcılık boşluğu:** Yjs dokümanı sadece memory’de; sunucu çökerse son PATCH’ten sonraki karakterler kaybolabilir (otomatik kayıt aralığı 2 sn olduğu için pencere küçük).
- **Geçmiş yok:** Yjs history ve undo/redo collab’de `StarterKit.undoRedo=false` ile devre dışı; ayrı sürüm geçmişi tutulmaz.
- **Ölçek:** Tek Node süreci; çok odalı senaryoda sticky session veya harici Yjs persistence (örn. y-redis) gerekir — şu an tek instance için kabul edildi.
