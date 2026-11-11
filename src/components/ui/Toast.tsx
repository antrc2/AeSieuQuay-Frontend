import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose?: () => void
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const COLORS: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-primary',
}

/**
 * Toast gọn nhẹ, tự theme theo token.
 */
export const Toast = ({ message, type = 'success', duration = 2500, onClose }: ToastProps) => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      onClose?.()
    }, duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  const container = typeof document !== 'undefined' ? document.getElementById('root') : null
  if (!visible || !container) return null

  return createPortal(
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-[toastIn_.25s_ease]"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border-c bg-surface px-4 py-3 shadow-xl shadow-black/20">
        <span className={`text-lg font-bold ${COLORS[type]}`}>{ICONS[type]}</span>
        <span className="text-sm font-medium text-fg">{message}</span>
      </div>
    </div>,
    container,
  )
}

export default Toast