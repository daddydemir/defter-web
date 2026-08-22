# ADR 007 — Kaynak Gerçek Olarak Markdown

- **Durum:** Accepted
- **Tarih:** 2025-08

## Bağlam

Not içeriği hem görsel editörde hem de dışa aktarma/arama/public render’da kullanılacak. TipTap dokümanı JSON, markdown ise taşınabilir metin.

## Karar

Kaynak gerçek **markdown** olacak. TipTap `Markdown` eklentisi (`html:true`) `storage.markdown.getMarkdown()` ile serileştirir; `mdOf(editor)` her `onUpdate`’te çağrılır. Collab kapalıyken `value` prop’u değişince `editor.commands.setContent(value)` ile senkronize edilir. Public render `react-markdown + remark-gfm` ile yapılır.

## Gerekçe

- **Taşınabilirlik:** Markdown dosya olarak saklanabilir, diff’lenebilir, arama (`ILIKE` veya FTS) ile doğrudan işlenir; TipTap JSON’a kilitlenmekten kaçınılır.
- **Uyum:** `tiptap-markdown` tablo, görev listesi ve kod bloklarını GFM’e serileştirir; `remark-gfm` public tarafta aynı dilde render eder.
- **Görsel + metin birliği:** Kullanıcı WYSIWYG yazar, diskte sade markdown kalır — dışa aktarma için ek dönüşüm yok.

Alternatifler elendi: TipTap JSON’u saklama — arama ve public render için ek parser gerekirdi; salt HTML saklama — markdown kadar okunabilir değil.

## Sonuçlar

- **Olumlu:** Tek `content` alanı, hem editör hem de arama/public için yeterli; tablo ve görev listesi GFM ile sorunsuz.
- **Olumsuz:** `colspan/rowspan` olan tablolar GFM’e sığmaz, HTML’e düşer (`tiptap-markdown` fallback). Bazı whitespace farkları `setContent` döngüsüne yol açabilir — `current !== value` guard’ı ile mitigé edildi.
