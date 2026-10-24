export function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(' ')
}

/**
 * URL trang trước (chỉ nhận cùng origin) để điều hướng bằng `<a href>` và
 * full reload lấy dữ liệu mới. Không có referrer hợp lệ → fallback.
 */
export function getBackHref(fallback = '/') {
  if (typeof document === 'undefined') return fallback
  const referrer = document.referrer
  if (!referrer) return fallback
  try {
    const url = new URL(referrer)
    if (url.origin !== window.location.origin) return fallback
    return `${url.pathname}${url.search}${url.hash}` || fallback
  } catch {
    return fallback
  }
}