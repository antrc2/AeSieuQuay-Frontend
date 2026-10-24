import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Toast gọn nhẹ, tự theme theo token.
 * type: 'success' | 'error' | 'info'
 */
export const Toast = ({ message, type = 'success', duration = 2500, onClose = () => {} }) => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      onClose?.()
    }, duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  if (!visible || typeof document === 'undefined') return null

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }
  const colors = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    info: 'text-primary',
  }

  return createPortal(
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-[toastIn_.25s_ease]"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border-c bg-surface px-4 py-3 shadow-xl shadow-black/20">
        <span className={`text-lg font-bold ${colors[type]}`}>{icons[type]}</span>
        <span className="text-sm font-medium text-fg">{message}</span>
      </div>
    </div>,
    document.getElementById('root'),
  )
}

export default Toast
