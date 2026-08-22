# Geliştirme Rehberi

## Kod Düzeni

```
backend/src/
  index.ts        → Fastify bootstrap + runMigrations()
  app.ts          → buildApp() — hook ve route kayıtları
  auth.ts         → token, scrypt, Turnstile, pair login, decryptPayload
  db.ts           → pg Pool
  redis.ts        → ioredis singleton (lazyConnect)
  rateLimit.ts    → preHandler rate limit + flush
  metrics.ts      → onResponse endpoint metrik buffer
  collab.ts       → /api/collab WS upgrade (Yjs)
  limits.ts       → settings + per-user limit çözümleme
  routes/{notes,folders,tags,friends,admin,analytics,dev,public}.ts
  migrations/*.sql
frontend/src/
  App.tsx         → view-state routing, role gate
  api.ts          → fetch sarmalayıcı + secureBody
  types.ts        → tüm DTO’lar
  lib/{auth,crypto,format,clipboard} 
  components/{AuthScreen,Editor,RichEditor,Sidebar,AdminPage,DeveloperPage,
              ShareAnalyticsPage,PairApprovePage,QrScannerDialog,DailyBarChart}
  index.css       → :root/.dark değişkenleri + TipTap/Markdown stilleri
```

## Komutlar

```bash
# Backend
npm run dev        # tsx watch
npm run build      # tsc + migrations kopyalama
npm run typecheck  # tsc --noEmit

# Frontend
npm run dev        # vite :5173
npm run build      # tsc --noEmit && vite build
npm run typecheck
```

## Yeni Endpoint Eklemek

1. `backend/src/routes/<alan>.ts` içinde `app.get|post|patch|delete('/path', {preValidation: requireAuth}, handler)` ekle.
2. `src/app.ts`’te `app.register(<routes>, {prefix:'/api/<alan>'})` ile kaydet.
3. `frontend/src/api.ts`’a metod, `frontend/src/types.ts`’a DTO ekle.
4. `docs/api/openapi.yaml`’a operation ekle (summary, tags, examples).

## Stil Kuralları

- Türkçe UI metinleri, kod ve yorumlarda İngilizce teknik terimler serbest.
- Tailwind sınıfları `cn()` ile birleştirilir; renkler `var(--*)` üzerinden (`bg-surface`, `text-ink` …).
- Commit mesajları kısa, emir kipi: `Add QR login: ...`, `Fix admin header`.

## Test İpuçları

- Autosave: `SAVE_IDLE_MS` ve `SAVE_MAX_WAIT_MS` ile oyna, Network sekmesinde PATCH sıklığını gözle.
- Rate limit: `for i in {1..10}; do curl -X POST /api/auth/login ...; done` → `429` + `Retry-After` bekle.
- Turnstile dev modunda atlanır; prod testi için test sitekey `1x00000000000000000000AA` kullan.

