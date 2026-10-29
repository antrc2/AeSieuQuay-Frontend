import { useState } from 'react'

import Toast from '@/components/ui/Toast'
import type { ServerStatusBlock } from '@/data/contract'
import { fmtAgoMs } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Widget "Trạng thái máy chủ" — Frontend Requirements v2 §1.
 *
 * Nguồn: `window.DATA.server_status` (SSR, khối động cache TTL 45s).
 * - KHÔNG fetch API status, KHÔNG setInterval/poll — snapshot lúc render là hợp lệ (§0 doc v2).
 * - Block LUÔN tồn tại theo hợp đồng; field bên trong null → ẩn tương ứng.
 * - ❌ Không có ping/latency — backend đã bỏ hẳn (Monitor chưa đo). ĐỪNG vẽ pill ping.
 */

const DEFAULT_PORT = 25565

const STATUS_META = {
  online: { label: 'Đang online', dot: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  offline: { label: 'Offline', dot: 'bg-rose-500', badge: 'bg-rose-500/15 text-rose-500 border-rose-500/30' },
  maintenance: { label: 'Đang bảo trì', dot: 'bg-amber-500', badge: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
} as const

/** IP tĩnh có thể đã gồm ":port" (site_config "host:port") — tránh hiển thị port trùng lặp. */
const displayAddress = (status: ServerStatusBlock): string => {
  const ipHasPort = status.ip.includes(':')
  if (ipHasPort || status.port === DEFAULT_PORT) return status.ip
  return `${status.ip}:${status.port}`
}

interface Props {
  /** Block v2 — null khi backend chưa ship → fallback server_info cũ. */
  status?: ServerStatusBlock | null
  /** Fallback key cũ (`server_info`) cho backend chưa upgrade. */
  legacyInfo?: { ip?: string; online?: boolean | null } | null
}

export function ServerStatusWidget({ status, legacyInfo }: Props) {
  const [copied, setCopied] = useState(false)

  // Backend cũ (chưa có block v2) → bản gọn từ server_info, giữ tương thích.
  if (!status) {
    const ip = legacyInfo?.ip
    if (!ip) return null
    const isOnline = legacyInfo.online === true
    return (
      <section className="mx-auto mt-4 max-w-4xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border-c bg-surface p-4 shadow-lg shadow-black/5 sm:flex-row sm:justify-between sm:p-5">
          <code className="font-mono text-sm font-semibold text-fg sm:text-base">{ip}</code>
          <span className="flex items-center gap-2 text-sm text-muted">
            <span className={cn('h-2.5 w-2.5 rounded-full', legacyInfo.online == null ? 'animate-pulse bg-gray-400' : isOnline ? 'bg-emerald-500' : 'bg-rose-500')} />
            {legacyInfo.online == null ? 'Chưa có dữ liệu' : isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </section>
    )
  }

  const meta = STATUS_META[status.status] ?? STATUS_META.offline
  const address = displayAddress(status)
  const playersPct = status.players && status.players.max > 0
    ? Math.min(100, Math.round((status.players.online / status.players.max) * 100))
    : null

  const copyIp = async () => {
    try {
      await navigator.clipboard.writeText(address)
    } catch {
      const el = document.createElement('textarea')
      el.value = address
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <section
      className="mx-auto mt-4 max-w-4xl px-4 sm:px-6"
      role="status"
      aria-label={`Trạng thái máy chủ: ${meta.label}`}
    >
      <div className="rounded-2xl border border-border-c bg-surface p-4 shadow-lg shadow-black/5 sm:p-5">
        {/* Hàng 1: badge + players + IP copy */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            {/* Badge 3 trạng thái — xanh/đỏ/vàng (doc v2 bảng §1) */}
            <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide', meta.badge)}>
              <span className={cn('h-2 w-2 rounded-full', meta.dot, status.status === 'online' && 'animate-pulse')} />
              {meta.label}
            </span>

            {/* Bar tiến trình online/max — ẩn khi players null (chưa có heartbeat) */}
            {status.players && playersPct !== null && (
              <span className="flex items-center gap-2 text-muted">
                <span aria-hidden>👥</span>
                <span className="h-2 w-28 overflow-hidden rounded-full bg-surface-2 sm:w-36" role="progressbar" aria-valuenow={status.players.online} aria-valuemin={0} aria-valuemax={status.players.max}>
                  <span className={cn('block h-full rounded-full transition-[width]', status.status === 'online' ? 'bg-emerald-500' : 'bg-rose-400')} style={{ width: `${playersPct}%` }} />
                </span>
                <span className="tabular-nums font-semibold text-fg">
                  {status.players.online}/{status.players.max}
                </span>
              </span>
            )}
          </div>

          {/* IP + port — chỉ hiện :port khi ≠ 25565; copy-one-click chuỗi đầy đủ */}
          <button
            type="button"
            onClick={copyIp}
            title="Nhấn để sao chép IP"
            className="group flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-2.5 transition-colors hover:bg-[var(--border)]"
          >
            <code className="font-mono text-sm font-semibold text-fg sm:text-base">{address}</code>
            <span className="text-muted transition-transform group-hover:scale-110">📋</span>
          </button>
        </div>

        {/* Hàng 2: pill version/motd — ẩn từng cái khi null */}
        {(status.version || status.motd) && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs sm:justify-start">
            {status.version && (
              <span className="rounded-full border border-border-c bg-surface-2 px-2.5 py-1 text-muted">📦 {status.version}</span>
            )}
            {status.motd && (
              <span className="max-w-full truncate rounded-full border border-border-c bg-surface-2 px-2.5 py-1 text-muted">{status.motd}</span>
            )}
          </div>
        )}

        {/* Hàng 3: sub-stats — ẩn từng cái khi null. KHÔNG có ping/latency (backend đã bỏ). */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-c pt-3 text-xs text-muted">
          {status.tps?.avg_1m != null && (
            <span className={cn('tabular-nums', status.tps.avg_1m < 18 ? 'text-amber-500' : undefined)}>
              ⚡ TPS {status.tps.avg_1m.toFixed(1)}
            </span>
          )}
          {status.uptime?.percent_7d != null && (
            <span className="tabular-nums">🕐 Uptime 7 ngày {status.uptime.percent_7d.toFixed(1)}%</span>
          )}
          {status.servers && (
            <span className="tabular-nums">🖥️ {status.servers.online}/{status.servers.total} server</span>
          )}
          {status.source && (
            <span>
              Nguồn: {status.source.name}
              {!status.source.admin_picked && <span className="opacity-70"> (tự động)</span>}
            </span>
          )}
          <span className="ml-auto opacity-60">Cập nhật {fmtAgoMs(status.updated_at_ms)}</span>
        </div>
      </div>

      {copied && <Toast message="Đã sao chép IP server!" type="success" />}
    </section>
  )
}

export default ServerStatusWidget
