import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useSeo } from '@/hooks/useSeo'
import {
  listPointCommands,
  listPointTransfers,
  listServers,
  type PagedAdmin,
  type PointCommandAdmin,
  type PointTransferAdmin,
} from '@/api/admin'
import { showApiError } from '@/utils/swal'
import { PageHeader } from '@/components/admin/blocks'
import PointTransfersTable from '@/components/admin/PointTransfersTable'
import TransferDetailDrawer from '@/components/admin/TransferDetailDrawer'
import Pagination from '@/components/admin/Pagination'
import { Field, ctlCls } from '@/components/admin/form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'
import { cn } from '@/lib/utils'
import usePagedQuery from '@/hooks/usePagedQuery'
import { fmtDateTimeMs, fmtXu, shortId } from '@/lib/format'

/* =================== trang =================== */

/**
 * Lịch sử points — 2 tab (§3): Transfers (saga user) + Commands (mọi lệnh agent).
 * Load-on-demand + nút refresh TAY — khác trang bank, trang này KHÔNG auto-poll.
 */
export const AdminPointsHistoryPage = () => {
  useSeo({ title: 'Quản trị — Lịch sử points — SV AeSieuQuay', noindex: true })
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'commands' ? 'commands' : 'transfers'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch sử points"
        description="Transfers = saga chuyển Xu giữa 2 cụm · Commands = mọi lệnh agent (look/debit/credit/refund)."
      />

      <div className="flex rounded-xl border border-border-c bg-surface-2 p-1" role="tablist">
        {(
          [
            ['transfers', 'Transfers'],
            ['commands', 'Commands'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setParams({ tab: id }, { replace: true })}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
              tab === id ? 'bg-primary text-white' : 'text-muted hover:text-fg',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'transfers' ? <TransfersTab /> : <CommandsTab />}
    </div>
  )
}

/* =================== tab Transfers =================== */

const TransfersTab = () => {
  const q = usePagedQuery({ status: '', q: '' })
  const [data, setData] = useState<PagedAdmin<PointTransferAdmin> | null>(null)
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const aliveRef = useRef(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listPointTransfers(q.query)
      if (aliveRef.current) setData(res)
    } catch (err) {
      if (aliveRef.current) {
        await showApiError(err, 'Không tải được transfers')
        setData({ total: 0, page: 1, limit: q.limit, items: [] })
      }
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [q.query, q.limit])

  useEffect(() => {
    aliveRef.current = true
    load()
    return () => {
      aliveRef.current = false
    }
  }, [load])

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Trạng thái" className="w-48">
          <select className={ctlCls} value={q.filters.status} onChange={(e) => q.setFilters({ status: e.target.value })}>
            <option value="">Mọi trạng thái</option>
            {['pending', 'debited', 'refund_pending', 'completed', 'failed', 'refunded', 'needs_reconcile'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tìm kiếm" className="w-64">
          <input className={ctlCls} value={q.filters.q} onChange={(e) => q.setFilters({ q: e.target.value })} placeholder="player / transfer id / server" />
        </Field>
        <Button variant="outline" onClick={load} disabled={loading}>
          ↻ Làm mới
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="p-6">
              <Skeleton className="h-52" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <p className="p-6 text-sm text-muted">Chưa có transfer nào khớp bộ lọc.</p>
          ) : (
            <>
              <div className="px-6 pt-6">
                <PointTransfersTable rows={data.items} onOpen={(t) => setOpenId(t.transfer_id)} />
              </div>
              <Pagination page={data.page} total={data.total} limit={q.limit} onChange={q.setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <TransferDetailDrawer transferId={openId} onClose={() => setOpenId(null)} />
    </>
  )
}

/* =================== tab Commands =================== */

const TYPE_TONE: Record<string, string> = {
  look: 'bg-surface-2 text-muted',
  debit: 'bg-amber-500/10 text-amber-500',
  credit: 'bg-emerald-500/10 text-emerald-500',
  refund: 'bg-violet-500/10 text-violet-500',
}

const CommandsTab = () => {
  const q = usePagedQuery({ server_key: '', type: '', status: '', q: '' })
  const [data, setData] = useState<PagedAdmin<PointCommandAdmin> | null>(null)
  const [pointsServers, setPointsServers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const aliveRef = useRef(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listPointCommands(q.query)
      if (aliveRef.current) setData(res)
    } catch (err) {
      if (aliveRef.current) {
        await showApiError(err, 'Không tải được commands')
        setData({ total: 0, page: 1, limit: q.limit, items: [] })
      }
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [q.query, q.limit])

  useEffect(() => {
    aliveRef.current = true
    load()
    return () => {
      aliveRef.current = false
    }
  }, [load])

  useEffect(() => {
    listServers({ include_inactive: true })
      .then((s) => aliveRef.current && setPointsServers(s.filter((x) => x.points_enabled).map((x) => x.server_key)))
      .catch(() => undefined)
  }, [])

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Server" className="w-40">
          <select className={ctlCls} value={q.filters.server_key} onChange={(e) => q.setFilters({ server_key: e.target.value })}>
            <option value="">Mọi server</option>
            {pointsServers.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Loại" className="w-32">
          <select className={ctlCls} value={q.filters.type} onChange={(e) => q.setFilters({ type: e.target.value })}>
            <option value="">mọi loại</option>
            {['look', 'debit', 'credit', 'refund'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Trạng thái" className="w-36">
          <select className={ctlCls} value={q.filters.status} onChange={(e) => q.setFilters({ status: e.target.value })}>
            <option value="">mọi status</option>
            {['pending', 'claimed', 'done', 'failed', 'expired', 'uncertain'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tìm kiếm" className="w-60">
          <input className={ctlCls} value={q.filters.q} onChange={(e) => q.setFilters({ q: e.target.value })} placeholder="player / command id" />
        </Field>
        <Button variant="outline" onClick={load} disabled={loading}>
          ↻ Làm mới
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="p-6">
              <Skeleton className="h-52" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <p className="p-6 text-sm text-muted">Chưa có command nào khớp bộ lọc.</p>
          ) : (
            <>
              <div className="px-6 pt-6">
                <CommandsTable rows={data.items} />
              </div>
              <Pagination page={data.page} total={data.total} limit={q.limit} onChange={q.setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}

/** status lệnh agent (§3.2): pending/claimed = info-pulse · done success · failed/expired warn · uncertain danger. */
const CommandStatusBadge = ({ status }: { status: PointCommandAdmin['status'] }) => {
  const meta =
    status === 'done'
      ? ({ variant: 'success' } as const)
      : status === 'failed' || status === 'expired'
        ? ({ variant: 'warning' } as const)
        : status === 'uncertain'
          ? ({ variant: 'danger' } as const)
          : ({ variant: 'brand' } as const)
  return (
    <Badge variant={meta.variant} className={status === 'pending' || status === 'claimed' ? 'animate-pulse' : undefined}>
      {status}
    </Badge>
  )
}

/** "Còn sống" = expires-created (bank 48h, user 60s — suy từ data, không hardcode TTL). */
const TtlBar = ({ c, now }: { c: PointCommandAdmin; now: number }) => {
  const total = c.expires_at_ms - c.created_at_ms
  if (total <= 0) return null
  const left = Math.max(0, c.expires_at_ms - now)
  const pct = Math.min(100, (left / total) * 100)
  const done = c.status === 'done' || c.status === 'failed' || c.status === 'expired'
  return (
    <span
      className="inline-flex h-1.5 w-14 overflow-hidden rounded-full bg-surface-2 align-middle"
      title={`còn ${Math.max(0, Math.round(left / 60000))}p trong ${(total / 60000).toFixed(0)}p — TTL ${total >= 86_400_000 ? 'bank 48h' : 'user 60s'}`}
    >
      <span
        className={cn('h-full rounded-full', done ? 'bg-muted/50' : pct < 25 ? 'bg-red-500' : 'bg-emerald-500')}
        style={{ width: `${done ? 100 : pct}%` }}
      />
    </span>
  )
}

export const CommandsTable = ({ rows }: { rows: PointCommandAdmin[] }) => {
  // ảnh chụp "bây giờ" lúc mount/đổi trang — thanh TTL không cần tick từng giây
  const [nowMs] = useState(() => Date.now())
  return (
  <table className="w-full min-w-[860px] border-collapse text-sm">
    <thead>
      <tr>
        {['Command', 'Loại', 'Server', 'Player', 'Xu', 'Trạng thái', 'Còn sống', 'Tạo lúc'].map((h) => (
          <th key={h} className="border-b border-border-c px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((c) => (
        <tr key={c.id} className="hover:bg-surface-2/60">
          <td className="border-b border-border-c px-3 py-2.5 font-mono text-xs" title={c.id}>
            {shortId(c.id, 8)}
          </td>
          <td className="border-b border-border-c px-3 py-2.5">
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold uppercase', TYPE_TONE[c.type] ?? 'bg-surface-2 text-muted')}>
              {c.type}
            </span>
          </td>
          <td className="border-b border-border-c px-3 py-2.5 font-mono text-xs text-muted">{c.server_key}</td>
          <td className="border-b border-border-c px-3 py-2.5 text-fg">{c.player_name ?? '—'}</td>
          <td className="border-b border-border-c px-3 py-2.5 tabular-nums text-fg">{fmtXu(c.amount)}</td>
          <td className="border-b border-border-c px-3 py-2.5" title={c.error ?? undefined}>
            <span className="inline-flex items-center gap-1.5">
              <CommandStatusBadge status={c.status} />
              {c.attempts > 1 && <span className="text-[10px] text-muted">lần {c.attempts}</span>}
            </span>
          </td>
          <td className="border-b border-border-c px-3 py-2.5">
            <TtlBar c={c} now={nowMs} />
          </td>
          <td className="border-b border-border-c px-3 py-2.5 whitespace-nowrap text-xs text-muted">
            {fmtDateTimeMs(c.created_at_ms)}
            {c.deposit_id != null && (
              <div className="mt-1">
                {/* link ?q=<command UUID> — backend khớp ĐÚNG credit_command_id (backend-3 §4.1) */}
                <Link to={`/admin/bank-deposits?q=${encodeURIComponent(c.id)}`}>
                  <Badge variant="brand" className="text-[10px]">
                    nạp bank #{c.deposit_id}
                  </Badge>
                </Link>
              </div>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
  )
}

export default AdminPointsHistoryPage
