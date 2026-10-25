import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/lib/utils'

export interface ChartSeries {
  label: string
  /** màu hex — đủ tương phản trên cả 2 theme vì vẽ trên nền surface đặc */
  color: string
  /** point tăng dần theo x (epoch ms) — khớp định dạng `bucket_ms` backend */
  data: Array<{ x: number; y: number | null }>
}

interface LineChartProps {
  title: string
  series: ChartSeries[]
  height?: number
  formatY?: (v: number) => string
  formatX?: (ms: number) => string
  className?: string
}

const defaultFormatY = (v: number) => (Math.abs(v) >= 1000 ? v.toLocaleString('vi-VN') : String(Math.round(v * 100) / 100))
const defaultFormatX = (ms: number) => new Date(ms).toLocaleString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })

/** điểm gần x nhất trong chuỗi đã sắp xếp tăng dần (binary search, kể cả khi chart khác nhịp bucket) */
const nearestPoint = (data: ChartSeries['data'], xMs: number) => {
  if (!data.length) return null
  let lo = 0
  let hi = data.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (data[mid].x < xMs) lo = mid + 1
    else hi = mid
  }
  const a = data[lo]
  const b = data[Math.max(0, lo - 1)]
  const pick = Math.abs(a.x - xMs) <= Math.abs(b.x - xMs) ? a : b
  return pick.y === null || !Number.isFinite(pick.y) ? null : pick
}

/**
 * Line chart SVG siêu nhẹ, không dependency.
 * - Điểm `y = null` (server chưa gửi đủ record) → ngắt đoạn, không vẽ 0 giả.
 * - Hover: guide dọc + chấm tại bucket gần con trỏ nhất + tooltip giá trị từng series.
 * - Text nằm ngoài SVG (HTML) để không bị méo khi responsive.
 */
