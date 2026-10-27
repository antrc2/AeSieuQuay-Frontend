import type { PointTransferAdmin, TransferStatus } from '@/api/admin'
import { Badge } from '@/components/ui/badge'
import { TableWrap, Td, Th } from '@/components/admin/blocks'
import { fmtIsoVN, fmtXu, shortId } from '@/lib/format'

/** Badge saga chuyển xu — needs_reconcile ĐỎ (tiền treo giữa 2 cụm, cần người). */
const STATUS_META: Record<TransferStatus, { variant: 'default' | 'brand' | 'success' | 'warning' | 'danger'; label: string; pulse?: boolean }> = {
  pending: { variant: 'brand', label: 'pending', pulse: true },
  debited: { variant: 'brand', label: 'debited' },
  refund_pending: { variant: 'warning', label: 'đợi hoàn Xu', pulse: true },
  completed: { variant: 'success', label: 'completed' },
  failed: { variant: 'danger', label: 'failed' },
  refunded: { variant: 'default', label: 'refunded' },
  needs_reconcile: { variant: 'danger', label: 'CẦN ĐỐI SOÁT' },
}

export const TransferStatusBadge = ({ status, error }: { status: TransferStatus; error?: string | null }) => {
  const meta = STATUS_META[status] ?? { variant: 'default' as const, label: status }
  return (
    <Badge variant={meta.variant} className={meta.pulse ? 'animate-pulse' : undefined} title={error ?? undefined}>
      {meta.label}
    </Badge>
  )
}

/**
 * Bảng saga transfers — click dòng mở drawer (nếu truyền onOpen);
 * reuse trong /admin/points-history tab Transfers và drawer hồ sơ user (§5.1,
 * nơi không truyền onOpen → bảng read-only).
 */
export const PointTransfersTable = ({
  rows,
  onOpen,
}: {
  rows: PointTransferAdmin[]
  onOpen?: (t: PointTransferAdmin) => void
}) => (
  <TableWrap>
    <thead>
      <tr>
        <Th>Transfer</Th>
        <Th>Người chơi</Th>
        <Th>Xu · hướng</Th>
        <Th>Trạng thái</Th>
        <Th>Tạo lúc</Th>
      </tr>
    </thead>
    <tbody>
      {rows.map((t) => {
        const Cell = onOpen ? 'button' : 'span'
        return (
          <tr key={t.transfer_id} className="hover:bg-surface-2/60">
            <Td>
              <Cell
                {...(onOpen ? { type: 'button' as const, onClick: () => onOpen(t) } : {})}
                className={onOpen ? 'font-mono text-xs text-primary hover:underline' : 'font-mono text-xs text-muted'}
                title={t.transfer_id}
              >
                {shortId(t.transfer_id, 8)}
              </Cell>
            </Td>
            <Td className="font-semibold text-fg">{t.player_name ?? '—'}</Td>
            <Td>
              <span className="tabular-nums text-fg">{fmtXu(t.amount)}</span>
              <p className="text-[11px] text-muted">
                {t.from_server_key} → {t.to_server_key}
              </p>
            </Td>
            <Td>
              <TransferStatusBadge status={t.status} error={t.error} />
            </Td>
            <Td className="whitespace-nowrap text-muted">{fmtIsoVN(t.created_at)}</Td>
          </tr>
        )
      })}
    </tbody>
  </TableWrap>
)

export default PointTransfersTable
