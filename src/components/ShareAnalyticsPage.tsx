import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { DailyViewsPoint, ShareAnalytics } from '../types'
import { cn, timeAgo } from '../lib/format'
import { copyText } from '../lib/clipboard'
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  Copy,
  Eye,
  ExternalLink,
  FileText,
  RefreshCw,
  UsersRound,
} from 'lucide-react'

const RANGES = [
  { days: 7, label: '7 gün' },
  { days: 30, label: '30 gün' },
  { days: 90, label: '90 gün' },
] as const

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Sunucu bazı günleri atlayabilir (görüntülenme olmayan günler); grafiği kesintisiz diziye çevirir
function fillDays(raw: DailyViewsPoint[], days: number): DailyViewsPoint[] {
  const map = new Map(raw.map((p) => [p.day.slice(0, 10), p.views]))
  const out: DailyViewsPoint[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = dayKey(d)
    out.push({ day: key, views: map.get(key) ?? 0 })
  }
  return out
}

function fmtDay(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

export function ShareAnalyticsPage({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<ShareAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null) // null = tümü
  const [rangeDays, setRangeDays] = useState<number>(30)
  const [series, setSeries] = useState<DailyViewsPoint[]>([])
  const [seriesLoading, setSeriesLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await api.analytics()
      setData(d)
      setSelectedId((cur) => (cur && d.notes.some((n) => n.noteId === cur) ? cur : null))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Seçime ve aralığa göre günlük seriyi getir
  useEffect(() => {
    if (!data) return
    let cancelled = false

    if (selectedId === null) {
      // Tümü: sunucunun özet 30 günlük serisi
      setSeries(fillDays(data.daily, 30))
      return
    }

    setSeriesLoading(true)
    api
      .analyticsNoteDaily(selectedId, rangeDays)
      .then((points) => {
        if (!cancelled) setSeries(fillDays(points, rangeDays))
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message)
      })
      .finally(() => {
        if (!cancelled) setSeriesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [data, selectedId, rangeDays])

  const selectedNote = useMemo(
    () => data?.notes.find((n) => n.noteId === selectedId) ?? null,
    [data, selectedId],
  )
  const rangeTotal = useMemo(() => series.reduce((a, p) => a + p.views, 0), [series])

  return (
    <div className="min-h-dvh bg-base text-ink">
      <header className="sticky top-0 z-20 border-b border-edge bg-base/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            onClick={onClose}
            className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sub transition-colors hover:bg-surface2 hover:text-ink"
            aria-label="Geri"
            title="Geri"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
              <BarChart3 className="h-4 w-4 text-accent" />
              Paylaşım Analizi
            </h1>
            <p className="hidden truncate text-[11px] text-sub sm:block">
              Herkese açık notlarının görüntülenme istatistikleri
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="ml-auto flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-sub transition-colors hover:bg-surface2 hover:text-ink disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Yenile
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-6">
        {loading ? (
          <div className="py-16 text-center text-sm text-sub">Yükleniyor…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>
        ) : !data || data.notes.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Özet kartları */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Toplam görüntülenme" value={data.totalViews} icon={<Eye className="h-4 w-4" />} />
              <StatCard label="Bugün" value={data.todayViews} icon={<CalendarDays className="h-4 w-4" />} />
              <StatCard label="Tekil IP" value={data.totalUniqueIps} icon={<UsersRound className="h-4 w-4" />} />
              <StatCard label="Paylaşımlı not" value={data.notes.length} icon={<FileText className="h-4 w-4" />} />
            </div>

            <div className="mt-5 flex flex-col gap-5 lg:flex-row">
              {/* Not listesi */}
              <section className="shrink-0 lg:w-80">
                <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-widest text-sub/70">
                  Paylaşımlı notlar
                </h2>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedId(null)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
                      selectedId === null ? 'border-accent bg-surface2' : 'border-edge bg-surface hover:bg-surface2/60',
                    )}
                  >
                    <BarChart3 className="h-4 w-4 shrink-0 text-accent" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">Tümü</span>
                    <span className="shrink-0 text-xs tabular-nums text-sub">{data.totalViews.toLocaleString('tr-TR')}</span>
                  </button>
                  {data.notes.map((n) => (
                    <NoteRow
                      key={n.noteId}
                      note={n}
                      active={selectedId === n.noteId}
                      onSelect={() => setSelectedId(n.noteId)}
                    />
                  ))}
                </div>
              </section>

              {/* Grafik */}
              <section className="min-w-0 flex-1 rounded-xl border border-edge bg-surface p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                    {selectedNote ? selectedNote.title.trim() || 'Başlıksız' : 'Tüm paylaşımlar'}
                  </h2>
                  {selectedId !== null && (
                    <div className="flex items-center gap-0.5 rounded-lg bg-surface2 p-0.5 ring-1 ring-edge">
                      {RANGES.map((r) => (
                        <button
                          key={r.days}
                          onClick={() => setRangeDays(r.days)}
                          className={cn(
                            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                            rangeDays === r.days ? 'bg-surface text-ink shadow-sm' : 'text-sub hover:text-ink',
                          )}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 min-h-56">
                  {seriesLoading ? (
                    <div className="py-16 text-center text-sm text-sub">Yükleniyor…</div>
                  ) : series.length > 0 ? (
                    <DailyChart points={series} />
                  ) : (
                    <div className="py-16 text-center text-sm text-sub/70">Veri yok</div>
                  )}
                </div>

                <p className="mt-3 text-xs text-sub">
                  Bu aralıkta toplam <span className="font-semibold text-ink">{rangeTotal.toLocaleString('tr-TR')}</span>{' '}
                  görüntülenme · günlük kırılım (sunucu saati)
                  {selectedId === null && ' · “Tümü” için son 30 gün gösterilir'}
                </p>
                {selectedNote && (
                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-edge pt-4 text-xs sm:grid-cols-3">
                    <Detail label="Bu notun toplamı" value={selectedNote.viewCount.toLocaleString('tr-TR')} />
                    <Detail label="Tekil IP" value={selectedNote.uniqueIpCount.toLocaleString('tr-TR')} />
                    <Detail
                      label="Son görüntülenme"
                      value={selectedNote.lastViewAt ? timeAgo(selectedNote.lastViewAt) : '—'}
                    />
                  </dl>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-edge px-6 py-16 text-center">
      <BarChart3 className="mx-auto h-10 w-10 text-sub/40" />
      <p className="mt-4 text-sm font-medium text-ink">Henüz paylaşımlı notunuz yok</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-sub">
        Bir notu paylaşmak için editördeki <span className="font-medium text-ink">Paylaş</span> düğmesini kullanın;
        herkese açık bağlantının görüntülenmeleri burada listelenir.
      </p>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sub">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  )
}

function NoteRow({
  note,
  active,
  onSelect,
}: {
  note: ShareAnalytics['notes'][number]
  active: boolean
  onSelect: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    if (await copyText(`${window.location.origin}/share/${note.shareToken}`)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-lg border transition-colors',
        active ? 'border-accent bg-surface2' : 'border-edge bg-surface hover:bg-surface2/60',
      )}
    >
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left">
        <FileText className="h-4 w-4 shrink-0 text-sub" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{note.title.trim() || 'Başlıksız'}</span>
          <span className="block text-[11px] text-sub">
            {note.lastViewAt ? `son ${timeAgo(note.lastViewAt)}` : 'henüz görüntülenmedi'}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-surface2 px-2 py-0.5 text-[11px] font-medium tabular-nums text-sub ring-1 ring-edge">
          {note.viewCount.toLocaleString('tr-TR')}
        </span>
      </button>
      <div className="mr-1.5 flex shrink-0 items-center">
        <a
          href={`/share/${note.shareToken}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label="Paylaşımı aç"
          title="Paylaşımı aç"
          className="hidden h-8 w-8 items-center justify-center rounded-md text-sub transition-colors hover:bg-surface hover:text-ink group-hover:flex"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          onClick={(e) => {
            e.stopPropagation()
            void copyLink()
          }}
          aria-label="Bağlantıyı kopyala"
          title="Bağlantıyı kopyala"
          className="hidden h-8 w-8 items-center justify-center rounded-md text-sub transition-colors hover:bg-surface hover:text-ink group-hover:flex"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

function DailyChart({ points }: { points: DailyViewsPoint[] }) {
  const W = 640
  const H = 210
  const padB = 26
  const padT = 12
  const plotH = H - padB - padT
  const max = Math.max(1, ...points.map((p) => p.views))
  const n = Math.max(points.length, 1)
  const step = W / n
  const bw = Math.max(3, Math.min(30, step * 0.7))
  const labelEvery = Math.ceil(n / 6)

  const niceMax = max <= 5 ? max : Math.ceil(max / 4) * 4

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label="Günlük görüntülenme grafiği">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={0}
          x2={W}
          y1={padT + plotH * (1 - f)}
          y2={padT + plotH * (1 - f)}
          stroke="var(--border)"
          strokeDasharray="3 5"
          strokeWidth={1}
        />
      ))}
      {[niceMax, Math.round(niceMax / 2)].map((v) =>
        v > 0 ? (
          <text
            key={v}
            x={W}
            y={padT + plotH * (1 - v / niceMax) - 3}
            textAnchor="end"
            fontSize={9}
            fill="var(--text-secondary)"
            opacity={0.8}
          >
            {v}
          </text>
        ) : null,
      )}
      {points.map((p, i) => {
        const hasViews = p.views > 0
        const barH = hasViews ? Math.max(3, (p.views / max) * plotH) : 2
        const x = i * step + (step - bw) / 2
        const y = H - padB - barH
        return (
          <g key={p.day}>
            <rect
              x={x}
              y={y}
              width={bw}
              height={barH}
              rx={Math.min(3, bw / 2)}
              className={hasViews ? 'fill-accent' : 'fill-edge'}
              opacity={hasViews ? 0.9 : 1}
            >
              <title>{`${fmtDay(p.day)}: ${p.views.toLocaleString('tr-TR')} görüntülenme`}</title>
            </rect>
            {(i % labelEvery === 0 || i === n - 1) && (
              <text
                x={x + bw / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize={10}
                fill="var(--text-secondary)"
              >
                {fmtDay(p.day)}
              </text>
            )}
          </g>
        )
      })}
      <line x1={0} x2={W} y1={padT + plotH} y2={padT + plotH} stroke="var(--border)" strokeWidth={1} />
    </svg>
  )
}
