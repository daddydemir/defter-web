# ADR 002 — Editörde TipTap + Yjs İşbirliği

- **Durum:** Accepted
- **Tarih:** 2025-08

## Bağlam

Notlar hem tek kişilik hem de ekip halinde düzenlenmeli. Kullanıcı markdown’ı kaynak olarak görmek ister, aynı anda başkasının imlecini de. ProseMirror tabanlı çözümler CRDT ile iyi geçinir, ancak basit `contenteditable` çözümleri çakışmayı çözemez.

## Karar

Editör `TipTap 3` (`StarterKit`, `Collaboration`, `CollaborationCaret`, `TableKit`, `Markdown` eklentileri) ve `Yjs` (`y-websocket`, `y-prosemirror`) ile kurulacak. `Markdown` eklentisi `html:true` ile tek kaynak olarak markdown’ı saklayacak; collab açıkken `Y.Doc` yetkili kaynak olacak.

## Gerekçe

- **CRDT:** Yjs, karakter düzeyinde çatışmasız birleştirme sağlar; offline düzenlemeler bile sorunsuz merge olur. `y-websocket` basit broadcast ile yeterlidir.
- **TipTap uyumu:** `prosemirrorToYXmlFragment` ile mevcut markdown’ı ilk sync’de Yjs fragment’ına seed etmek trivial’dir; `StarterKit` ve `TableKit` ile zengin özellikler hazır gelir.
- **Taşınabilirlik:** Diskte sadece markdown tutulur; Yjs dokümanı memory’de yaşar ve periyodik PATCH ile Postgres’e yedeklenir — harici persistence servisi gerekmez.

Alternatifler elendi: Slate + ShareDB — ShareDB operasyonel karmaşıklığı yüksek; Monaco — kod odaklı, not için ağır.

## Sonuçlar

- **Olumlu:** Notion benzeri slash menü, tablo ve imleç paylaşımı tek stack’te; tek `baseExtensions(collab)` fonksiyonu ile collab açık/kapalı ayrımı net.
- **Olumsuz:** Yjs dokümanı memory-only; sunucu restart’ında son PATCH’ten sonraki karakterler kaybolabilir (2 sn autosave ile pencere küçük). Ölçek için sticky session veya `y-redis` gerekir — şu an tek instance kabul edildi.
