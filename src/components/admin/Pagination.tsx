import { cn } from '@/lib/utils'

interface Props {
  /** 1-based */
  page: number
  total: number
  limit: number
  onChange: (page: number) => void
  className?: string
}

/** "Hiển thị 21–40 / 1.248" + nút ‹ › — ẩn khi total <= limit. */
export function Pagination({ page, total, limit, onChange, className }: Props) {
  if (total <= limit) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  const pages = Math.ceil(total / limit)
  const canPrev = page > 1
  const canNext = page * limit < total

  const btnCls =
    'inline-flex h-8 items-center rounded-lg border border-border-c bg-surface px-2.5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className={cn('flex items-center justify-between gap-3 border-t border-border-c px-4 py-3', className)}>
      <p className="text-xs tabular-nums text-muted">
        Hiển thị {from}–{to} / {total.toLocaleString('vi-VN')}
      </p>
      <div className="flex items-center gap-1.5">
        <button type="button" className={btnCls} disabled={!canPrev} onClick={() => onChange(1)} aria-label="Trang đầu">
          «
        </button>
        <button type="button" className={btnCls} disabled={!canPrev} onClick={() => onChange(page - 1)} aria-label="Trang trước">
          ‹
        </button>
        <span className="px-1 text-xs tabular-nums text-muted">
          {page} / {pages}
        </span>
        <button type="button" className={btnCls} disabled={!canNext} onClick={() => onChange(page + 1)} aria-label="Trang sau">
          ›
        </button>
        <button type="button" className={btnCls} disabled={!canNext} onClick={() => onChange(pages)} aria-label="Trang cuối">
          »
        </button>
      </div>
    </div>
  )
}

export default Pagination
