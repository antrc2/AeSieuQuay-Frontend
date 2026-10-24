/**
 * Cấu hình môi trường.
 *
 * - Development (`npm run dev`): dữ liệu lấy từ mock trong `src/mock-data`.
 * - Production (`npm run build`): dữ liệu đọc từ `window.DATA` do backend SSR nhúng.
 *
 * `VITE_DATA_SOURCE=window` ép dev đọc `window.DATA` để test shape production.
 * `VITE_DATA_SOURCE=mock` ép dùng mock kể cả trong build production.
 */

/**
 * Đọc `window.DATA` mỗi lần gọi (không cache) để không bỏ lỡ trường hợp
 * script backend nạp muộn hoặc dữ liệu bị thay thế khi test.
 */
export const getWindowData = () => {
  try {
    return window.DATA ?? null
  } catch {
    return null
  }
}

export const isDev = import.meta.env.DEV
export const isProd = import.meta.env.PROD

/** Quyết định nguồn dữ liệu trang: mock hay window.DATA. */
export const useMockData =
  import.meta.env.VITE_DATA_SOURCE === 'window'
    ? false
    : import.meta.env.VITE_DATA_SOURCE === 'mock'
      ? true
      : import.meta.env.DEV

/**
 * URL backend duy nhất (/api)
 * - dev: http://localhost:5000/api (.env.development)
 * - prod: /api (.env.production)
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/** Domain chuẩn dùng cho canonical/OG — fallback về origin hiện tại. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/+$/, '')