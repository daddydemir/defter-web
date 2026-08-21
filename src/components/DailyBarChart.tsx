import type { DailyViewsPoint } from '../types'

export function fmtDayLabel(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

// Günlük değerleri bar grafiği olarak çizer; boş günler 2px taban çubuğuyla gösterilir
export function DailyBarChart({
  points,
  valueLabel = 'görüntülenme',
}: {
  points: DailyViewsPoint[]
  valueLabel?: string
}) {
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
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label={`Günlük ${valueLabel} grafiği`}>
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
              <title>{`${fmtDayLabel(p.day)}: ${p.views.toLocaleString('tr-TR')} ${valueLabel}`}</title>
            </rect>
            {(i % labelEvery === 0 || i === n - 1) && (
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--text-secondary)">
                {fmtDayLabel(p.day)}
              </text>
            )}
          </g>
        )
      })}
      <line x1={0} x2={W} y1={padT + plotH} y2={padT + plotH} stroke="var(--border)" strokeWidth={1} />
    </svg>
  )
}

// Sunucu bazı günleri atlayabilir; grafiği kesintisiz günlük diziye çevirir
export function fillDays(raw: DailyViewsPoint[], days: number): DailyViewsPoint[] {
  const map = new Map(raw.map((p) => [p.day.slice(0, 10), p.views]))
  const out: DailyViewsPoint[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    out.push({ day: key, views: map.get(key) ?? 0 })
  }
  return out
}
