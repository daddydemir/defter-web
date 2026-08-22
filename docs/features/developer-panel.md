# Geliştirici Paneli

## Ne Yapar

Sadece `is_developer && !is_admin` kullanıcılarının gördüğü, normal uygulama yerine açılan gözlemlenebilirlik paneli. Sistem metriklerini ve rate limit bloklarını 30 günlük grafiklerle sunar.

## Neden Eklendi

Not ve kullanıcı sayısı arttığında “sistem sağlıklı mı, hangi endpoint ne kadar yük alıyor, kim engelleniyor” soruları harici APM olmadan cevaplanmalı. Developer rolü, içerik ekranını gölgelemeden operasyonel görünüm sağlar.

## Nasıl Çalışır

- **Yönlendirme (`App.tsx`):** `if (auth.user.isDeveloper && !auth.user.isAdmin) return <DeveloperPage onLogout={logout} />` — auth doğrulanır doğrulanmaz devreye girer, `document.title = Defter | Geliştirici Paneli`.
- **Veri (`GET /api/dev/metrics`, requireAuth+requireDev):** 13 paralel sorgu:
  - `totals: users, notes, publicShares, friendships, apiCalls (sum endpoint_metrics), endpointCount (distinct)`
  - `daily: users(30), notes(30), apiCalls(30)` — `dailySeries` ile boş günler 0 doldurulur.
  - `endpoints[200]` ve `rateLimit: {totalBlocked, todayBlocked, dailyBlocked[30], topBlockedRoutes[20], topBlockedIps[20], config:{defaults, overrides}}`.
- **İstemci (`DeveloperPage.tsx`):**
  - Stat kartları (Users/FileText/Activity/ListTree + ShieldAlert),
  - `DailyBarChart` + `fillDays` ile 3 grafik + rate limit grafiği,
  - Endpoint tablosu (method rozeti: GET emerald, POST blue, PATCH/PUT amber, DELETE red; mono route, count), ilk 8 + `<details>`,
  - Rate limit bölümü: engellenen toplam/bugün, günlük engel grafiği, en çok engellenen endpoint ve IP tabloları, “Aktif limit kuralları” detayında varsayılan ve override’lar.

## Fayda

- **Developer:** Kod değişmeden sistemin nabzını tutma — hangi route’a saldırı var, kim ne sıklıkla engelleniyor, günlük büyüme nasıl.
- **Yönetici:** Is_developer ataması `AdminPanel` → Terminal ikonlu “Developer yap/kaldır” ile (onay diyaloglu, engelli yapılamaz, kendine atama yasak).

## Sınırlamalar ve Trade-off’lar

- **Salt okunur:** Panel metrikleri değiştirmez, limitleri düzenlemez — ayarlar admin panelinde.
- **Gecikmeli:** Metrikler 30 sn buffer ile flush edilir, rate limit blokları da aynı pencerede birikir — gerçek zamanlı değil, 30 sn gecikmeli.
- **Rol çakışması:** `is_developer && is_admin` olan kullanıcı admin panelini görür, developer panelini değil — iki rolün aynı anda aktif izlenmesi isteniyorsa kural değiştirilmeli.
