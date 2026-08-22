# QR Kod ile Giriş

## Ne Yapar

Masaüstünde giriş ekranında QR üretme ve PWA’da kamera ile tarayıp onaylayarak başka cihazda oturum açma. Fiziksel ekran erişimi = yetkilendirme.

## Neden Eklendi

Klavyesi kısıtlı cihazlarda (TV, ortak PC) parola yazmak zor ve güvensiz. Telefon zaten giriş yapmışken, 3 dakikalık tek kullanımlık QR ile saniyeler içinde masaüstü oturumu açmak hem hızlı hem de parola tekrarını önler.

## Nasıl Çalışır

- **Oluşturma (`POST /api/auth/pair/start`, public, 10/dk/IP):** `randomBytes(32).base64url` ham kod, DB’de sadece `SHA256(code)` saklanır, `expires_at = now+3m`, `status=pending`. Eski kayıtlar `expires_at < now-10m` temizlenir. Yanıt `{code, expiresIn:180}`.
- **Bekleme (`GET /api/auth/pair/wait?code`, public, 30/dk/IP):** `pending` → `{status:'pending'}`; `approved` → atomik `UPDATE status=completed RETURNING approved_by` → `signToken` + `toPublicUser` ve `auth_logs` (`qr-pair`). `expired`→410, `completed`→410, `invalid`→404.
- **Bilgi (`GET /api/auth/pair/info?code`, requireAuth, 30/dk/IP):** Onay ekranında `createdAt, expiresAt, deviceUa` gösterilir; sadece `pending` ise döner.
- **Onay (`POST /api/auth/pair/approve {code}`, requireAuth, 20/dk/IP):** `UPDATE status=approved, approved_by=me WHERE code_hash AND pending AND expires>now()`.
- **İstemci akışı:**
  - *Masaüstü (bekleyen):* `AuthScreen` → `QrLoginPanel` → `pairStart` → `QRCode.toDataURL(origin + '/pair?code=' + code)` (260px) → geri sayım `mm:ss` + pulse → `pairWait` her 2.5 sn poll → `approved` gelince `onAuthed(token,user)` ile doğrudan giriş.
  - *Telefon (onaylayan):* Giriş yapmış PWA → `Sidebar` “QR Tara” → `QrScannerDialog` (full-screen `z-[70]`, `getUserMedia({facingMode:environment})`, canvas → `jsQR` ile decode, URL’den `?code` veya ham kod) → `setPairCode` → `/pair?code=...` → `PairApprovePage` → `pairInfo` → Onayla → `pairApprove` → success Check + `onDone` (history replace `/`) → masaüstü poll’ü token’ı alır.
  - Giriş yapmamışken `/pair?code`’a gelen cihaz “önce giriş yapmalısın” kartı görür; girişten sonra URL korunduğu için onay ekranına otomatik geçer.

## Fayda

- **Kullanıcı:** Parola yazmadan, 2 dokunuşla diğer cihazda oturum; PWA içinde veya sistem kamerasıyla tarama.
- **Geliştirici:** Tek tablo (`pair_logins`), hash’li kod, kısa TTL ve tek kullanımlık teslim ile güvenli; harici servis yok.

## Sınırlamalar ve Trade-off’lar

- **TTL kısa:** 3 dk içinde onaylanmazsa QR expire olur — yenile gerekir. Güvenlik için bilinçli.
- **Tek cihaz:** Bir kod bir oturum açar; çoklu cihaz için yeni QR üretilir.
- **Kamera izni:** PWA tarayıcı `getUserMedia` için HTTPS ve izin ister; desteklemeyen tarayıcıda sistem kamerasıyla URL açma fallback’i var.
