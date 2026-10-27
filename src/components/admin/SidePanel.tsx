import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Panel trượt từ cạnh phải — drawer chi tiết (transfer, hồ sơ user).
 * Khác Modal: cao full, rộng vừa, không cắt ngữ cảnh danh sách bên trái.
 */
export const SidePanel = ({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[70] flex justify-end bg-black/45 backdrop-blur-[2px]"
    >
      <aside
        aria-modal="true"
        className={cn(
          'flex h-full w-full max-w-xl flex-col border-l border-border-c bg-surface shadow-2xl',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-c px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-fg">{title}</h2>
            {description && <div className="mt-0.5 text-sm text-muted">{description}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  )
}

export default SidePanel
