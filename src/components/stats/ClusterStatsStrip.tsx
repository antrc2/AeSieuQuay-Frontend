import type { ClusterStats } from '@/data/contract'
import { cn } from '@/lib/utils'

const fmt = {
  tps: (v: number) => v.toFixed(1),
  pct: (v: number) => `${v.toFixed(1)}%`,
}

interface Props {
  stats: ClusterStats | null | undefined
  compact?: boolean
  className?: string
}

/** Dải stat cụm — ẩn hoàn toàn khi backend không trả stats (chưa từng report). */
export function ClusterStatsStrip({ stats, compact = false, className }: Props) {
  if (!stats) return null
  const tone =
    stats.status === 'online' ? 'bg-emerald-500'
    : stats.status === 'maintenance' ? 'bg-amber-500'
    : 'bg-rose-500'
  const label =
    stats.status === 'online' ? 'Đang hoạt động'
    : stats.status === 'maintenance' ? 'Bảo trì'
    : 'Ngoại tuyến'

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2 text-sm', className)}
      role="status"
      aria-label={`Trạng thái cụm ${stats.cluster.name}`}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-c bg-surface px-3.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            tone,
            stats.status === 'online' && 'animate-pulse',
          )}
        />
        {label}
      </span>
      {stats.players && (
        <span className="rounded-full border border-border-c bg-surface px-3.5 py-1.5 text-xs font-semibold tabular-nums shadow-sm">
          👥 {stats.players.online}/{stats.players.max} người chơi
        </span>
      )}
      {!compact && stats.tps && (
        <span className="rounded-full border border-border-c bg-surface px-3.5 py-1.5 text-xs font-semibold tabular-nums shadow-sm">
          ⚡ TPS {fmt.tps(stats.tps.avg_1m)}
        </span>
      )}
      {!compact && stats.uptime?.percent_7d != null && (
        <span className="rounded-full border border-border-c bg-surface px-3.5 py-1.5 text-xs font-semibold tabular-nums shadow-sm">
          🛡️ Uptime 7 ngày {fmt.pct(stats.uptime.percent_7d)}
        </span>
      )}
    </div>
  )
}

export default ClusterStatsStrip
