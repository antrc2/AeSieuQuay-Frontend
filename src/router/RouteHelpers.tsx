import { useEffect } from 'react'
import { Outlet, useParams } from 'react-router-dom'

/** Layout rỗng để gắn errorElement cho toàn bộ cây route. */
export const RootLayout = () => <Outlet />

/**
 * Redirect legacy bằng full reload để trang đích nhận `window.DATA` mới từ backend.
 * Backend nên trả 301 thật cho các URL này.
 */
export const LegacyRedirect = ({ to }: { to: string }) => {
  useEffect(() => {
    window.location.replace(to)
  }, [to])

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-8 text-center text-muted">
      Đang chuyển hướng…
    </div>
  )
}

export const LegacySlugRedirect = () => {
  const { slug = '' } = useParams()

  useEffect(() => {
    window.location.replace(`/may-chu/${encodeURIComponent(slug)}`)
  }, [slug])

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-8 text-center text-muted">
      Đang chuyển hướng…
    </div>
  )
}