import { useEffect, useRef, useState } from 'react'

/**
 * Cloudflare Turnstile (captcha) cho form đăng nhập / đăng ký.
 *
 * - Site key đọc từ env `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY` (khai báo trong file `.env`).
 * - Widget hiển thị VISIBLY (không hidden) nhưng ở chế độ AUTO (`appearance: 'always'`
 *   + managed challenge): Cloudflare tự động xác minh, người dùng KHÔNG cần bấm vào
 *   ô checkbox — chỉ thấy trạng thái "Đang xác minh…/Verified".
 * - Token trả về qua callback `onChange` và được gửi lên backend trong body request
 *   (field `turnstile_token`).
 * - Script Turnstile nạp lười (chỉ khi component mount).
 *
 * Logic cũ giữ nguyên: các handler submit không đổi.
 */

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          theme?: string
          size?: 'normal' | 'flexible' | 'compact'
          appearance?: 'always' | 'execute' | 'interaction-only'
          execution?: 'render' | 'execute'
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          'timeout-callback'?: () => void
        },
      ) => string
      remove: (id: string) => void
    }
    TURNSTILE_SITE_KEY?: string
  }
}

// Site key đọc từ VITE_CLOUDFLARE_TURNSTILE_SITE_KEY (env Vite).
// Nếu chưa cấu hình → fallback sang sitekey TEST chính thức của Cloudflare
// (luôn auto-pass, widget vẫn hiển thị) để dev không cần .env; khi deploy chỉ cần
// đặt sitekey thật vào `.env`, frontend không phải đổi code.
const TEST_SITEKEY = '0x4AAAAAAADnPIDROrmt1Wwj'
export const getTurnstileSiteKey = (): string => {
  const envKey = (import.meta as any)?.env?.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY as string | undefined
  return (envKey || window.TURNSTILE_SITE_KEY || TEST_SITEKEY).trim()
}

let scriptPromise: Promise<void> | null = null
const loadScript = (): Promise<void> => {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_URL
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Không tải được Cloudflare Turnstile'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

type TurnstileProps = {
  onChange: (token: string) => void
  onRetry?: () => void
}

export const Turnstile = ({ onChange, onRetry }: TurnstileProps) => {
  const siteKey = getTurnstileSiteKey()
  const holderRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onChangeRef = useRef(onChange)
  const [failed, setFailed] = useState(false)
  // phiên render hiện tại — bump khi form mount lại để widget cũ không ghi token vào form mới
  const sessionRef = useRef(0)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!siteKey) return
    sessionRef.current += 1
    const session = sessionRef.current
    let alive = true
    loadScript()
      .then(() => {
        if (!alive || !holderRef.current || widgetIdRef.current || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(holderRef.current, {
          sitekey: siteKey,
          theme: 'auto',
          size: 'flexible',
          // Hiển thị widget cho user thấy (KHÔNG hidden) nhưng auto-verify:
          // Cloudflare Managed Challenge tự xác minh, user không cần bấm checkbox.
          appearance: 'always',
          execution: 'render',
          callback: (token) => {
            if (session === sessionRef.current) onChangeRef.current(token)
          },
          'expired-callback': () => {
            if (session === sessionRef.current) onChangeRef.current('')
          },
          'error-callback': () => {
            if (session === sessionRef.current) onChangeRef.current('')
          },
          'timeout-callback': () => {
            // Turnstile tự fallback sang interactive khi timeout — xoá token cũ
            if (session === sessionRef.current) onChangeRef.current('')
          },
        })
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
      sessionRef.current += 1 // vô hiệu hoá callback của widget này
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null
      }
    }
  }, [siteKey])

  // Chưa cấu hình site key → không hiển thị gì (dev/CI chạy không cần captcha)
  if (!siteKey) return null

  if (failed) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
        <span>Không tải được captcha. Vui lòng thử lại.</span>
        <button
          type="button"
          onClick={() => {
            setFailed(false)
            scriptPromise = null
            onRetry?.()
          }}
          className="font-semibold underline underline-offset-2"
        >
          Thử lại
        </button>
      </div>
    )
  }

  return <div ref={holderRef} className="cf-turnstile min-h-[65px]" aria-label="Xác thực captcha Cloudflare" />
}

export default Turnstile