export const LineChart = ({ title, series, height = 160, formatY = defaultFormatY, formatX = defaultFormatX, className }: LineChartProps) => {
  const { paths, area, yMin, yMax, xMin, xMax, spanX, hasData } = useMemo(() => {
    const all = series.flatMap((s) => s.data.map((p) => p.y)).filter((v): v is number => v !== null && Number.isFinite(v))
    const xs = series.flatMap((s) => s.data.map((p) => p.x))
    if (!all.length || !xs.length)
      return { paths: [], area: '', yMin: 0, yMax: 1, xMin: 0, xMax: 1, spanX: 1, hasData: false }

    let lo = Math.min(...all)
    let hi = Math.max(...all)
    if (lo === hi) {
      lo -= 1
      hi += 1
    }
    const pad = (hi - lo) * 0.08
    lo -= pad
    hi += pad

    const x0 = Math.min(...xs)
    const x1 = Math.max(...xs)
    const sX = x1 - x0 || 1

    const scale = (p: { x: number; y: number | null }) => ({
      px: ((p.x - x0) / sX) * 100,
      py: 100 - ((p.y! - lo) / (hi - lo)) * 100,
    })

    const paths = series.map((s) => {
      // ngắt segment tại chỗ có null
      const segments: string[] = []
      let current: string[] = []
      for (const p of s.data) {
        if (p.y === null || !Number.isFinite(p.y)) {
          if (current.length > 1) segments.push(`M${current.join('L')}`)
          current = []
          continue
        }
        const { px, py } = scale(p)
        current.push(`${px.toFixed(2)},${py.toFixed(2)}`)
      }
      if (current.length > 1) segments.push(`M${current.join('L')}`)
      return { label: s.label, color: s.color, d: segments.join(' ') }
    })

    const first = series[0]?.data.filter((p) => p.y !== null) ?? []
    let areaPath = ''
    if (first.length > 1) {
      const pts = first.map((p) => {
        const { px, py } = scale(p)
        return `${px.toFixed(2)},${py.toFixed(2)}`
      })
      areaPath = `M${pts.join('L')}L100,100L0,100Z`
    }

    return { paths, area: areaPath, yMin: lo, yMax: hi, xMin: x0, xMax: x1, spanX: sX, hasData: true }
  }, [series])

  const plotRef = useRef<HTMLDivElement>(null)
  const [hoverPct, setHoverPct] = useState<number | null>(null)

  const scaleY = (y: number) => 100 - ((y - yMin) / (yMax - yMin)) * 100

  const hover = useMemo(() => {
    if (hoverPct == null || !hasData) return null
    const xMs = xMin + (hoverPct / 100) * spanX
    const entries = series
      .map((s) => ({ series: s, point: nearestPoint(s.data, xMs) }))
      .filter((e): e is { series: ChartSeries; point: { x: number; y: number } } => e.point !== null)
    if (!entries.length) return null
    // guide dọc snap theo bucket của series đầu để không lệch khỏi điểm dữ liệu
    const snapX = Math.max(0, Math.min(100, ((entries[0].point.x - xMin) / spanX) * 100))
    return { xMs: entries[0].point.x, snapX, entries }
  }, [hoverPct, hasData, series, xMin, spanX])

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = plotRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    setHoverPct(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)))
  }

  const tipFlip = hover ? hover.snapX > 62 : false

  return (
    <div className={cn('rounded-2xl border border-border-c bg-surface p-4', className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-fg">{title}</h3>
        <div className="flex flex-wrap gap-3">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {hasData ? (
        <div className="relative" style={{ height }}>
          {/* nhãn trục Y */}
          <span className="absolute left-0 top-0 text-[10px] tabular-nums text-muted">{formatY(yMax)}</span>
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-muted">
            {formatY((yMin + yMax) / 2)}
          </span>
          <span className="absolute bottom-4 left-0 text-[10px] tabular-nums text-muted">{formatY(yMin)}</span>

          <div className="absolute inset-y-0 left-12 right-0">
            <div ref={plotRef} className="relative h-[calc(100%-1rem)] touch-none select-none" onPointerMove={onMove} onPointerLeave={() => setHoverPct(null)}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
                <line x1="0" y1="0" x2="100" y2="0" stroke="var(--border)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="var(--border)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="100" x2="100" y2="100" stroke="var(--border)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
                {area && <path d={area} fill={series[0]?.color} opacity={0.1} />}
                {paths.map((p) => (
                  <path
                    key={p.label}
                    d={p.d}
                    fill="none"
                    stroke={p.color}
                    strokeWidth="1.6"
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
                {hover && (
                  <line
                    x1={hover.snapX}
                    y1="0"
                    x2={hover.snapX}
                    y2="100"
                    stroke="var(--muted, #94a3b8)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>

              {/* chấm tại điểm hover (HTML để không bị méo theo viewBox) */}
              {hover &&
                hover.entries.map((en) => (
                  <span
                    key={en.series.label}
                    aria-hidden
                    className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--bg)]"
                    style={{ left: `${hover.snapX}%`, top: `${scaleY(en.point.y)}%`, background: en.series.color }}
                  />
                ))}

              {/* tooltip */}
              {hover && (
                <div
                  className={cn(
                    'pointer-events-none absolute top-1 z-10 min-w-[150px] rounded-xl border border-border-c bg-surface-2/95 px-3 py-2 shadow-lg backdrop-blur',
                    tipFlip ? 'right-auto' : 'left-auto',
                  )}
                  style={{ left: `${hover.snapX}%`, transform: tipFlip ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)' }}
                >
                  <p className="mb-1 text-[10px] font-semibold tabular-nums text-muted">{formatX(hover.xMs)}</p>
                  <ul className="space-y-0.5">
                    {hover.entries.map((en) => (
                      <li key={en.series.label} className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex items-center gap-1.5 text-muted">
                          <span className="h-2 w-2 rounded-full" style={{ background: en.series.color }} />
                          {en.series.label}
                        </span>
                        <b className="tabular-nums text-fg">{formatY(en.point.y)}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-between pt-1 text-[10px] tabular-nums text-muted">
              <span>{formatX(xMin)}</span>
              <span>{formatX((xMin + xMax) / 2)}</span>
              <span>{formatX(xMax)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>
          Chưa có dữ liệu — server có thể đang offline hoặc agent chưa gửi.
        </div>
      )}
    </div>
  )
}

export default LineChart
