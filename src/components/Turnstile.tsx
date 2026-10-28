import { useRef, useState } from 'react'
import { Turnstile as CfTurnstile } from '@marsidev/react-turnstile'

import { isDev } from '@/config/env'

/**
 * Cloudflare Turnstile (captcha) cho form đăng nhập / đăng ký.
 *
 * - Site key đọc từ `window.TURNSTILE_SITE_KEY` (backend SSR nhúng vào shell HTML,
 *   cấu hình qua TURNSTILE_SITE_KEY trên Flask) — ưu tiên số 1 vì FE/BE cùng nguồn.
 * - Fallback: `VITE_TURNSTILE_SITE_KEY` (file .env lúc build).
 * - dev mà chưa cấu hình gì → dùng test key của Cloudflare (luôn pass, hiện widget "test").
 * - prod mà chưa cấu hình → component tự ẩn (không chặn form); backend bắt buộc
 *   phải verify `turnstile_token` trong body /api/auth/login & /api/auth/register.
 *
 * Token giao ra qua `onToken(token)`; token hết hạn/bị xoá báo về chuỗi rỗng.
 */

/** Test key chính thức của Cloudflare — chỉ dùng khi dev, luôn auto-pass. */
const DEV_TEST_SITEKEY = '1x00000000000000000000AA'

declare global {
  interface Window {
    TURNSTILE_SITE_KEY?: string
  }
}

export const getTurnstileSiteKey = (): string | null => {
  const injected = typeof window !== 'undefined' ? window.TURNSTILE_SITE_KEY : undefined
  const envKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
  const key = (injected || envKey || '').trim()
  if (key) return key
  return isDev ? DEV_TEST_SITEKEY : null
}

export interface TurnstileProps {
  /** Nhận token (string rỗng = token đã hết hạn/lỗi). */
  onToken: (token: string) => void
  className?: string
}

export const Turnstile = ({ onToken, className = '' }: TurnstileProps) => {
  const [siteKey] = useState<string | null>(() => getTurnstileSiteKey())
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  // Chưa cấu hình ở production → ẩn widget, form hoạt động như cũ (backend sẽ chặn nếu bắt buộc).
  if (!siteKey) return null

  return (
    <div className={className}>
      <CfTurnstile
        siteKey={siteKey}
        options={{ theme: 'auto', size: 'flexible', appearance: 'always' }}
        onSuccess={(token: string) => onTokenRef.current(token)}
        onExpire={() => onTokenRef.current('')}
        onError={() => onTokenRef.current('')}
      />
    </div>
  )
}

export default Turnstile
