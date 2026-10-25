import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useSeo } from '@/hooks/useSeo'
import { monitorServers, type MonitorServerSummary } from '@/api/admin'
import { showApiError } from '@/utils/swal'
import { PageHeader } from '@/components/admin/blocks'
import { OnlineBadge } from '@/components/admin/badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { fmtBytes, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const REFRESH_MS = 15_000

const num = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const fmt1 = (v: number | null) => (v == null ? '—' : v.toFixed(1))
const tpsNum = (s: MonitorServerSummary) => num(s.online ? s.perf.tps_1m : null)
const msptNum = (s: MonitorServerSummary) => num(s.online ? s.perf.mspt_avg : null)

/** Lưới server monitor — bấm 1 server sang trang chart chi tiết. */
export const AdminMonitorPage = () => {
  useSeo({ title: 'Quản trị — Monitor — SV AeSieuQuay', noindex: true })

  const [servers, setServers] = useState<MonitorServerSummary[] | null>(null)
  const [error, setError] = useState(false)
  const aliveRef = useRef(true)

  const load = useCallback(async () => {
    try {
      const data = await monitorServers()
      if (!aliveRef.current) return
      setServers(data)
      setError(false)
    } catch (err) {
      if (!aliveRef.current) return
      setError(true)
      await showApiError(err, 'Không tải được monitor')
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      aliveRef.current = false
      setError(false)
      clearInterval(timer)
    }
  }, [load])

  const onlineCount = (servers ?? []).filter((s) => s.online).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitor"
        description={`Cập nhật mỗi 15 giây · ${onlineCount}/${(servers ?? []).length} server online.`}
        actions={
          <Button variant="outline" onClick={load}>
            Làm mới
          </Button>
        }
      />

      {!servers && !error ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : !servers || servers.length === 0 ? (
        <EmptyState icon="📡" title="Chưa có telemetry" description="Chưa server nào gửi dữ liệu monitor về backend." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {servers.map((s) => (
            <Card key={s.server_name} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-mono text-sm font-bold text-fg">{s.server_name}</h3>
                  <OnlineBadge online={s.online} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-surface-2 p-2">
                    <p className="text-lg font-extrabold tabular-nums text-fg">
                      {s.online ? `${s.heartbeat.online ?? 0}` : '—'}
                      <span className="text-xs font-semibold text-muted">/{s.heartbeat.max ?? '—'}</span>
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-muted">players</p>
                  </div>
                  <div className="rounded-xl bg-surface-2 p-2">
                    <p className={cn('text-lg font-extrabold tabular-nums', tpsNum(s) == null ? 'text-fg' : tpsNum(s)! < 18 ? 'text-amber-500' : 'text-emerald-500')}>
                      {fmt1(tpsNum(s))}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-muted">TPS</p>
                  </div>
                  <div className="rounded-xl bg-surface-2 p-2">
                    <p className={cn('text-lg font-extrabold tabular-nums', msptNum(s) != null && msptNum(s)! > 40 ? 'text-amber-500' : 'text-fg')}>
                      {fmt1(msptNum(s))}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-muted">MSPT</p>
                  </div>
                </div>
                <p className="text-xs text-muted">
                  Heap {fmtBytes(s.perf.heap_used)} / {fmtBytes(s.perf.heap_max)} · {s.online ? `heartbeat ${timeAgo(s.heartbeat.ts_ms ?? s.last_seen_ms)}` : `mất kết nối ${timeAgo(s.last_seen_ms)}`}
                </p>
                <Link
                  to={`/admin/monitor/${encodeURIComponent(s.server_name)}`}
                  className="mt-auto inline-flex h-9 items-center justify-center rounded-xl border border-border-c bg-surface-2 text-sm font-semibold text-fg transition-colors hover:bg-[var(--border)]"
                >
                  Xem chi tiết →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminMonitorPage
