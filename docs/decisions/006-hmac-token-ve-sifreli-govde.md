# ADR 006 — HMAC Token ve İsteğe Bağlı Şifreli Gövde

- **Durum:** Accepted
- **Tarih:** 2025-07

## Bağlam

Kimlik doğrulama stateless olmalı, ancak dış IDP (Auth0 vb.) eklenmek istenmiyor. Ayrıca login/register payload’ı MITM’de düz metin görünmemeli.

## Karar

- **Token:** `base64url({uid,exp}).HMAC-SHA256(payload, AUTH_SECRET)` — 30 gün TTL, `Authorization: Bearer` ile taşınır. Doğrulama `timingSafeEqual` ile yapılır.
- **Şifreli gövde:** İstemci `GET /api/auth/public-key` ile RSA public key alır, rastgele AES-128-GCM anahtarı üretir, gövdeyi AES ile şifreler, anahtarı RSA-OAEP-SHA256 ile sarar → `{enc:{wrappedKey,iv,data}}`. Sunucu `privateDecrypt` + `createDecipheriv` ile açar; `enc` yoksa düz JSON kabul edilir.

## Gerekçe

- **HMAC token:** JWT kütüphanesi olmadan, tek `AUTH_SECRET` ile stateless; `exp` payload içinde, DB lookup sadece `users` satırı için (ban kontrolü). Refresh akışı yok — 30 gün tek parça, istemci `api.me()` ile tazeler.
- **Şifreli gövde:** TLS zaten var ama ek katman, özellikle paylaşımlı ağlarda parolanın düz görünmesini engeller. `canEncrypt()` desteklemeyen istemci düz metne düşer — geriye uyum korunur.

Alternatifler elendi: Standart JWT (kütüphane + `kid` yönetimi ek yük), pure TLS’e güvenme (ek gizlilik isteniyordu).

## Sonuçlar

- **Olumlu:** Bağımlılıksız, denetimi kolay; şifreleme opsiyonel olduğu için eski istemciler kırılmaz.
- **Olumsuz:** Token yenileme yok — 30 gün sonunda tekrar login gerekir. RSA key rotasyonu manuel (yeni `crypto-keys.ts` üretimi).
