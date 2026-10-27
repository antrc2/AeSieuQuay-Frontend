import { useState } from 'react'

import type { BankDepositAdmin } from '@/api/admin'
import { TableWrap, Td, Th } from '@/components/admin/blocks'
import { canRequeue, DepositStatusBadge } from '@/components/admin/DepositStatusBadge'
import RequeueDepositModal from '@/components/admin/RequeueDepositModal'
import { Button } from '@/components/ui/button'
import { fmtDateTimeMs, fmtVnd, fmtXu, timeAgo } from '@/lib/format'

/**
 * Bảng lịch sử nạp bank — component riêng để trang /admin/bank-deposits
 * và drawer hồ sơ user (§5.1) dùng lại (chỉ khác query, không khác cột).
 */
export const BankDepositsTable = ({
  rows,
  onChanged,
}: {
  rows: BankDepositAdmin[]
  onChanged: (row: BankDepositAdmin) => void
}) => {
  const [requeueing, setRequeueing] = useState<BankDepositAdmin | null>(null)

  return (
    <>
      <TableWrap>
        <thead>
          <tr>
            <Th>Thời gian</Th>
            <Th>Tiền</Th>
            <Th>Nội dung CK</Th>
            <Th>Khách</Th>
            <Th>Trạng thái</Th>
            <Th className="text-right">Thao tác</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className="hover:bg-surface-2/60">
              <Td className="whitespace-nowrap text-muted">
                <span title={timeAgo(d.transaction_date_ms)}>{fmtDateTimeMs(d.transaction_date_ms)}</span>
              </Td>
              <Td>
                <p className="font-semibold tabular-nums text-fg" title="sảnh xuống theo tỷ giá">
                  {fmtVnd(d.amount_vnd)}
                </p>
                <p className="text-xs tabular-nums text-muted">{fmtXu(d.xu_amount)}</p>
              </Td>
              <Td className="max-w-[200px]">
                <code className="block truncate font-mono text-xs text-fg" title={d.content}>
                  {d.content}
                </code>
                {d.reference_code && <p className="truncate text-[11px] text-muted">{d.reference_code}</p>}
              </Td>
              <Td>
                {d.username ? (
                  <span className="text-sm">
                    {d.realname && <b className="text-fg">{d.realname}</b>}{' '}
                    <span className="font-mono text-xs text-muted">({d.username})</span>
                  </span>
                ) : (
                  <span className="italic text-muted">chưa match</span>
                )}
              </Td>
              <Td>
                <DepositStatusBadge deposit={d} />
              </Td>
              <Td className="text-right">
                {canRequeue(d) ? (
                  <Button size="sm" variant="secondary" onClick={() => setRequeueing(d)}>
                    Requeue
                  </Button>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      {requeueing && (
        <RequeueDepositModal
          deposit={requeueing}
          onClose={() => setRequeueing(null)}
          onDone={onChanged}
        />
      )}
    </>
  )
}

export default BankDepositsTable
