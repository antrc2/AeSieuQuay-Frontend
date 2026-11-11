import { useEffect, useState } from 'react'

import { doCheckin, getCheckinStatus, type CheckinStatus } from '@/api/admin'
import { showApiError, showSuccess } from '@/utils/swal'
import useAuth from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Điểm danh hằng ngày (trang chủ): mỗi ngày +1 Xu, cộng qua agent AESQ-Points
 * (server "Nhận Xu nạp"). Guest → nút đăng nhập.
 */
export const CheckinCard = ({ className }: { className?: string }) => {
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<CheckinStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) {
      setStatus(null)
      return
    }
    let alive = true
    getCheckinStatus()
      .then((s) => { if (alive) setStatus(s) })
      .catch(() => { /* 401/khác → ẩn nội dung, không phá trang */ })
    return () => { alive = false }
  }, [user])

  if (authLoading) return null

  if (!user) {
    return (
      <div className={cn('mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-3 rounded-2xl border border-border-c bg-surface/70 px-5 py-4 text-center text-sm', className)}>
        <span className="text-muted">Đăng nhập để điểm danh nhận Xu mỗi ngày.</span>
        <a
          href="/dang-nhap"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
        >
          Đăng nhập
        </a>
      </div>
    )
  }

  if (!status) return null
  if (!status.enabled) return null

  const handleCheckin = async () => {
    setBusy(true)
    try {
      const res = await doCheckin()
      setStatus({
        enabled: res.enabled,
        reward_xu: res.reward_xu,
        checked_today: true,
        total_days: res.total_days,
        streak: res.streak,
        next_reset_at: res.next_reset_at,
      })
      await showSuccess(
        `Điểm danh thành công +${res.reward_xu} Xu`,
        res.command_id ? 'Xu sẽ được cộng khi agent xử lý xong.' : 'Server chưa sẵn sàng — admin sẽ xử lý sau.',
      )
    } catch (err) {
      await showApiError(err, 'Không điểm danh được')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-4 rounded-2xl border border-border-c bg-surface/70 px-5 py-4', className)}>
      <div className="text-center sm:text-left">
        <p className="text-sm font-bold text-fg">🎁 Điểm danh hằng ngày</p>
        <p className="text-xs text-muted">
          +{status.reward_xu} Xu mỗi ngày · Chuỗi {status.streak} ngày · Tổng {status.total_days} ngày
        </p>
      </div>
      {status.checked_today ? (
        <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-500">
          ✅ Đã điểm danh hôm nay
        </span>
      ) : (
        <Button onClick={handleCheckin} disabled={busy}>
          {busy ? 'Đang điểm danh…' : `Điểm danh +${status.reward_xu} Xu`}
        </Button>
      )}
    </div>
  )
}

export default CheckinCard