let cached = null

/**
 * Dữ liệu do backend nhúng vào window.DATA khi SSR render HTML
 * (production: backend trả HTML SEO có sẵn window.DATA = {...})
 */
export const getWindowData = () => {
  if (cached === null) {
    try {
      cached = window.DATA ?? null
    } catch {
      cached = false // phân biệt "đã tra rồi mà không có"
    }
  }
  return cached === false ? null : cached
}

/**
 * Environment: 'development' | 'production'
 */
export const env = import.meta.env.VITE_ENV || 'development'
export const isDev = env === 'development'
export const isProd = env === 'production'

/**
 * URL backend duy nhất (/api)
 * - dev: http://localhost:3000/api
 * - prod: /api (same-origin)
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
