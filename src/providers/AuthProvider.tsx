import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { apiGet, apiPost } from '@/api/client'

/** User trả từ GET /api/user/me (UserOut của backend — modules/api/user/schema.py). */
export interface AuthUser {
  id: number
  username: string
  realname: string
  email: string | null
  role_slug: string
  registered_at?: string | null
  last_login?: string | null
}

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<AuthUser | null>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_CACHE_KEY = 'auth:user'
const CACHE_TTL_MS = 5 * 60 * 1000

const readCache = (): AuthUser | null => {
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { user?: AuthUser; at?: number } | null
    if (!parsed || !parsed.user) return null
    if (parsed.at && Date.now() - parsed.at > CACHE_TTL_MS) {
      sessionStorage.removeItem(USER_CACHE_KEY)
      return null
    }
    return parsed.user
  } catch {
    return null
  }
}

/**
 * `/api/user/me` trả envelope chuẩn `{ success, code, message, data, request_id }`.
 * Chấp nhận cả trường hợp backend trả thẳng object user (tương thích ngược).
 */
const unwrapUser = (response: unknown): AuthUser | null => {
  if (!response || typeof response !== 'object') return (response as AuthUser | null) ?? null
  const envelope = response as { data?: unknown }
  const payload = 'data' in envelope ? envelope.data : response
  if (!payload || typeof payload !== 'object') return (payload as AuthUser | null) ?? null
  // Hỗ trợ cả `data: user` (khuyến nghị) và `data: { user }`.
  if ('user' in payload) return (payload as { user?: AuthUser | null }).user ?? null
  return payload as AuthUser
}

const writeCache = (user: AuthUser | null): void => {
  try {
    if (user) {
      sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, at: Date.now() }))
    } else {
      sessionStorage.removeItem(USER_CACHE_KEY)
    }
  } catch {
    /* ignore */
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const cachedUser = readCache()
  const [user, setUser] = useState<AuthUser | null>(cachedUser)
  const [loading, setLoading] = useState(cachedUser ? false : true)
  const fetched = useRef(false)
  const aliveRef = useRef(true)
  /** Lần sync /user/me gần nhất — chống gọi dồn khi tab hiện/ẩn liên tục. */
  const lastSyncRef = useRef(Date.now())

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true

    ;(async () => {
      try {
        const me = await apiGet('/user/me')
        if (!aliveRef.current) return
        lastSyncRef.current = Date.now()
        const nextUser = unwrapUser(me)
        setUser(nextUser)
        writeCache(nextUser)
      } catch {
        if (!aliveRef.current) return
        lastSyncRef.current = Date.now()
        setUser(null)
        writeCache(null)
      } finally {
        if (aliveRef.current) setLoading(false)
      }
    })()
  }, [])

  const logout = useCallback(async () => {
    try {
      // Server trả Set-Cookie expires=1970 cho 2 cookie HttpOnly — JS không xóa được chúng.
      await apiPost('/auth/logout')
    } catch {
      /* ignore */
    }
    writeCache(null)
    setUser(null)
    window.location.assign('/')
  }, [])

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const me = await apiGet('/user/me')
      const nextUser = unwrapUser(me)
      if (aliveRef.current) {
        lastSyncRef.current = Date.now()
        setUser(nextUser)
        writeCache(nextUser)
      }
      return nextUser
    } catch {
      if (aliveRef.current) {
        lastSyncRef.current = Date.now()
        setUser(null)
        writeCache(null)
      }
      return null
    }
  }, [])

  /* Tab quay lại sau >5': re-validate (kết hợp auto-refresh của client.ts —
     access hết hạn 30' nhưng refresh cookie còn 7 ngày thì phiên vẫn sống). */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastSyncRef.current < CACHE_TTL_MS) return
      refreshUser()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshUser])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải được dùng trong AuthProvider')
  return ctx
}

export default useAuth