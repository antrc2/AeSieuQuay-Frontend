import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useSeo } from '@/hooks/useSeo'
import {
  listBankDeposits,
  listClusters,
  listServers,
  monitorOverview,
  monitorServers,
  type AdminCluster,
  type AdminServer,
  type MonitorOverview,
  type MonitorServerSummary,
} from '@/api/admin'
import { PageHeader, SectionHeader, StatCard } from '@/components/admin/blocks'
import { KeyBadge, OnlineBadge } from '@/components/admin/badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'
import { fmtBytes, fmtNumber, fmtTime, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const REFRESH_MS = 15_000

export const AdminOverviewPage = () => {
  useSeo({ title: 'Quản trị — Tổng quan — SV AeSieuQuay', noindex: true })

  const [clusters, setClusters] = useState<AdminCluster[] | null>(null)
  const [servers, setServers] = useState<AdminServer[] | null>(null)
  const [overview, setOverview] = useState<MonitorOverview | null>(null)
  const [summaries, setSummaries] = useState<MonitorServerSummary[] | null>(null)
  const [monitorFailed, setMonitorFailed] = useState(false)
  const [unmatchedCount, setUnmatchedCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const aliveRef = useRef(true)

  const load = useCallback(async () => {
    try {
      setUpdatedAt(Date.now())
      const [c, s] = await Promise.all([listClusters().catch(() => []), listServers({ include_inactive: true }).catch(() => [])])
      if (!aliveRef.current) return
      setClusters(c)
      setServers(s)
      // quick-link "Nạp chờ xử lý" — chỉ cần total, limit 1 cho nhẹ (§2.1)
      listBankDeposits({ status: 'unmatched', limit: 1 })
        .then((r) => aliveRef.current && setUnmatchedCount(r.total))
        .catch(() => undefined)
      try {
        const [o, m] = await Promise.all([monitorOverview(), monitorServers()])
        if (!aliveRef.current) return
        setOverview(o)
        setSummaries(m)
        setMonitorFailed(false)
      } catch {
        if (!aliveRef.current) return
        setOverview(null)
        setSummaries(null)
        setMonitorFailed(true)
      }
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      aliveRef.current = false
      clearInterval(timer)
    }
  }, [load])

  const activeServers = (servers ?? []).filter((s) => s.is_active)
  const keyMissing = activeServers.filter(
    (s) => !s.monitor_key_configured || (s.points_enabled && s.role !== 'proxy' && !s.points_key_configured),
  )
  const alerts = overview?.alerts
  const alertCount = (alerts?.low_tps.length ?? 0) + (alerts?.high_mspt.length ?? 0) + (alerts?.offline.length ?? 0)
  const allGood = keyMissing.length === 0 && alertCount === 0

  if (loading && !clusters) {
    return (
      <div className="space-y-5">
        <PageHeader title="Tổng quan" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tổng quan"
        description={
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                monitorFailed ? 'bg-red-500' : allGood ? 'bg-emerald-500' : 'bg-amber-500',
              )}
            />
            Tự làm mới mỗi 15 giây · cập nhật {fmtTime(updatedAt)}
            {monitorFailed && ' · monitor không kết nối được'}
          </span>
        }
        actions={
          <Button variant="outline" onClick={load}>
            Làm mới ngay
          </Button>
        }
      />

      {/* 6 card số liệu — hàng gọn, label 1 dòng */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon="🗂️"
          label="Cụm đang bật"
          value={`${(clusters ?? []).filter((c) => c.is_active).length}/${(clusters ?? []).length}`}
        />
        <StatCard
          icon="🖥️"
          label="Server online"
          value={overview ? `${overview.servers_online}/${overview.servers_total}` : '—'}
          tone={overview && overview.servers_total > 0 && overview.servers_online === overview.servers_total ? 'success' : 'warning'}
          sub={monitorFailed ? 'monitor offline' : undefined}
        />
        <StatCard icon="👥" label="Người chơi" value={overview ? fmtNumber(overview.players_online) : '—'} sub="đang online toàn mạng" />
        <StatCard
          icon="⚡"
          label="TPS thấp"
          value={alerts ? alerts.low_tps.length : '—'}
          tone={alerts?.low_tps.length ? 'warning' : 'success'}
          sub={alerts?.low_tps.join(', ') || undefined}
        />
        <StatCard
          icon="🐌"
          label="MSPT cao"
          value={alerts ? alerts.high_mspt.length : '—'}
          tone={alerts?.high_mspt.length ? 'warning' : 'success'}
          sub={alerts?.high_mspt.join(', ') || undefined}
        />
        <StatCard
          icon="🔌"
          label="Offline"
          value={alerts ? alerts.offline.length : '—'}
          tone={alerts?.offline.length ? 'danger' : 'success'}
          sub={alerts?.offline.join(', ') || undefined}
        />
      </div>

      {/* Cảnh báo key — strip gọn thay vì card lớn */}
      {keyMissing.length > 0 ? (
        <Card className="border-red-500/40">
          <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-red-500">
              <span aria-hidden>⚠</span> {keyMissing.length} server thiếu API key
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {keyMissing.map((s) => (
                <Link
                  key={s.id}
                  to={`/admin/keys?server=${encodeURIComponent(s.server_key)}`}
                  className="flex items-center gap-2 rounded-full border border-border-c bg-surface-2 px-3 py-1 text-xs transition-colors hover:border-primary"
                >
                  <span className="font-mono font-semibold">{s.server_key}</span>
                  {!s.monitor_key_configured && <KeyBadge kind="monitor" configured={false} />}
                  {s.points_enabled && s.role !== 'proxy' && !s.points_key_configured && <KeyBadge kind="points" configured={false} />}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        servers &&
        servers.length > 0 && (
          <Card className="border-emerald-500/30">
            <CardContent className="flex items-center gap-2 p-4 text-sm font-medium text-emerald-500">
              <span aria-hidden>✓</span> Tất cả server đang bật đã đủ API key
            </CardContent>
          </Card>
        )
      )}

      {/* Đường vào nhanh khu lịch sử tiền + users (§2.1 quick-link) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink
          to="/admin/bank-deposits"
          icon="🏦"
          label="Nạp bank"
          badge={unmatchedCount ? `Nạp chờ xử lý: ${unmatchedCount}` : undefined}
          tone={unmatchedCount ? 'warn' : undefined}
        />
        <QuickLink to="/admin/points-history" icon="🪙" label="Lịch sử points" />
        <QuickLink to="/admin/card-transactions" icon="🎫" label="Thẻ cào" />
        <QuickLink to="/admin/users" icon="👥" label="Tài khoản" />
      </div>

      {/* Lưới server monitor */}
      <SectionHeader
        title="Server monitor"
        actions={
          <Link to="/admin/monitor" className="text-sm font-medium text-primary hover:underline">
            Xem tất cả →
          </Link>
        }
      />
      {summaries && summaries.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaries.slice(0, 8).map((s) => (
            <Link
              key={s.server_name}
              to={`/admin/monitor/${encodeURIComponent(s.server_name)}`}
              className="group rounded-2xl border border-border-c bg-surface p-4 transition-colors hover:border-primary/60"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-sm font-bold text-fg group-hover:text-primary">{s.server_name}</span>
                <OnlineBadge online={s.online} />
              </div>
              {s.online ? (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Metric label="Player" value={`${s.heartbeat.online ?? 0}/${s.heartbeat.max ?? '—'}`} />
                  <Metric label="TPS" value={s.perf.tps_1m != null ? s.perf.tps_1m.toFixed(1) : '—'} tone={s.perf.tps_1m != null && s.perf.tps_1m < 18 ? 'warn' : undefined} />
                  <Metric label="Heap" value={s.perf.heap_used != null ? fmtBytes(s.perf.heap_used) : '—'} />
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted">mất kết nối {timeAgo(s.last_seen_ms)}</p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border-c bg-surface/50 p-6 text-center text-sm text-muted">
          Chưa có telemetry — plugin agent chưa gửi dữ liệu lên backend.
        </p>
      )}
    </div>
  )
}

const Metric = ({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) => (
  <div className="rounded-xl bg-surface-2 px-1 py-1.5">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
    <p className={cn('text-sm font-bold tabular-nums', tone === 'warn' ? 'text-amber-500' : 'text-fg')}>{value}</p>
  </div>
)

const QuickLink = ({ to, icon, label, badge, tone }: { to: string; icon: string; label: string; badge?: string; tone?: 'warn' }) => (
  <Link
    to={to}
    className="flex items-center gap-2.5 rounded-2xl border border-border-c bg-surface px-4 py-3 text-sm font-semibold text-fg transition-colors hover:border-primary/60"
  >
    <span aria-hidden className="text-lg">
      {icon}
    </span>
    <span className="min-w-0">
      <span className="block truncate">{label}</span>
      {badge && <span className={cn('block text-[11px] font-medium', tone === 'warn' ? 'text-amber-500' : 'text-muted')}>{badge}</span>}
    </span>
  </Link>
)

export default AdminOverviewPage
