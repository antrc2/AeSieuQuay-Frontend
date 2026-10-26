import { useState } from 'react'

import { requeueBankDeposit, type BankDepositAdmin } from '@/api/admin'
import { showApiError, showSuccess } from '@/utils/swal'
import { Field, ctlCls } from '@/components/admin/form'
import Modal from '@/components/admin/Modal'
import { Button } from '@/components/ui/button'
import { fmtVnd } from '@/lib/format'

/**
 * "Tạo lại event" — action DUY NHẤT trên lịch sử bank (§1.2 admin-history-api.md).
 * - unmatched: input username BẮT BUỘC (gán user + queue luôn).
 * - credited+failed/expired/uncertain, matched: confirm không input.
 * - uncertain: thêm cảnh báo đỏ kiểm tra số dư.
 * Thành công chỉ refetch dòng (row mới có credit_command_status=pending).
 */
export const RequeueDepositModal = ({
  deposit,
  onClose,
  onDone,
}: {
  deposit: BankDepositAdmin
  onClose: () => void
  onDone: (updated: BankDepositAdmin) => void
}) => {
  const needsUsername = deposit.status === 'unmatched'
  const uncertain = deposit.credit_command_status === 'uncertain'
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (needsUsername && !username.trim()) {
      setError('Nhập nickname game ĐÚNG (player phải đã đăng ký web)')
      return
    }
    setBusy(true)
    try {
      const updated = await requeueBankDeposit(deposit.id, needsUsername ? username.trim() : undefined)
      await showSuccess('Đã tạo lại lệnh credit', `Lệnh mới pending — agent sẽ nhận trong vài giây (${fmtVnd(deposit.amount_vnd)} → ${deposit.xu_amount ?? '—'} Xu).`, 2600)
      onDone(updated)
      onClose()
    } catch (err) {
      await showApiError(err, 'Không requeue được')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Tạo lại event — nạp #${deposit.id}`}
      description={`${fmtVnd(deposit.amount_vnd)} · nội dung "${deposit.content}" · ${deposit.status}${deposit.credit_command_status ? ` / ${deposit.credit_command_status}` : ''}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Đang gửi…' : 'Xác nhận requeue'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {needsUsername ? (
          <Field label="Username *" htmlFor="rq-user" error={error} hint="gán user này vào giao dịch rồi queue lệnh credit">
            <input
              id="rq-user"
              className={ctlCls}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError('')
              }}
              placeholder={deposit.content}
              autoFocus
            />
          </Field>
        ) : (
          <p className="text-sm text-muted">
            Backend sẽ phát hành command credit <b className="text-fg">ID mới</b> cho giao dịch này
            (lần tạo lại thứ {deposit.credit_attempts + 1}). Xác nhận?
          </p>
        )}

        {uncertain && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">
            ⚠ Lệnh cũ ở trạng thái <b>uncertain</b> — có thể ĐÃ chạy trong game.
            Kiểm tra số dư Xu của player TRƯỚC khi tạo lệnh mới để tránh cộng hai lần.
          </div>
        )}

        {deposit.credit_command_error && (
          <p className="text-xs text-muted">Lỗi lệnh cũ: <code className="font-mono">{deposit.credit_command_error}</code></p>
        )}
      </div>
    </Modal>
  )
}

export default RequeueDepositModal
