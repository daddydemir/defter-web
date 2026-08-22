# Kimlik Doğrulama

## Ne Yapar

Kayıt, giriş, token doğrulama, parola değiştirme ve kendi giriş kayıtlarını görme. İsteğe bağlı olarak istemci tarafı RSA+AES şifreleme ve Cloudflare Turnstile bot koruması ile güçlendirilmiştir.

## Neden Eklendi

Notlar kişiseldir; yetkisiz erişim ve botla hesap oluşturma doğrudan veri güvenliği ve maliyeti etkiler. Aynı anda hem gizliliği (MITM’e karşı şifreleme) hem de otomasyon direncini (captcha + rate limit) sağlamak gerekti.

## Nasıl Çalışır

- **Parola:** `scryptSync(salt 16 hex, 64 byte)` → `salt:hash` hex. `timingSafeEqual` ile doğrulama.
- **Token:** `base64url({uid,exp}).HMAC-SHA256(payload, AUTH_SECRET)` — 30 gün TTL. `Authorization: Bearer <token>` ile `requireAuth` her istekte `users` satırını çeker, `banned_at` ise 403 `Hesabınız engellendi`.
- **Şifreli gövde:** İstemci `GET /api/auth/public-key` ile RSA public key alır, AES-128-GCM anahtarı üretir, gövdeyi AES ile şifreler, anahtarı RSA-OAEP-SHA256 ile sarar → `{enc:{wrappedKey,iv,data}}`. Sunucu `privateDecrypt` + `createDecipheriv` ile açar; `enc` yoksa düz JSON kabul edilir (geriye uyum).
- **Kayıt (`POST /api/auth/register`):** `username` 3-20 `^[a-zA-Z0-9_]+$`, `email` regex, `password ≥8`. `email` veya `lower(username)` çakışması 400. `INSERT ... RETURNING id,email,username,is_admin,is_developer`. `auth_logs`’a `identifier=email, success=true`.
- **Giriş (`POST /api/auth/login`):** `email` alanı e-posta **veya** kullanıcı adı (lower) olarak aranır (`WHERE email=$1 OR lower(username)=$1`). `verifyPassword`, `banned_at` kontrolü, `auth_logs` her denemede yazılır.
- **Turnstile:** `TURNSTILE_SECRET` set ise `captchaToken` zorunlu; `POST challenges.cloudflare.com/turnstile/v0/siteverify` ile doğrulanır, başarısızsa 400 `Captcha doğrulaması başarısız`. Set değilse dev modunda atlanır (warn once).
- **Diğer:** `GET /api/auth/me` (token tazeleme), `GET /api/auth/me/logs` (son 50), `PATCH /api/auth/me/password` (mevcut parola doğrulaması).

## Fayda

- **Kullanıcı:** E-posta veya kullanıcı adıyla giriş, şifreler asla düz metin tutulmaz, botlar captcha’da elenir.
- **Geliştirici:** Dış IDP bağımlılığı yok; şifreleme ve captcha feature flag ile aç/kapa.

## Sınırlamalar ve Trade-off’lar

- **Özel token formatı:** Standart JWT değil, kütüphane bağımsız HMAC — yenileme (refresh) akışı yok, 30 gün tek parça.
- **Şifreleme opsiyonel:** `enc` yoksa düz metin kabul edilir; tam gizlilik için istemcinin desteklemesi gerekir.
- **Captcha telafisi:** Turnstile başarısızlığında otomatik retry yok; kullanıcı widget’ı manuel yeniler.
