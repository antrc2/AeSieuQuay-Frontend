import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Modal dùng chung trong khu vực admin.
 * - Đóng bằng Esc / click nền tối.
 * - Raw API key (rotate) chỉ được truyền vào đây, và bố mẹ phải xoá state khi đóng.
 */
export const Modal = ({ open, onClose, title, description, children, footer, className }: ModalProps) => {
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
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm sm:items-center"
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn('w-full max-w-lg rounded-2xl border border-border-c bg-surface shadow-2xl shadow-black/25', className)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-c px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-fg">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="-mr-1 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-4">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-c px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
