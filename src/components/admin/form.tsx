import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/** Class control dùng chung (input/select/textarea) trong admin. */
export const ctlCls =
  'w-full rounded-xl border border-border-c bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-60'

/** Nhãn + control + lỗi inline (validate bằng JS, KHÔNG dùng SweetAlert cho validation). */
export const Field = ({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label?: ReactNode
  htmlFor?: string
  error?: string
  hint?: ReactNode
  className?: string
  children: ReactNode
}) => (
  <div className={cn('space-y-1', className)}>
    {label && (
      <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </label>
    )}
    {children}
    {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    {error && <p className="text-xs font-medium text-red-500">{error}</p>}
  </div>
)

/**
 * Nút xác nhận 2 bước (inline, không SweetAlert): bấm lần 1 → "Xác nhận?" Có/Không.
 * Dùng cho rotate/revoke key, xoá cụm/server, tắt server.
 */
export const InlineConfirm = ({
  label,
  confirmLabel = 'Xác nhận?',
  onConfirm,
  tone = 'danger',
  size = 'sm',
  disabled,
  warning,
}: {
  label: ReactNode
  confirmLabel?: string
  onConfirm: () => Promise<void> | void
  tone?: 'danger' | 'warning' | 'primary'
  size?: 'sm' | 'default'
  disabled?: boolean
  warning?: ReactNode
}) => {
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      setArmed(false)
    }
  }

  if (!armed) {
    return (
      <Button
        type="button"
        size={size}
        variant={tone === 'danger' ? 'destructive' : tone === 'warning' ? 'secondary' : 'outline'}
        disabled={disabled || busy}
        onClick={() => setArmed(true)}
      >
        {label}
      </Button>
    )
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={cn('text-xs font-semibold', tone === 'danger' ? 'text-red-500' : 'text-amber-500')}>
        {confirmLabel}
        {warning && <span className="ml-1 font-normal text-muted">{warning}</span>}
      </span>
      <Button type="button" size="sm" variant={tone === 'danger' ? 'destructive' : 'primary'} disabled={busy} onClick={run}>
        {busy ? 'Đang…' : 'Có'}
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setArmed(false)}>
        Không
      </Button>
    </span>
  )
}

/** Nút copy text (key raw…) — feedback tại chỗ, không alert. */
export const CopyButton = ({ text, label = 'Copy' }: { text: string; label?: string }) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard bị chặn — người dùng tự bôi đen copy */
    }
  }

  return (
    <Button type="button" size="sm" variant="secondary" onClick={copy}>
      {copied ? 'Đã sao chép ✓' : label}
    </Button>
  )
}
