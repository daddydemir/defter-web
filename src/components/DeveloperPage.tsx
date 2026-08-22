import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { DevMetrics, DevEndpointStat } from '../types'
import { cn } from '../lib/format'
import { DailyBarChart, fillDays } from './DailyBarChart'
import {
  Activity,
  FileText,
  ListTree,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Terminal,
  UsersRound,
} from 'lucide-react'

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/30',
  POST: 'bg-blue-500/15 text-blue-600 ring-blue-500/30',
  PUT: 'bg-amber-500/15 text-amber-600 ring-amber-500/30',
  PATCH: 'bg-amber-500/15 text-amber-600 ring-amber-500/30',
  DELETE: 'bg-red-500/15 text-red-600 ring-red-500/30',
}

function methodStyle(method: string): string {
  return METHOD_STYLES[method.toUpperCase()] ?? 'bg-surface2 text-sub ring-edge'
}

export function DeveloperPage({ onLogout }: { onLogout?: () => void }) {
  const [data, setData] = useState<DevMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await api.devMetrics())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Defter | Geliştirici Paneli'
    void load()
    return () => {
      document.title = 'Defter'
    }
  }, [load])

  const endpoints = data?.endpoints ?? []
  const topEndpoints = endpoints.slice(0, 8)

  return (
    <div className="min-h-dvh bg-base text-ink">
      <header className="sticky top-0 z-20 border-b border-edge bg-base/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Terminal className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-ink">Geliştirici Paneli</h1>
            <p className="hidden truncate text-[11px] text-sub sm:block">Sistem metrikleri ve kullanım istatistikleri</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-sub transition-colors hover:bg-surface2 hover:text-ink disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Yenile
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                aria-label="Çıkış"
                title="Çıkış"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sub transition-colors hover:bg-surface2 hover:text-ink"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-6">
        {loading && !data ? (
          <div className="py-20 text-center text-sm text-sub">Yükleniyor…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>
        ) : data ? (
          <>
            {/* Özet kartlar */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Kayıtlı kullanıcı" value={data.totals.users} icon={<UsersRound className="h-4 w-4" />} />
              <StatCard label="Oluşturulan not" value={data.totals.notes} icon={<FileText className="h-4 w-4" />} />
              <StatCard label="Toplam API çağrısı" value={data.totals.apiCalls} icon={<Activity className="h-4 w-4" />} />
              <StatCard label="İzlenen endpoint" value={data.totals.endpointCount} icon={<ListTree className="h-4 w-4" />} />
            </div>

            {/* Günlük seriler */}
            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <ChartCard title="Son 30 günde üye kaydı" points={fillDays(data.daily.users, 30)} valueLabel="yeni üye" />
              <ChartCard title="Son 30 günde oluşturulan not" points={fillDays(data.daily.notes, 30)} valueLabel="not" />
              <ChartCard
                title="Son 30 günde API çağrıları"
                points={fillDays(data.daily.apiCalls, 30)}
                valueLabel="çağrı"
                className="lg:col-span-2"
              />
            </section>

            {/* Endpoint tablosu */}
            <section className="mt-6 overflow-hidden rounded-xl border border-edge bg-surface">
              <div className="flex items-center justify-between gap-3 border-b border-edge px-4 py-3">
                <h2 className="text-sm font-semibold text-ink">Endpoint çağrıları</h2>
                <span className="text-[11px] text-sub">
                  {endpoints.length.toLocaleString('tr-TR')} endpoint · toplam{' '}
                  {data.totals.apiCalls.toLocaleString('tr-TR')} çağrı
                </span>
              </div>
              {endpoints.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-sub/70">
                  Henüz metrik yok — sunucu yeniden başladıktan sonra çağrılar birikmeye başlar.
                </p>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <tbody>
                      {topEndpoints.map((e) => (
                        <EndpointRow key={`${e.method} ${e.route}`} e={e} />
                      ))}
                    </tbody>
                  </table>
                  {endpoints.length > topEndpoints.length && (
                    <details>
                      <summary className="cursor-pointer select-none border-t border-edge px-4 py-2.5 text-xs font-medium text-sub transition-colors hover:text-ink">
                        Diğer {endpoints.length - topEndpoints.length} endpoint'i göster
                      </summary>
                      <table className="w-full border-t border-edge text-sm">
                        <tbody>
                          {endpoints.slice(topEndpoints.length).map((e) => (
                            <EndpointRow key={`${e.method} ${e.route}`} e={e} />
                          ))}
                        </tbody>
                      </table>
                    </details>
                  )}
                </>
              )}
            </section>

            {/* Rate limit — engellenen istekler */}
            <section className="mt-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-ink">Rate Limit — Engellenen istekler</h2>
                <span className="ml-auto text-[11px] text-sub">
                  Redis tabanlı · pencere {Math.round((data.rateLimit.config.defaults.windowMs ?? 60000) / 1000)}s
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Toplam engellenen" value={data.rateLimit.totalBlocked} icon={<ShieldAlert className="h-4 w-4" />} />
                <StatCard label="Bugün engellenen" value={data.rateLimit.todayBlocked} icon={<ShieldAlert className="h-4 w-4" />} />
              </div>

              <ChartCard
                title="Son 30 günde engellenen istek"
                points={fillDays(data.rateLimit.dailyBlocked, 30)}
                valueLabel="engellenen"
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-edge bg-surface">
                  <div className="border-b border-edge px-4 py-3 text-sm font-semibold text-ink">En çok engellenen endpoint'ler</div>
                  {data.rateLimit.topBlockedRoutes.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-sub/70">Henüz engellenen istek yok.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody>
                        {data.rateLimit.topBlockedRoutes.map((e) => (
                          <EndpointRow key={`${e.method} ${e.route}`} e={e} />
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="overflow-hidden rounded-xl border border-edge bg-surface">
                  <div className="border-b border-edge px-4 py-3 text-sm font-semibold text-ink">En çok engellenen IP'ler</div>
                  {data.rateLimit.topBlockedIps.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-sub/70">Henüz veri yok.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody>
                        {data.rateLimit.topBlockedIps.map((r) => (
                          <tr key={r.ip} className="border-b border-edge/60 last:border-b-0">
                            <td className="px-4 py-2 font-mono text-xs text-ink">{r.ip}</td>
                            <td className="w-24 px-4 py-2 text-right tabular-nums text-sub">{r.count.toLocaleString('tr-TR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <details className="overflow-hidden rounded-xl border border-edge bg-surface">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink">Aktif limit kuralları</summary>
                <div className="border-t border-edge px-4 py-3 text-xs">
                  <div className="mb-2 text-sub">
                    Varsayılan: {data.rateLimit.config.defaults.max} istek /{' '}
                    {Math.round(data.rateLimit.config.defaults.windowMs / 1000)}s (IP başına, endpoint bazlı)
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wider text-sub">
                        <th className="py-1 font-medium">Endpoint</th>
                        <th className="py-1 text-right font-medium">Limit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-edge/60">
                      {Object.entries(data.rateLimit.config.overrides).map(([k, v]) => (
                        <tr key={k}>
                          <td className="py-1.5 font-mono text-ink">{k}</td>
                          <td className="py-1.5 text-right tabular-nums text-sub">
                            {v.max} / {Math.round(v.windowMs / 1000)}s
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>

            <p className="mt-4 text-[11px] leading-relaxed text-sub/70">
              Metrikler sunucuda 30 saniyelik pencerelerle biriktirilip veritabanına yazılır; günlük toplamlar
              (method, route, gün) bazında saklanır. Rate limit sayaçları Redis'te tutulur, engellenen istekler günlük olarak
              veritabanına aktarılır.
            </p>
          </>
        ) : null}
      </main>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-edge bg-surface p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-sub">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-ink">
        {value.toLocaleString('tr-TR')}
      </p>
    </div>
  )
}

function ChartCard({
  title,
  points,
  valueLabel,
  className,
}: {
  title: string
  points: { day: string; views: number }[]
  valueLabel: string
  className?: string
}) {
  const total = points.reduce((a, p) => a + p.views, 0)
  return (
    <div className={cn('rounded-xl border border-edge bg-surface p-4 sm:p-5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <span className="shrink-0 text-xs tabular-nums text-sub">toplam {total.toLocaleString('tr-TR')}</span>
      </div>
      <div className="mt-4">
        <DailyBarChart points={points} valueLabel={valueLabel} />
      </div>
    </div>
  )
}

function EndpointRow({ e }: { e: DevEndpointStat }) {
  return (
    <tr className="border-b border-edge/60 last:border-b-0">
      <td className="w-16 py-2 pl-4 align-middle sm:w-20">
        <span
          className={cn(
            'inline-flex min-w-14 justify-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1',
            methodStyle(e.method),
          )}
        >
          {e.method.toUpperCase()}
        </span>
      </td>
      <td className="py-2 pr-4 font-mono text-xs text-ink">{e.route || '(kök)'}</td>
      <td className="w-28 py-2 pr-4 text-right align-middle tabular-nums text-sub">
        {e.count.toLocaleString('tr-TR')}
      </td>
    </tr>
  )
}
