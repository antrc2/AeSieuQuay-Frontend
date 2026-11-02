import { useEffect } from 'react'
import { Gift, X } from 'lucide-react'

import CheckinCard from '@/components/CheckinCard'
import useAuth from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

/**
 * Dialog điểm danh mở từ navbar (Header).
 * - Khách: CheckinCard tự hiện CTA đăng nhập (không redirect).
 * - User: form trạng thái + nút điểm danh (+Xu, chuỗi ngày).
 * CSRF: xử lý trong doCheckin() (API), dialog không cần biết.
 */
export const CheckinDialog = ({ open, onClose }) => {
  const { loading } = useAuth()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Điểm danh hằng ngày"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-border-c bg-surface shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border-c px-5 py-4">
          <p className="flex items-center gap-2 text-base font-bold text-fg">
            <Gift className="h-4 w-4 text-primary" aria-hidden />
            Điểm danh hằng ngày
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-c bg-surface-2 text-muted transition-colors hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3" aria-hidden>
              <div className="h-4 w-40 animate-pulse rounded bg-surface-2" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-surface-2" />
            </div>
          ) : (
            <CheckinCard className={cn('mt-0 max-w-none')} />
          )}
          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
            Mỗi ngày 1 lần · Reset 00:00 (giờ Việt Nam) · Xu được cộng vào máy chủ nhận Xu của cụm.
          </p>
        </div>
      </div>
    </div>
  )
}

export default CheckinDialog