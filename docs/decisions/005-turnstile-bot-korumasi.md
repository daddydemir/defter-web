# ADR 005 — Bot Koruması İçin Cloudflare Turnstile

- **Durum:** Accepted
- **Tarih:** 2025-08

## Bağlam

`POST /api/auth/login` ve `register` botla hesap oluşturma ve kaba kuvvet denemelerine açık. Rate limit tek başına yetmez; insan doğrulaması gerekir ancak Google reCAPTCHA gizlilik ve UX açısından zayıf.

## Karar

Bot koruması `Cloudflare Turnstile` ile yapılacak. Frontend’de `@marsidev/react-turnstile` widget’ı (`siteKey = VITE_TURNSTILE_SITEKEY`), backend’de `TURNSTILE_SECRET` ile `POST challenges.cloudflare.com/turnstile/v0/siteverify` doğrulaması. Env’ler boşsa captcha atlanır (dev modu, tek satır warn).

## Gerekçe

- **Gizlilik ve UX:** Turnstile çoğu durumda görünmez/interaction-only çalışır, çerez takibi yapmaz; reCAPTCHA’ya göre daha hafif ve GDPR dostudur.
- **Feature flag:** `TURNSTILE_SECRET` yoksa atlama sayesinde yerel geliştirme ve testler anahtarsız çalışmaya devam eder; prod’da anahtarlar `docker-compose` build arg (`VITE_TURNSTILE_SITEKEY`) ve runtime env (`TURNSTILE_SECRET`) ile enjekte edilir.
- **Uyum:** Şifreli gövdede `captchaToken` de şifrelenir, sunucu `decryptPayload` sonrası doğrular — ek endpoint veya akış gerekmez.

Alternatifler elendi: hCaptcha — benzer ama Cloudflare ekosisteminde zaten barınılıyor; özel math captcha — bakım maliyeti ve kırılabilirliği yüksek.

## Sonuçlar

- **Olumlu:** Login/register bot trafiği büyük ölçüde elenir, normal kullanıcı ek adım görmez; Docker build’de sitekey gömülür, secret runtime’da kalır.
- **Olumsuz:** Turnstile script’i ek bir dış bağımlılık; engellendiğinde (adblock) kullanıcı widget’ı göremez — fallback olarak rate limit ve manuel yenileme var.
