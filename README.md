# defter-web — Notes (frontend)

> Bu depo, Notes uygulamasının **frontend** kısmını içerir (React + TypeScript + Vite + Tailwind).
> Backend (`defter-api`) ayrı depodadır.

Sıfırdan geliştirilmiş, sade ve hızlı bir not alma uygulaması. Flatnotes kadar sade, Notion kadar karmaşık değil.

## Özellikler

- Not oluşturma, düzenleme, silme (otomatik kayıt)
- **Kullanıcı sistemi**: kayıt/giriş, her kullanıcı yalnızca kendi notlarını, klasörlerini ve etiketlerini görür
- Klasör ve etiket ile organize etme (notları klasöre taşıma dahil)
- Başlık + içerik araması (anlık, debounce'lu)
- Markdown desteği: düzenleme / bölünmüş görünüm (split) / önizleme
- **LaTeX (KaTeX)**: inline `$...$` ve blok `$$...$$` — canlı önizlemede render edilir
- Favori / pinleme
- Son düzenlenenler (liste `updated_at`'e göre sıralı)
- **Eşzamanlı düzenleme** (WebSocket, collab)
- **Paylaşım**: herkese açık bağlantı + arkadaşlarla paylaşım
- Temiz, minimal, koyu tema öncelikli arayüz (açık tema da var), özel app ikonu
- **%100 mobil-first**: drawer sidebar (swipe ile kapanır), donanım geri butonu desteği, iOS klavye/zoom sorunları çözüldü, safe-area (çentik) desteği, telefonda liste↔editör ayrı ekran deneyimi, tablette 2 bölmeli düzen
- **Güvenlik**: giriş bilgileri şifreli iletilir (AES-GCM + RSA-OAEP), kişisel giriş logları, admin paneli

## Teknolojiler

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Markdown:** react-markdown + remark-gfm + remark-math/rehype-katex (KaTeX)
- **Eşzamanlı düzenleme:** yjs + y-websocket + Tiptap
- **Dağıtım:** Tamamen Dockerize (nginx + `docker-compose`)

## LaTeX

Notlarda KaTeX ile matematik render edilir:

```markdown
Inline: $E = mc^2$

Blok:

$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
```

Blok matematik (`$$...$$`) kendi satırında yazılmalıdır. Bozuk formüller önizlemeyi kırmaz (sadece kırmızıyla işaretlenir).

## Hızlı Başlangıç (Docker)

```bash
cp .env.example .env        # ilk seferde (WEB_PORT)
./run.sh                    # veya: docker compose up --build -d
```

- Web : http://localhost:35804 (`WEB_PORT` ile değiştirilebilir)

## API Proxy'si

nginx, `/api/` isteklerini `http://api:4000` adresine iletir (SPA fallback ile).
Frontend'in çalışması için backend'in aynı Docker ağında `api:4000` üzerinde çalışması gerekir.
İstem dışı bir adres için `nginx.conf` içindeki `proxy_pass` değerini değiştirin.

## Yerel Geliştirme (Docker'sız, hot-reload)

```bash
npm install
npm run dev
```

Frontend, Vite dev proxy'si ile `/api` isteklerini backend'e iletir.

## Proje Yapısı

```
├── docker-compose.yml          # Web servisi (nginx)
├── .env                        # WEB_PORT (gitignore'da)
├── run.sh                      # tek komutla ayağa kaldıran betik
├── nginx.conf                  # SPA + /api proxy
├── public/favicon.svg          # app ikonu
└── src/
    ├── App.tsx                 # durum yönetimi, filtreleme, oturum akışı, collab
    ├── api.ts                  # API istemcisi (Bearer token, şifreli giriş)
    ├── lib/
    │   ├── auth.ts             # token/kullanıcı saklama
    │   ├── crypto.ts           # AES-GCM + RSA-OAEP şifreli giriş
    │   └── yjs.ts              # eşzamanlı düzenleme istemcisi
    ├── types.ts
    └── components/
        ├── AuthScreen.tsx      # giriş / kayıt
        ├── Sidebar.tsx         # görünümler, klasörler, etiketler, kullanıcı/çıkış
        ├── NoteList.tsx        # arama + liste (klasöre taşıma dahil)
        ├── Editor.tsx          # başlık, araçlar, markdown editör
        ├── Markdown.tsx        # react-markdown sarmalayıcı
        ├── SettingsPage.tsx    # profil / görünüm / parola / güvenlik logları
        ├── AdminPage.tsx       # admin paneli (kullanıcılar, notlar, loglar)
        ├── ShareDialog.tsx     # paylaşım ayarları
        ├── PublicNote.tsx      # /share/:token görünümü
        ├── Logo.tsx            # app ikonu (SVG)
        └── EmptyState.tsx
```

## Kısayollar

- `Cmd/Ctrl + N` — yeni not
- `Cmd/Ctrl + K` — aramaya odaklan