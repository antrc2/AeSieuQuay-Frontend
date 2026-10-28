import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useSeo } from '@/hooks/useSeo'
import {
  monitorBatches,
  monitorDisks,
  monitorExceptions,
  monitorPlugins,
  monitorServers,
  monitorUptimePeriods,
  monitorWorlds,
  type BatchRow,
  type DiskSample,
  type ExceptionGroup,
  type MonitorServerSummary,
  type PluginInfo,
  type UptimePeriod,
  type WorldSize,
} from '@/api/admin'
import { showApiError } from '@/utils/swal'
import { PageHeader } from '@/components/admin/blocks'
import { OnlineBadge } from '@/components/admin/badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { fmtBytes, fmtDateTimeMs, fmtDuration, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const REFRESH_MS = 15_000

const num = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const fmt1 = (v: number | null) => (v == null ? '—' : v.toFixed(1))
const tpsNum = (s: MonitorServerSummary) => num(s.online ? s.perf.tps_1m : null)
const msptNum = (s: MonitorServerSummary) => num(s.online ? s.perf.mspt_avg : null)

/** Dữ liệu mở rộng theo server (uptime/disk/world/plugins/exceptions/batches) — load nền một lần. */
interface ExtraData {
  uptime?: UptimePeriod[]
  disks?: DiskSample[]
  worlds?: WorldSize[]
  plugins?: PluginInfo[]
  exceptions?: ExceptionGroup[]
  batches?: BatchRow[]
}

const pctOf = (v: number | null | undefined) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const p = v <= 1 ? v * 100 : v // backend có thể trả 0..1 hoặc %
  return Math.max(0, Math.min(100, p))
}

const StatCell = ({ label, value, tone = 'text-fg' }: { label: string; value: React.ReactNode; tone?: string }) => (
  <div className="rounded-xl bg-surface-2 px-2 py-1.5 text-center">
    <p className={cn('text-sm font-extrabold tabular-nums leading-tight', tone)}>{value}</p>
    <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
  </div>
)

const BarStat = ({ label, pct, right }: { label: string; pct: number | null; right: string }) => (
  <div>
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums font-semibold text-fg">{right}</span>
    </div>
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
      <div
        className={cn(
          'h-full rounded-full',
          pct == null ? 'bg-transparent' : pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500',
        )}
        style={{ width: `${pct ?? 0}%` }}
      />
    </div>
  </div>
)

