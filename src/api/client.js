import axios from 'axios'
import { API_BASE_URL } from '@/config/env'

/* ============================================================
 * AXIOS API CLIENT — chỉ cần import là gọi
 *
 *   import { apiGet, apiPost, apiDelete } from '@/api/client'
 *     const me   = await apiGet('/user/me')
 *     const data = await apiPost('/auth/login', { email, password })
 *
 * AUTO REFRESH: khi request gặp 401, client tự gọi /auth/refresh
 * rồi retry request gốc đúng 1 lần. Refresh chạy 1 luồng duy nhất
 * (single-flight) để tránh refresh nhiều lần song song.
 * ============================================================ */

/* ---------------- Phiên: cookie HttpOnly ----------------
 * Backend (app.py — JWT_ACCESS_COOKIE_NAME/JWT_REFRESH_COOKIE_NAME) set 2 cookie:
 *   access_token   Path=/  HttpOnly  30 phút
 *   refresh_token  Path=/  HttpOnly  7 ngày
 * Tên + path thống nhất 1-1 với backend từ 26/10 (trước là *_cookie,
 * refresh nằm Path=/api/auth gây ảo giác "biến mất" khi đổi trang).
 * JS KHÔNG BAO GIỜ chạm được 2 cookie này — muốn xóa thì gọi
 * POST /auth/logout (server expire cả tên mới lẫn tên cũ).
 */

const SESSION_COOKIE_NAMES = ['access_token', 'refresh_token']

/** Best-effort dọn cookie do CHÍNH JS set (legacy `saveTokens` cũ để lại);
 *  cookie HttpOnly thì server lo (POST /auth/logout). */
export const clearLocalCookies = () => {
  // for (const name of [...SESSION_COOKIE_NAMES]) {
  //   document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  //   document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/auth;`
  // }
}

/* ---------------- Axios instance ---------------- */

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  withCredentials: true, // Cookie-based auth
  headers: { 'Content-Type': 'application/json' },
})

/* ---- Response: trả thẳng data + chuẩn hoá error ---- */
client.interceptors.response.use(
  (res) => res.data, // apiGet/apiPost trả thẳng payload
  (err) => Promise.reject(normalizeError(err)),
)

/** Class lỗi chuẩn: err.message, err.status, err.data luôn có */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const normalizeError = (err) => {
  if (err instanceof ApiError) return err

  const status = err.response?.status
  const payload = err.response?.data
  let message = payload?.message || err.message || 'Lỗi kết nối server'

  // Network fail (offline, CORS, timeout)
  if (!status && err.code === 'ERR_NETWORK') {
    message = 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.'
  }


  return new ApiError(message, status ?? 0, payload)
}

/* ---------------- Auto refresh + redirect (single-flight) ---------------- */

let refreshing = null // Promise đang chạy (null = không có)

const refreshSession = () => {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_BASE_URL}/auth/refresh`, null, {
        withCredentials: true,
        timeout: 15_000,
      })
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshing = null // cho phép refresh ở lần sau
      })
  }
  return refreshing
}

const redirectTo = (path) => {
  if (window.location.pathname !== path) window.location.assign(path)
}

/**
 * Hai khái niệm tách biệt:
 * - NO_REFRESH: 401 ở đây là nghiệp vụ (sai mật khẩu...), KHÔNG phải hết phiên
 *   → không refresh, không redirect.
 * - SILENT_401: refresh cũng thất bại → KHÔNG redirect /dang-nhap; khách vãng
 *   lai phải được xem trang. /user/me thuộc nhóm này — trước đây nó nằm trong
 *   NO_REFRESH nên access token hết hạn 30' là mất phiên giả (bug #2):
 *   giờ nó ĐƯỢC thử /auth/refresh, chỉ im lặng khi refresh cũng hết hạn.
 */
const NO_REFRESH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']
const SILENT_401_ENDPOINTS = ['/user/me']

const shouldSkipRefresh = (url = '') =>
  NO_REFRESH_ENDPOINTS.some((path) => String(url).startsWith(path))

const isSilent401 = (url = '') =>
  SILENT_401_ENDPOINTS.some((path) => String(url).startsWith(path))

/** Thực thi request, nếu 401 thì refresh rồi retry đúng 1 lần */
const execute = async (config) => {
  try {
    return await client.request(config)
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err
    if (shouldSkipRefresh(config.url)) throw err

    const ok = await refreshSession()
    if (!ok) {
      clearLocalCookies()
      if (isSilent401(config.url)) throw err
      // /user/me fail im lặng → AuthProvider tự xử lý "chưa đăng nhập"
      try {
        await apiPost('/auth/logout')
      } catch {
        /* cookie đã hết hạn — server không còn gì để dọn */
      }
      redirectTo('/dang-nhap')
      throw err
    }
    return client.request(config) // retry — /user/me giờ ăn cookie access mới
  }
}

/* ---------------- Public API — import là dùng ---------------- */

/** GET:  const data = await apiGet('/endpoint', { params, headers?, signal? }) */
export const apiGet = (url, config) => execute({ method: 'GET', url, ...config })

/**
 * @template T = any
 * @param {string} url
 * @param {unknown} [data]
 * @param {import('axios').AxiosRequestConfig} [config]
 * @returns {Promise<{success?: boolean, code?: string, message?: string, data?: any, [k: string]: any}>}
 */
export const apiPost = (url, data, config) => execute({ method: 'POST', url, data, ...config })

/** PUT: await apiPut('/user/me', { name }) */
export const apiPut = (url, data, config) => execute({ method: 'PUT', url, data, ...config })

/** PATCH: await apiPatch('/user/me', { name }) */
export const apiPatch = (url, data, config) => execute({ method: 'PATCH', url, data, ...config })

/** DELETE: await apiDelete('/posts/1') */
export const apiDelete = (url, config) => execute({ method: 'DELETE', url, ...config })

/** Upload file: await apiUpload('/upload', fileObj) — Content-Type để null để
 *  browser tự sinh "multipart/form-data; boundary=…" (set tay = mất boundary). */
export const apiUpload = (url, file, config) => {
  const fd = new FormData()
  fd.append('file', file)
  return execute({
    method: 'POST',
    url,
    data: fd,
    headers: { 'Content-Type': null },
    ...config,
  })
}

/** Gọi tuỳ biến hoàn toàn (download blob, đổi baseURL, ...) với mọi interceptor */
export const rawClient = client

export default { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload, rawClient, clearLocalCookies }
