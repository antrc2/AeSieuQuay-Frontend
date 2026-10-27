import { Badge } from '@/components/ui/badge'
import { fmtXu } from '@/lib/format'

/**
 * Input tối giản để badge DÙNG CHUNG admin + trang user /nap-the (FRONTEND-4 §2.3):
 * BankDepositAdmin (đầy đủ) và BankDepositRow (subset window.DATA) đều khớp cấu trúc.
 */
export interface DepositLike {
  status: string
  xu_amount?: number | null
  credit_command_status?: string | null
  credit_command_error?: string | null
  credit_command_attempts?: number | null
  credit_result_balance?: number | null
  credit_attempts?: number
  sandbox?: boolean
  note?: string | null
  content?: string
  username?: string | null
}

/** Bảng màu đúng §1.3 admin-history-api.md. */
export const depositBadge = (d: DepositLike) => {
  const cmd = d.credit_command_status

  if (d.status === 'credited') {
    if (cmd === 'done')
      return { variant: 'success' as const, label: `Đã cộng ${fmtXu(d.xu_amount)}`, tip: d.credit_result_balance != null ? `Số dư lobby sau cộng: ${d.credit_result_balance.toLocaleString('vi-VN')} Xu` : '' }
    if (cmd === 'pending' || cmd === 'claimed')
      return { variant: 'brand' as const, label: 'Đang gửi game…', tip: `Lần thử ${d.credit_command_attempts ?? 0} — agent chưa trả kết quả` }
    if (cmd === 'failed' || cmd === 'expired')
      return { variant: 'warning' as const, label: 'Lệnh lỗi', tip: `${cmd}: ${d.credit_command_error ?? '—'}` }
    if (cmd === 'uncertain')
      return { variant: 'warning' as const, label: 'Chưa chắc chắn', tip: 'Agent nhận lệnh nhưng không trả kết quả hợp lệ — kiểm tra số dư game trước' }
    return { variant: 'brand' as const, label: 'Credited', tip: d.note ?? '' }
  }
  if (d.status === 'matched') return { variant: 'brand' as const, label: 'Chờ hàng đợi', tip: d.note ?? 'Server points chưa bật — requeue sau khi bật' }
  if (d.status === 'unmatched') return { variant: 'warning' as const, label: 'Không match', tip: `Không có tài khoản '${d.content}' — ${d.note ?? 'requeue kèm username'}` }
  if (d.status === 'rejected') return { variant: 'danger' as const, label: 'Từ chối', tip: d.note ?? '' }
  return { variant: 'default' as const, label: d.status, tip: d.note ?? '' }
}

/** Điều kiện hiện nút Requeue (§1.2): pending/claimed bị backend 400 — ẩn luôn. */
export const canRequeue = (d: DepositLike) => {
  if (d.sandbox) return false
  if (d.status === 'unmatched' || d.status === 'matched') return true
  if (d.status === 'credited') return d.credit_command_status === 'failed' || d.credit_command_status === 'expired' || d.credit_command_status === 'uncertain'
  return false
}

export const DepositStatusBadge = ({ deposit }: { deposit: DepositLike }) => {
  const b = depositBadge(deposit)
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5" title={b.tip}>
      <Badge
        variant={b.variant}
        className={b.label === 'Đang gửi game…' ? 'animate-pulse' : undefined}
      >
        {b.label}
      </Badge>
      {deposit.sandbox && <Badge variant="default" className="text-[10px]">TEST</Badge>}
      {deposit.credit_attempts > 1 && (
        <span className="rounded-full bg-surface-2 px-1.5 text-[10px] font-semibold text-muted" title={`Admin đã tạo lại event ${deposit.credit_attempts} lần`}>
          requeue ×{deposit.credit_attempts}
        </span>
      )}
    </span>
  )
}

export default DepositStatusBadge
