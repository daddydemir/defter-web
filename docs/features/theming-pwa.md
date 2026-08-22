# Tema ve PWA

## Ne Yapar

Açık/koyu tema, sistem tercihine saygılı ilk yükleme, PWA olarak `standalone` kurulum ve offline dayanıklılık. Tüm istekler tema değişkenleri üzerinden boyanır.

## Neden Eklendi

Not yazma uzun seanslar gerektirir — göz yormayan tema ve tek tıkla ana ekrana ekleme, uygulamanın günlük kullanım sıklığını doğrudan etkiler. Tema değişkenleri tek kaynaktan yönetilmezse tutarsızlık hızla büyür.

## Nasıl Çalışır

- **Değişkenler (`src/index.css`):**
  - `:root` (light): `--bg:#eef1f6, --surface:#fff, --surface-2:#e8ecf3, --border:#d7dce8, --text:#0f172a, --text-secondary:#64748b, --accent:#4f46e5`, `hl-*` github-light.
  - `.dark`: `--bg:#0c0c10, --surface:#131318, --surface-2:#1b1b21, --border:#26262e, --text:#e8e8ec, --text-secondary:#9a9aa6, --accent:#6366f1`, `hl-*` github-dark. `color-scheme` buna göre.
  - `html:not(.dark) .bg-surface`’e hafif `box-shadow` ile açık temada kart derinliği.
- **Geçiş:** `App.tsx` `toggleTheme` → `documentElement.classList.toggle('dark')` + `localStorage notes-theme`. `index.html`’deki inline script ilk paint’ten önce `localStorage`’i okuyup sınıfı uygular (FOUC yok). `dvh` fallback, `env(safe-area-inset-*)`, `overscroll-behavior:none`, `-webkit-tap-highlight transparent`, `touch-action:manipulation` ile mobil parlatılır.
- **PWA (`vite.config.ts`, `vite-plugin-pwa`):**
  - `registerType:autoUpdate`, `injectRegister:auto`, `includeAssets` favicon’lar,
  - `manifest: {name:'Defter', short_name:'Defter', description:'Notlarınız tek yerde', lang:'tr', display:'standalone', orientation:'any', background_color:'#0c0c10', theme_color:'#0c0c10', icons 192/512 + maskable}`,
  - `workbox: {globPatterns:'**/*.{js,css,html,ico,png,svg,woff2,woff,ttf,eot}', navigateFallback:'/index.html', runtimeCaching:[{urlPattern:/\/api\//, handler:'NetworkOnly'}]}` — API asla cache’lenmez (auth sebebiyle).
  - Dev’de `server.proxy '/api' → VITE_API_PROXY || localhost:4000` (WS `ws:true` ile collab).

## Fayda

- **Kullanıcı:** Tek dokunuşla tema değişimi, ana ekrana ekle, çevrimdışıyken kabuk yüklenir, notlar yine senkronize olur.
- **Geliştirici:** Tek `index.css` değişken seti, Tailwind `theme.extend.colors: {base,surface,surface2,edge,ink,sub,accent: var(--*)}` ile tutarlı; yeni bileşen otomatik uyum sağlar.

## Sınırlamalar ve Trade-off’lar

- **Tek theme_color:** Manifest `theme_color` statik `#0c0c10` (koyu). Açık temada tarayıcı UI’ı koyu kalır — dinamik `meta theme-color` güncellenmiyor.
- **Maskable ikon:** 192/512 maskable’lar var ama adaptif ikon varyantı yok.
- **Cache stratejisi:** `NetworkOnly` API için güvenli ama çevrimdışı not okuma yok — notlar memory’de tutulduğu için offline’da sadece kabuk görülür.
