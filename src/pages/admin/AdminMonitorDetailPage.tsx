import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useSeo } from '@/hooks/useSeo'
import {
  monitorEvents,
  monitorExceptions,
  monitorMetrics,
  monitorOnlinePlayers,
  monitorPlugins,
  monitorServerDetail,
  type ExceptionGroup,
  type Granularity,
  type MetricPoint,
  type MonitorEvent,
  type MonitorServerDetail,
  type OnlinePlayer,
} from '@/api/admin'
import { PageHeader } from '@/components/admin/blocks'
import { OnlineBadge } from '@/components/admin/badges'
import LineChart, { type ChartSeries } from '@/components/admin/LineChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'
import { fmtDateTime, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const COLORS = { blue: '#3b82f6', violet: '#8b5cf6', emerald: '#10b981', amber: '#f59e0b', red: '#ef4444' }

const RANGES = [
  { id: '1h', label: '1h', ms: 3_600_000, granularity: 'minute' as Granularity },
  { id: '24h', label: '24h', ms: 24 * 3_600_000, granularity: 'minute' as Granularity },
  { id: '7d', label: '7 ngày', ms: 7 * 24 * 3_600_000, granularity: 'hour' as Granularity },
]

export const AdminMonitorDetailPage = () => {
  const { server = '' } = useParams()
  useSeo({ title: `Quản trị — Monitor ${server} — SV AeSieuQuay`, noindex: true })

  const [rangeId, setRangeId] = useState('24h')
  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[1]

  const [detail, setDetail] = useState<MonitorServerDetail | null>(null)
  const [perf, setPerf] = useState<MetricPoint[]>([])
  const [heartbeat, setHeartbeat] = useState<MetricPoint[]>([])
  const [events, setEvents] = useState<MonitorEvent[]>([])
  const [players, setPlayers] = useState<OnlinePlayer[]>([])
  const [exceptions, setExceptions] = useState<ExceptionGroup[]>([])
  const [pluginCount, setPluginCount] = useState<number | null>(null)
  const [nowSync, setNowSync] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const aliveRef = useRef(true)

  const load = useCallback(async () => {
    setLoading(true)
    const to = Date.now()
    const from = to - range.ms
    try {
      const [d, p, h, ev, pl, exc, pg] = await Promise.all([
        monitorServerDetail(server).catch(() => null),
        monitorMetrics(server, { kind: 'perf', granularity: range.granularity, from_ms: from, to_ms: to })
          .then((r) => r?.points ?? [])
          .catch(() => []),
        monitorMetrics(server, { kind: 'heartbeat', granularity: range.granularity, from_ms: from, to_ms: to })
          .then((r) => r?.points ?? [])
          .catch(() => []),
        monitorEvents(server, { limit: 15 }).catch(() => null),
        monitorOnlinePlayers(server).catch(() => []),
        monitorExceptions(server, 5).catch(() => []),
        monitorPlugins(server).catch(() => null),
      ])
      if (!aliveRef.current) return
      setDetail(d)
      setPerf(p)
      setHeartbeat(h)
      setEvents(ev?.items ?? [])
      setPlayers(Array.isArray(pl) ? pl : [])
      setExceptions(Array.isArray(exc) ? exc : [])
      setPluginCount(Array.isArray(pg) ? pg.length : d?.counts?.plugins ?? null)
      setNowSync(to)
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [server, range.ms, range.granularity])

  useEffect(() => {
    aliveRef.current = true
    load()
    return () => {
      aliveRef.current = false
    }
  }, [load])

  const fmtX = (ms: number) =>
    range.granularity === 'minute'
      ? new Date(ms).toLocaleString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit' })
      : new Date(ms).toLocaleString('vi-VN', { hour12: false, day: '2-digit', month: '2-digit' })

  const line = (data: MetricPoint[], field: string, transform?: (v: number) => number): Array<{ x: number; y: number | null }> =>
    data.map((p) => {
      const raw = p[field]
      return { x: p.bucket_ms, y: typeof raw === 'number' && Number.isFinite(raw) ? (transform ? transform(raw) : raw) : null }
    })

  const chart = (title: string, series: ChartSeries[], formatY?: (v: number) => string) => (
    <LineChart title={title} series={series} formatY={formatY} formatX={fmtX} />
  )

  // Backend đã trả `uptime_ms` (= last_seen − started) cho boot gần nhất;
  // fallback tự tính nếu backend cũ thiếu field.
  const uptimeMs = detail?.latest_boot
    ? (detail.latest_boot.uptime_ms ?? (nowSync ? nowSync - detail.latest_boot.started_at_ms : null))
    : null

  if (loading && !detail) {
    return (
      <div className="space-y-6">
        <PageHeader title={server} />
        <div className="grid gap-4 xl:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={server}
        description={
          detail
            ? `${detail.server.heartbeat.server_impl ?? '—'} ${detail.server.heartbeat.mc_version ?? ''} · agent ${detail.server.agent?.name ?? '—'} ${detail.server.agent?.version ?? ''} · seen ${timeAgo(detail.server.last_seen_ms)}`
            : undefined
        }
        actions={
          <>
            <div className="flex rounded-xl border border-border-c bg-surface-2 p-1">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRangeId(r.id)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                    rangeId === r.id ? 'bg-primary text-white' : 'text-muted hover:text-fg',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={load}>
              Làm mới
            </Button>
            <Link to="/admin/monitor" className="text-sm font-medium text-muted hover:text-fg">
              ← Danh sách
            </Link>
          </>
        }
      />

      {detail && (
        <div className="flex flex-wrap items-center gap-3">
          <OnlineBadge online={detail.server.online} />
          {detail.latest_boot && (
            <span className="text-sm text-muted">
              Boot lúc {fmtDateTime(detail.latest_boot.started_at_ms)} · uptime{' '}
              <b className="text-fg">{uptimeMs != null ? Math.floor(uptimeMs / 3_600_000) : 0}h</b> · Java{' '}
              {detail.latest_boot.java?.version ?? '—'}
              {detail.latest_boot.os?.name ? ` · ${detail.latest_boot.os.name}` : ''}
            </span>
          )}
          <span className="text-sm text-muted">
            Samples 24h: <b className="text-fg">{detail.counts.samples_24h}</b> · Events 24h:{' '}
            <b className="text-fg">{detail.counts.events_24h}</b> · Plugins: <b className="text-fg">{pluginCount ?? '—'}</b>
          </span>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-1">
        {chart('TPS (1m)', [{ label: 'tpsbq', color: COLORS.emerald, data: line(perf, 'tps_avg') }])}
        {chart('MSPT', [
          { label: 'trung bình', color: COLORS.blue, data: line(perf, 'mspt_avg') },
          { label: 'p95', color: COLORS.violet, data: line(perf, 'mspt_p95_max') },
        ])}
        {chart(
          'CPU process',
          [{ label: '% CPU', color: COLORS.amber, data: line(perf, 'cpu_process_avg', (v) => v * 100) }],
          (v) => `${v.toFixed(0)}%`,
        )}
        {chart(
          'Heap',
          [
            { label: 'used', color: COLORS.red, data: line(perf, 'heap_used_avg', (v) => v / 1024 ** 3) },
            { label: 'sau GC', color: COLORS.blue, data: line(perf, 'heap_post_gc_avg', (v) => v / 1024 ** 3) },
          ],
          (v) => `${v.toFixed(1)}GB`,
        )}
        {chart('Người chơi online', [{ label: 'players', color: COLORS.violet, data: line(heartbeat, 'online_avg') }])}

        {/* Players đang online */}
        <Card>
          <CardHeader>
            <CardTitle>Đang online ({players.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            {players.length === 0 ? (
              <p className="text-sm text-muted">Server đang offline hoặc chưa gửi danh sách player.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)] text-sm">
                {players.map((p) => (
                  <li key={p.player_uuid} className="flex items-center justify-between py-1.5">
                    <span className="font-semibold text-fg">{p.player_name}</span>
                    <span className="text-xs text-muted">{Math.floor(p.online_s / 3600)}h{Math.floor((p.online_s % 3600) / 60)}m online</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-1">
        {/* Events */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Sự kiện gần đây</CardTitle>
            <span className="text-xs text-muted">{events.length} event · 24h</span>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto px-0 pb-0">
            {events.length === 0 ? (
              <p className="px-6 pb-4 text-sm text-muted">Chưa có event.</p>
            ) : (
              <>
                {/* Header cột (desktop) */}
                <div className="hidden grid-cols-[92px_92px_minmax(0,1fr)_auto] gap-x-3 border-b border-border-c bg-surface-2/60 px-6 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted sm:grid text-center">
                  <span>Thời gian</span>
                  <span>Loại</span>
                  <span>Người chơi / nội dung</span>
                  <span className="text-right">Đã</span>
                </div>
                <ul className="divide-y divide-[var(--border)] text-center">
                  {events.map((e) => (
                    <li
                      key={e.event_id}
                      className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-3 px-6 py-2 text-sm transition-colors hover:bg-surface-2/60 sm:grid-cols-[92px_92px_minmax(0,1fr)_auto]"
                    >
                      <time className="font-mono text-xs tabular-nums text-muted" suppressHydrationWarning>
                        {fmtClock(e.ts_ms)}
                      </time>
                      <span className="col-start-2 row-start-1 sm:col-start-2 sm:row-start-auto">
                        <EventKind kind={e.kind} />
                      </span>
                      <span className="col-span-2 min-w-0 truncate sm:col-span-1 sm:col-start-3">
                        {e.player?.name ? <b className="text-fg">{e.player.name}</b> : <span className="italic text-muted">hệ thống</span>}
                        {eventDetail(e) && (
                          <span className={cn('ml-2', e.kind === 'command' ? 'font-mono text-xs text-primary' : 'text-muted')}>
                            {eventDetail(e)}
                          </span>
                        )}
                      </span>
                      <span className="hidden shrink-0 pl-3 text-right text-xs text-muted sm:block">{timeAgo(e.ts_ms)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* Exceptions */}
        <Card>
          <CardHeader>
            <CardTitle>Exception nổi bật</CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            {exceptions.length === 0 ? (
              <p className="text-sm text-muted">Không có exception. 👍</p>
            ) : (
              <ul className="space-y-3">
                {exceptions.map((e) => (
                  <li key={`${e.source}-${e.message}`} className="rounded-xl border border-border-c bg-surface-2/50 p-3">
                    <p className="text-sm font-semibold text-fg">
                      {e.source} <span className="ml-1 rounded-full bg-red-500/10 px-2 text-xs font-bold text-red-500">×{e.count}</span>
                    </p>
                    <p className="mt-0.5 break-words font-mono text-xs text-muted">{e.message}</p>
                    <p className="mt-1 text-[11px] text-muted">lần cuối: {timeAgo(e.last_seen_ms)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const EVENT_STYLE: Record<string, { label: string; cls: string }> = {
  join: { label: 'join', cls: 'bg-emerald-500/10 text-emerald-500' },
  quit: { label: 'quit', cls: 'bg-surface-2 text-muted' },
  command: { label: 'command', cls: 'bg-primary-soft text-primary' },
  lag: { label: 'lag', cls: 'bg-amber-500/10 text-amber-500' },
  death: { label: 'death', cls: 'bg-red-500/10 text-red-500' },
  crash: { label: 'crash', cls: 'bg-red-500/10 text-red-500' },
  server_start: { label: 'start', cls: 'bg-emerald-500/10 text-emerald-500' },
  server_stop: { label: 'stop', cls: 'bg-red-500/10 text-red-500' },
}

const EventKind = ({ kind }: { kind: string }) => {
  const style = EVENT_STYLE[kind] ?? { label: kind, cls: 'bg-surface-2 text-muted' }
  return (
    <span className={cn('inline-block min-w-[72px] rounded-full px-2 py-0.5 text-center text-[11px] font-bold uppercase tracking-wide', style.cls)}>
      {style.label}
    </span>
  )
}

/** "19:40:07" — cột thời gian gọn; ngày đã có ở header 24h. */
const fmtClock = (ms: number) => {
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('vi-VN', { hour12: false })
}

/**
 * Rút nội dung hiển thị từ `event.data` (backend trả tự do theo kind).
 * Chỉ lấy chuỗi/số an toàn, cắt ngắn — không hiển thị object thô.
 */
const eventDetail = (e: MonitorEvent): string | null => {
  const d = e.data ?? {}
  const str = (k: string) => {
    const v = d[k]
    return typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null
  }
  let out: string | null = null
  switch (e.kind) {
    case 'command':
      out = str('command') ?? str('cmd') ?? str('text')
      if (out && !out.startsWith('/')) out = `/${out}`
      break
    case 'death':
      out = str('cause') ?? str('message') ?? str('mob') ?? str('killer')
      break
    case 'lag':
      out = str('tps') != null ? `TPS ${str('tps')}` : (str('mspt') != null ? `MSPT ${str('mspt')}` : str('message'))
      break
    case 'crash':
    case 'server_stop':
    case 'server_start':
      out = str('reason') ?? str('message')
      break
    case 'quit':
      out = str('ping') != null ? `${str('ping')}ms` : null
      break
    default:
      out = str('message') ?? str('reason') ?? str('text')
  }
  if (!out) return null
  return out.length > 80 ? `${out.slice(0, 80)}…` : out
}

export default AdminMonitorDetailPage