/** Lưới server monitor — hiển thị toàn bộ stat trực tiếp trên thẻ, không cần bấm tab ẩn. */
export const AdminMonitorPage = () => {
  useSeo({ title: 'Quản trị — Monitor — SV AeSieuQuay', noindex: true })

  const [servers, setServers] = useState<MonitorServerSummary[] | null>(null)
  const [extras, setExtras] = useState<Record<string, ExtraData>>({})
  const extrasRef = useRef<Record<string, ExtraData>>({})
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

  /* Load nền dữ liệu mở rộng cho từng server (một lần, không block lưới chính). */
  useEffect(() => {
    if (!servers || servers.length === 0) return
    let alive = true
    for (const s of servers) {
      if (extrasRef.current[s.server_name]) continue
      const grab = <T,>(p: Promise<T>) => p.catch(() => undefined)
      Promise.all([
        grab(monitorUptimePeriods(s.server_name, 168)),
        grab(monitorDisks(s.server_name, 24)),
        grab(monitorWorlds(s.server_name, 168)),
        grab(monitorPlugins(s.server_name)),
        grab(monitorExceptions(s.server_name, 3)),
        grab(monitorBatches(s.server_name, 5)),
      ]).then(([uptime, disks, worlds, plugins, exceptions, batches]) => {
        if (!alive) return
        const data: ExtraData = {
          uptime: Array.isArray(uptime) ? uptime : [],
          disks: Array.isArray(disks) ? disks : [],
          worlds: Array.isArray(worlds) ? worlds : [],
          plugins: Array.isArray(plugins) ? plugins : [],
          exceptions: Array.isArray(exceptions) ? exceptions : [],
          batches: Array.isArray(batches) ? batches : [],
        }
        extrasRef.current[s.server_name] = data
        setExtras((prev) => ({ ...prev, [s.server_name]: data }))
      })
    }
    return () => {
      alive = false
    }
  }, [servers])

  const onlineCount = (servers ?? []).filter((s) => s.online).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitor"
        description={`Cập nhật mỗi 15 giây · ${onlineCount}/${(servers ?? []).length} server online · Toàn bộ chỉ số hiển thị trực tiếp trên thẻ.`}
        actions={
          <Button variant="outline" onClick={load}>
            Làm mới
          </Button>
        }
      />

      {!servers && !error ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      ) : !servers || servers.length === 0 ? (
        <EmptyState icon="📡" title="Chưa có telemetry" description="Chưa server nào gửi dữ liệu monitor về backend." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {servers.map((s) => {
            const ex = extras[s.server_name]
            const heapPct = num(s.perf.heap_max) ? ((num(s.perf.heap_used) ?? 0) / (s.perf.heap_max as number)) * 100 : null
            const cpuPct = pctOf(num(s.system?.load_avg))
            const memTotal = num(s.system?.mem_total)
            const memFree = num(s.system?.mem_free)
            const memUsedPct = memTotal && memFree != null ? ((memTotal - memFree) / memTotal) * 100 : null
            const uptimePct = (() => {
              const periods = ex?.uptime
              if (!periods || periods.length === 0) return null
              const now = Date.now()
              const from = now - 7 * 86_400_000
              const onlineMs = periods
                .filter((p) => p.status === 'online')
                .reduce((sum, p) => sum + Math.max(0, Math.min(p.ended_at_ms ?? now, now) - Math.max(p.started_at_ms, from)), 0)
              return (onlineMs / (7 * 86_400_000)) * 100
            })()

            return (
              <Card key={s.server_name} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-4 p-5">
                  {/* Header server */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-mono text-base font-bold text-fg">{s.server_name}</h3>
                      <p className="text-xs text-muted">
                        {s.heartbeat.server_impl ?? '—'} {s.heartbeat.mc_version ?? ''}
                        {s.agent ? ` · agent ${s.agent.name} ${s.agent.version}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <OnlineBadge online={s.online} />
                      <Link
                        to={`/admin/monitor/${encodeURIComponent(s.server_name)}`}
                        className="inline-flex h-8 items-center rounded-lg border border-border-c bg-surface-2 px-3 text-xs font-semibold text-fg transition-colors hover:bg-[var(--border)]"
                      >
                        Chi tiết →
                      </Link>
                    </div>
                  </div>

                  {/* Hàng chỉ số chính */}
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    <StatCell
                      label="Players"
                      value={
                        <>
                          {s.online ? `${s.heartbeat.online ?? 0}` : '—'}
                          <span className="text-xs font-semibold text-muted">/{s.heartbeat.max ?? '—'}</span>
                        </>
                      }
                    />
                    <StatCell
                      label="TPS"
                      value={fmt1(tpsNum(s))}
                      tone={tpsNum(s) == null ? 'text-fg' : tpsNum(s)! < 18 ? 'text-amber-500' : 'text-emerald-500'}
                    />
                    <StatCell
                      label="MSPT"
                      value={fmt1(msptNum(s))}
                      tone={msptNum(s) != null && msptNum(s)! > 40 ? 'text-amber-500' : 'text-fg'}
                    />
                    <StatCell
                      label="Uptime 7n"
                      value={uptimePct == null ? '…' : `${uptimePct.toFixed(1)}%`}
                      tone={
                        uptimePct == null
                          ? 'text-muted'
                          : uptimePct >= 99
                            ? 'text-emerald-500'
                            : uptimePct >= 95
                              ? 'text-amber-500'
                              : 'text-red-500'
                      }
                    />
                    <StatCell label="Plugins" value={ex ? String(ex.plugins?.length ?? 0) : '…'} />
                    <StatCell label="Seen" value={<span className="text-xs leading-5">{timeAgo(s.heartbeat.ts_ms ?? s.last_seen_ms)}</span>} />
                  </div>

                  {/* Thanh tài nguyên */}
                  <div className="grid gap-2 sm:grid-cols-3">
                    <BarStat label="Heap JVM" pct={heapPct} right={`${fmtBytes(s.perf.heap_used)} / ${fmtBytes(s.perf.heap_max)}`} />
                    <BarStat
                      label="RAM hệ thống"
                      pct={memUsedPct}
                      right={memTotal != null ? `${fmtBytes(memTotal - (memFree ?? 0))} / ${fmtBytes(memTotal)}` : '—'}
                    />
                    <BarStat label="CPU / Load" pct={cpuPct} right={s.system?.load_avg != null ? s.system.load_avg.toFixed(2) : '—'} />
                  </div>

                  {/* Disk + Worlds */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border-c bg-surface-2/40 p-3">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Ổ đĩa (24h)</p>
                      {!ex ? (
                        <Skeleton className="h-10" />
                      ) : ex.disks && ex.disks.length > 0 ? (
                        <ul className="space-y-2">
                          {ex.disks.slice(0, 3).map((d) => {
                            const usedPct = d.total_bytes ? 100 - (d.free_bytes / d.total_bytes) * 100 : 0
                            return (
                              <li key={d.path}>
                                <div className="flex items-center justify-between text-[11px]">
                                  <code className="truncate font-mono text-fg">{d.path}</code>
                                  <span className="tabular-nums text-muted">{usedPct.toFixed(0)}%</span>
                                </div>
                                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                                  <div
                                    className={cn(
                                      'h-full rounded-full',
                                      usedPct > 90 ? 'bg-red-500' : usedPct > 75 ? 'bg-amber-500' : 'bg-emerald-500',
                                    )}
                                    style={{ width: `${Math.min(100, usedPct)}%` }}
                                  />
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted">Chưa có sample disk.</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-border-c bg-surface-2/40 p-3">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Thế giới (7 ngày)</p>
                      {!ex ? (
                        <Skeleton className="h-10" />
                      ) : ex.worlds && ex.worlds.length > 0 ? (
                        <ul className="max-h-24 space-y-1 overflow-y-auto text-xs">
                          {(() => {
                            const byWorld = new Map<string, WorldSize>()
                            for (const w of ex.worlds) {
                              const cur = byWorld.get(w.world)
                              if (!cur || w.ts_ms > cur.ts_ms) byWorld.set(w.world, w)
                            }
                            return [...byWorld.values()].map((w) => (
                              <li key={w.world} className="flex items-center justify-between gap-2">
                                <span className="truncate font-mono text-fg">{w.world}</span>
                                <span className="tabular-nums text-muted">{fmtBytes(w.size_bytes)}</span>
                              </li>
                            ))
                          })()}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted">Chưa có sample world size.</p>
                      )}
                    </div>
                  </div>

                  {/* Exceptions + Batches + Trạng thái gần nhất */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border-c bg-surface-2/40 p-3">
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Exception nổi bật</p>
                      {!ex ? (
                        <Skeleton className="h-8" />
                      ) : ex.exceptions && ex.exceptions.length > 0 ? (
                        <ul className="space-y-1.5">
                          {ex.exceptions.map((e) => (
                            <li key={`${e.source}-${e.message}`} className="truncate text-xs" title={e.message}>
                              <span className="font-semibold text-fg">{e.source}</span>{' '}
                              <span className="rounded-full bg-red-500/10 px-1.5 text-[10px] font-bold text-red-500">×{e.count}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-emerald-500">Không có exception 👍</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-border-c bg-surface-2/40 p-3">
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Batches ingest</p>
                      {!ex ? (
                        <Skeleton className="h-8" />
                      ) : ex.batches && ex.batches.length > 0 ? (
                        <ul className="space-y-1 text-[11px]">
                          {ex.batches.slice(0, 3).map((b) => (
                            <li key={b.batch_id} className="flex items-center justify-between gap-2">
                              <span className={cn('font-semibold tabular-nums', b.rejected_count > 0 ? 'text-red-500' : 'text-emerald-500')}>
                                {b.accepted_count}/{b.record_count}
                              </span>
                              <span className="tabular-nums text-muted">{fmtDateTimeMs(b.received_at_ms)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted">Chưa có batch.</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-border-c bg-surface-2/40 p-3">
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Trạng thái gần nhất</p>
                      {!ex ? (
                        <Skeleton className="h-8" />
                      ) : ex.uptime && ex.uptime.length > 0 ? (
                        <ul className="space-y-1 text-[11px]">
                          {ex.uptime
                            .slice()
                            .reverse()
                            .slice(0, 3)
                            .map((p, i) => (
                              <li key={i} className="flex items-center justify-between gap-2">
                                <span className={cn('font-semibold', p.status === 'online' ? 'text-emerald-500' : 'text-red-500')}>
                                  {p.status === 'online' ? '▲ online' : '▼ offline'}
                                </span>
                                <span className="tabular-nums text-muted">{fmtDuration(p.duration_ms)}</span>
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted">
                          {s.online
                            ? `đang chạy · heartbeat ${timeAgo(s.heartbeat.ts_ms ?? s.last_seen_ms)}`
                            : `mất kết nối ${timeAgo(s.last_seen_ms)}`}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AdminMonitorPage
