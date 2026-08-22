# Zengin Editör

## Ne Yapar

Markdown’ı kaynak tutan, Notion benzeri slash menü, mobil araç çubuğu, balon menü ve bağlamsal diyaloglarla zengin metin yazma. Desteklenenler: paragraf, başlık 1-3, madde/numaralı/görev listesi, alıntı, kod bloğu (lowlight vurgusu + dil seçici), tablo (3×3, header satırı), yatay çizgi, bağlantı (autolink), görsel (yeniden boyutlandırma).

## Neden Eklendi

Düz textarea teknik kullanıcılar için yetersiz, tam WYSIWYG editörler ise markdown taşınabilirliğini kaybettirir. TipTap + `tiptap-markdown` ikilisi iki dünyanın iyisini verir: görsel düzenleme, diskte sadece markdown.

## Nasıl Çalışır

- **Eklentiler (`baseExtensions(collab)`):** `StarterKit` (h1-3, undoRedo collab’de kapalı), `CodeBlockLowlight` (`lowlight common`), `Underline`, `Link` (`autolink`), `TaskList/TaskItem(nested)`, `ResizableImage` (genişlik/yükseklik → `<img>` yoksa `![alt](src)`), `TableKit(resizable:false)`, `Placeholder`, `Markdown(html:true)`.
- **Slash menü:** Satır başında `/` → `SLASH_ITEMS` (13 öğe) filtrelenir; `coordsAtPos` ile konumlanır, `Arrow/Enter/Escape` ile gezinilir, `deleteRange` ile `/sorgu` temizlenip komut çalıştırılır.
- **Araç çubukları:** 
  - Mobil: sticky, yatay scroll, `no-scrollbar`.
  - BubbleMenu: seçim boş değil ve `codeBlock` değilse.
  - Kod dili seçici: `isActive('codeBlock')` iken `coordsAtPos` ile yüzen panel + kopyala.
  - Tablo menüsü: `isActive('table')` iken satır/sütun ekle-sil, tablo sil.
- **Markdown döngüsü:** `mdOf(editor) = storage.markdown.getMarkdown()`; `onUpdate` → `onChange(md)` → üst bileşen `draft`’ı günceller. Collab kapalıyken `value` değişince `editor.commands.setContent(value)` senkronize eder.
- **Otomatik kayıt:** `SAVE_IDLE_MS=2000` + `SAVE_MAX_WAIT_MS=30000`; `visibilitychange hidden`/`pagehide`/unmount’ta `flushPendingSave` (duplicate korumalı `lastSentRef`).

## Fayda

- **Kullanıcı:** Klavyeden çıkmadan biçimlendirme, mobilde tek elle erişilebilir araçlar, kesintisiz kayıt.
- **Geliştirici:** Tek kaynak markdown — dışa aktarma, arama ve public render (`react-markdown`) ile uyumlu.

## Sınırlamalar ve Trade-off’lar

- **Tablo birleştirme yok:** `colspan/rowspan` olan tablolar GFM tablosuna serialize edilemez, HTML’e düşer.
- **Görsel yükleme:** Harici URL veya base64, sunucu tarafı dosya depolama yok — büyük görseller içerikte şişme yapar.
- **Markdown idempotency:** `tiptap-markdown` bazı kenar durumlarda farklı whitespace üretebilir; `current !== value` kontrolü gereksiz `setContent`’i önler ama yine de gözlenmeli.
