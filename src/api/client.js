import axios from 'axios'
import { API_BASE_URL } from '@/config/env'

/* ============================================================
 * AXIOS API CLIENT — chỉ cần import là gọi
 *
 *   import { apiGet, apiPost, apiDelete } from '@/api/client'
 *     const me   = await apiGet('/user/me')
 *     const data = await apiPost('/auth/login', { email, password })
 *
 * AUTH: access_token + refresh_token lưu trong COOKIE
 * - Production (khuyến nghị): backend set HttpOnly cookie →
 *   frontend KHÔNG đọc được token (an toàn XSS), axios tự gửi
 *   cookie nhờ withCredentials.
 * - Dev tiện dụng: { saveTokens, clearTokens } để tự set cookie
 *   ngay từ frontend nếu backend trả token trong response body.
 *
 * AUTO REFRESH: khi request gặp 401, client tự gọi /auth/refresh
 * rồi retry request gốc đúng 1 lần. Refresh chạy 1 luồng duy nhất
 * (single-flight) để tránh refresh nhiều lần song song.
 * ============================================================ */

/* ---------------- Cookie utils ---------------- */

const TOKEN_NAMES = ['access_token', 'refresh_token']

export const setCookie = (name, value, days = 1) => {
  const expires = days
    ? `; expires=${new Date(Date.now() + days * 864e5).toUTCString()}`
    : ''
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`
}

export const getCookie = (name) => {
  try {
    const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`))
    return match ? decodeURIComponent(match[2]) : null
  } catch {
    return null
  }
}

export const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

/** Lưu 2 token vào cookie (dev — production nên để backend set HttpOnly) */
export const saveTokens = ({ access_token, refresh_token, accessDays = 1, refreshDays = 30 }) => {
  if (access_token) setCookie('access_token', access_token, accessDays)
  if (refresh_token) setCookie('refresh_token', refresh_token, refreshDays)
}

/** Xoá toàn bộ token khỏi cookie */
export const clearTokens = () => {
  TOKEN_NAMES.forEach(deleteCookie)
}

export const getAccessToken = () => getCookie('access_token')

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
 * Các endpoint không auto-refresh/redirect khi gặp 401:
 * - auth: 401 là sai thông tin đăng nhập/đăng ký, không phải hết phiên.
 * - /user/me: session bootstrap; guest chưa đăng nhập phải được coi là "chưa có user",
 *   không bị đẩy sang /dang-nhap.
 */
const NO_REFRESH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/user/me',
]

const shouldSkipRefresh = (url = '') =>
  NO_REFRESH_ENDPOINTS.some((path) => String(url).startsWith(path))

/** Thực thi request, nếu 401 thì refresh rồi retry đúng 1 lần */
const execute = async (config) => {
  try {
    return await client.request(config)
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err
    if (shouldSkipRefresh(config.url)) throw err

    const ok = await refreshSession()
    if (!ok) {
      clearTokens()
      redirectTo('/dang-nhap')
      throw err
    }
    return client.request(config) // retry với cookie mới
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

/** Upload file: await apiUpload('/upload', fileObj) — tự set multipart */
export const apiUpload = (url, file, config) => {
  const fd = new FormData()
  fd.append('file', file)
  return execute({
    method: 'POST',
    url,
    data: fd,
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config,
  })
}

/** Gọi tuỳ biến hoàn toàn (download blob, đổi baseURL, ...) với mọi interceptor */
export const rawClient = client

export default { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload, rawClient, saveTokens, clearTokens }
