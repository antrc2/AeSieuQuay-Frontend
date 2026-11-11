import axios, { type AxiosRequestConfig } from 'axios'
import { API_BASE_URL } from '@/config/env'

/* ============================================================
 * AXIOS API CLIENT — chỉ cần import là gọi
 *
 *   import { apiGet, apiPost, apiDelete } from '@/api/client'
 *     const me   = await apiGet('/user/me')
 *     const data = await apiPost('/auth/login', { email, password })
 *
 * Mọi hàm trả thẳng ENVELOPE `{ success, code, message, data, request_id }`
 * (interceptor bóc `res.data` của axios). Truyền generic để type phần `data`:
 *     const res = await apiGet<{ items: Foo[] }>('/foo')
 *
 * AUTO REFRESH: khi request gặp 401, client tự gọi /auth/refresh
 * rồi retry request gốc đúng 1 lần. Refresh chạy 1 luồng duy nhất
 * (single-flight) để tránh refresh nhiều lần song song.
 * ============================================================ */

/* ---------------- Phiên: cookie HttpOnly ----------------
 * Backend (app.py — JWT_ACCESS_COOKIE_NAME/JWT_REFRESH_COOKIE_NAME) set 2 cookie:
 *   access_token   Path=/  HttpOnly  30 phút
 *   refresh_token  Path=/  HttpOnly  7 ngày
 * JS KHÔNG BAO GIỜ chạm được 2 cookie này — muốn xóa thì gọi
 * POST /auth/logout (server expire cookie).
 */

/** Envelope JSON thống nhất của backend (core/exceptions.py::build_envelope). */
export interface ApiEnvelope<T = any> {
  success: boolean
  code: string
  message: string
  data: T
  request_id?: string
}

/* ---------------- Axios instance ---------------- */

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  withCredentials: true, // Cookie-based auth
  headers: { 'Content-Type': 'application/json' },
})

/* ---- Response: trả thẳng envelope + chuẩn hoá error ---- */
client.interceptors.response.use(
  (res) => res.data, // apiGet/apiPost trả thẳng envelope
  (err) => Promise.reject(normalizeError(err)),
)

/** Class lỗi chuẩn: err.message, err.status, err.data (envelope gốc) luôn có. */
export class ApiError extends Error {
  status: number
  data: ApiEnvelope | null

  constructor(message: string, status: number, data: ApiEnvelope | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const normalizeError = (err: unknown): ApiError => {
  if (err instanceof ApiError) return err

  const e = err as {
    response?: { status?: number; data?: ApiEnvelope }
    message?: string
    code?: string
  }
  const status = e.response?.status
  const payload = e.response?.data
  let message = payload?.message || e.message || 'Lỗi kết nối server'

  // Network fail (offline, CORS, timeout)
  if (!status && e.code === 'ERR_NETWORK') {
    message = 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.'
  }

  return new ApiError(message, status ?? 0, payload ?? null)
}

/* ---------------- Auto refresh + redirect (single-flight) ---------------- */

let refreshing: Promise<boolean> | null = null // Promise đang chạy (null = không có)

const refreshSession = (): Promise<boolean> => {
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

const redirectTo = (path: string): void => {
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
 * FRONTEND-4 §3.2: các API tiền của trang user (nap-the/chuyen-xu: action +
 * poll + balance-check) cũng IM LẶNG khi hết phiên — trang hiển thị nút
 * "Đăng nhập" tại chỗ, KHÔNG tự redirect (giữ principle trang public xem được).
 */
const NO_REFRESH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']
const SILENT_401_ENDPOINTS = [
  '/user/me',
  '/points/balance-check',
  '/points/transfers',
  '/card/charge',
  '/card/check',
  '/card/history',
  '/bank/deposits',
]

const shouldSkipRefresh = (url = ''): boolean =>
  NO_REFRESH_ENDPOINTS.some((path) => String(url).startsWith(path))

const isSilent401 = (url = ''): boolean =>
  SILENT_401_ENDPOINTS.some((path) => String(url).startsWith(path))

/** Thực thi request, nếu 401 thì refresh rồi retry đúng 1 lần */
const execute = async <T>(config: AxiosRequestConfig): Promise<ApiEnvelope<T>> => {
  try {
    return (await client.request(config)) as unknown as ApiEnvelope<T>
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err
    if (shouldSkipRefresh(config.url)) throw err

    const ok = await refreshSession()
    if (!ok) {
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
    return (await client.request(config)) as unknown as ApiEnvelope<T> // retry — ăn cookie access mới
  }
}

/* ---------------- Public API — import là dùng ---------------- */

/** GET:  const res = await apiGet('/endpoint', { params, headers?, signal? }) */
export const apiGet = <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiEnvelope<T>> =>
  execute<T>({ method: 'GET', url, ...config })

/** POST: const res = await apiPost('/auth/login', { username, password }) */
export const apiPost = <T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiEnvelope<T>> =>
  execute<T>({ method: 'POST', url, data, ...config })

/** PUT: await apiPut('/user/me', { name }) */
export const apiPut = <T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiEnvelope<T>> =>
  execute<T>({ method: 'PUT', url, data, ...config })

/** PATCH: await apiPatch('/user/me', { name }) */
export const apiPatch = <T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiEnvelope<T>> =>
  execute<T>({ method: 'PATCH', url, data, ...config })

/** DELETE: await apiDelete('/posts/1') */
export const apiDelete = <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiEnvelope<T>> =>
  execute<T>({ method: 'DELETE', url, ...config })

/** Upload file: await apiUpload('/upload', fileObj) — Content-Type để null để
 *  browser tự sinh "multipart/form-data; boundary=…" (set tay = mất boundary). */
export const apiUpload = <T = any>(url: string, file: File | Blob, config?: AxiosRequestConfig): Promise<ApiEnvelope<T>> => {
  const fd = new FormData()
  fd.append('file', file)
  return execute<T>({
    method: 'POST',
    url,
    data: fd,
    headers: { 'Content-Type': null },
    ...config,
  })
}

/** Gọi tuỳ biến hoàn toàn (download blob, đổi baseURL, ...) với mọi interceptor */
export const rawClient = client

export default { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload, rawClient }