import { useEffect, useState } from 'react'

import { getPointTransfer, type PointCommandAdmin, type PointTransferAdmin } from '@/api/admin'
import { showApiError } from '@/utils/swal'
import { CopyButton } from '@/components/admin/form'
import SidePanel from '@/components/admin/SidePanel'
import { TransferStatusBadge } from '@/components/admin/PointTransfersTable'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/States'
import { fmtIsoVN, fmtXu } from '@/lib/format'

const CMD_STATUS_TONE: Record<string, 'default' | 'brand' | 'success' | 'warning' | 'danger'> = {
  pending: 'brand',
  claimed: 'brand',
  done: 'success',
  failed: 'warning',
  expired: 'warning',
  uncertain: 'danger',
}

const STEP_ORDER: PointTransferAdmin['status'][] = ['pending', 'debited', 'completed']

/**
 * Drawer saga: timeline pending→debited→completed + 3 command con + 4 balance.
 * Mở là fetch /transfers/<id> (detail có commands — list không có).
 */
export const TransferDetailDrawer = ({
  transferId,
  onClose,
}: {
  transferId: string | null
  onClose: () => void
}) => {
  const [detail, setDetail] = useState<{ transfer: PointTransferAdmin; commands: PointCommandAdmin[] } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!transferId) {
      setDetail(null)
      return
    }
    let alive = true
    setLoading(true)
    getPointTransfer(transferId)
      .then((d) => alive && setDetail(d))
      .catch(async (err) => alive && (await showApiError(err, 'Không tải được chi tiết transfer')))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [transferId])

  const t = detail?.transfer

  return (
    <SidePanel open={!!transferId} onClose={onClose} title="Chi tiết chuyển Xu" description={<code className="font-mono text-xs">{transferId}</code>}>
      {loading || !t ? (
        <Skeleton className="h-72" />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <TransferStatusBadge status={t.status} error={t.error} />
            <span className="font-semibold text-fg">{fmtXu(t.amount)}</span>
            <span className="text-sm text-muted">
              {t.player_name ?? '—'} · {t.from_server_key} → {t.to_server_key}
            </span>
            <CopyButton text={t.transfer_id} label="copy id" />
          </div>

          {/* Saga timeline */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Tiến trình saga</p>
            <div className="flex items-center gap-2">
              {STEP_ORDER.map((step, i) => {
                // Giai đoạn đã đạt: pending=0 · debited/refund_pending/failed/refunded/needs_reconcile=1 · completed=2
                const stage = t.status === 'pending' ? 0 : t.status === 'completed' ? 2 : 1
                const reached = i <= stage
                return (
                  <div key={step} className="flex flex-1 items-center gap-2">
                    <span
                      className={`flex h-7 flex-1 items-center justify-center rounded-lg text-xs font-semibold ${
                        reached ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-muted'
                      }`}
                    >
                      {step}
                    </span>
                    {i < STEP_ORDER.length - 1 && <span className={`h-0.5 w-3 ${reached ? 'bg-primary/40' : 'bg-[var(--border)]'}`} />}
                  </div>
                )
              })}
            </div>
            {t.error && <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{t.error}</p>}
          </div>

          {/* 4 balance */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <BalCard label="Từ cụm · trước → sau" before={t.from_balance_before} after={t.from_balance_after} />
            <BalCard label="Đến cụm · trước → sau" before={t.to_balance_before} after={t.to_balance_after} />
          </div>

          {/* Commands con */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Lệnh agent ({detail?.commands.length})</p>
            <ul className="space-y-2">
              {(detail?.commands ?? []).map((c) => (
                <li key={c.id} className="rounded-xl border border-border-c bg-surface-2/50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={CMD_STATUS_TONE[c.status] ?? 'default'}>{c.type}</Badge>
                    <span className="font-mono text-xs text-muted">{c.server_key}</span>
                    <span className="text-sm text-fg">{fmtXu(c.amount)}</span>
                    <span className="ml-auto text-xs text-muted">lần {c.attempts}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    id <code className="font-mono">{c.id}</code> · status <b>{c.status}</b>
                    {c.balance_before != null && (
                      <>
                        {' '}· {c.balance_before} → {c.balance ?? '?'}
                      </>
                    )}
                  </p>
                  {c.error && <p className="mt-1 text-xs text-red-500">{c.error}</p>}
                </li>
              ))}
            </ul>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted">
            <Row k="Tạo lúc" v={fmtIsoVN(t.created_at)} />
            <Row k="Cập nhật" v={fmtIsoVN(t.updated_at)} />
            <Row k="Hoàn tất" v={fmtIsoVN(t.completed_at)} />
            <Row k="Idempotency" v={t.idempotency_key ?? '—'} />
          </dl>
        </div>
      )}
    </SidePanel>
  )
}

const BalCard = ({ label, before, after }: { label: string; before: number | null; after: number | null }) => (
  <div className="rounded-xl border border-border-c bg-surface p-3">
    <p className="text-[11px] text-muted">{label}</p>
    <p className="mt-1 text-sm font-semibold tabular-nums text-fg">
      {before ?? '—'} → {after ?? '—'}
    </p>
  </div>
)

const Row = ({ k, v }: { k: string; v: string }) => (
  <>
    <dt className="text-muted">{k}</dt>
    <dd className="text-fg">{v}</dd>
  </>
)

export default TransferDetailDrawer
