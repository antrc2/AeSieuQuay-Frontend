import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { apiGet, apiPost, clearTokens } from '@/api/client'

const AuthContext = createContext(null)

const USER_CACHE_KEY = 'auth:user'
const CACHE_TTL_MS = 5 * 60 * 1000

const readCache = () => {
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
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
const unwrapUser = (response) => {
  if (!response || typeof response !== 'object') return response ?? null
  const payload = 'data' in response ? response.data : response
  if (!payload || typeof payload !== 'object') return payload ?? null
  // Hỗ trợ cả `data: user` (khuyến nghị) và `data: { user }`.
  if ('user' in payload) return payload.user ?? null
  return payload
}

const writeCache = (user) => {
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

export const AuthProvider = ({ children }) => {
  const cachedUser = readCache()
  const [user, setUser] = useState(cachedUser)
  const [loading, setLoading] = useState(cachedUser ? false : true)
  const fetched = useRef(false)
  const aliveRef = useRef(true)

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
        const nextUser = unwrapUser(me)
        setUser(nextUser)
        writeCache(nextUser)
      } catch {
        if (!aliveRef.current) return
        setUser(null)
        writeCache(null)
      } finally {
        if (aliveRef.current) setLoading(false)
      }
    })()
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiPost('/auth/logout')
    } catch {
      /* ignore */
    }
    clearTokens()
    writeCache(null)
    setUser(null)
    window.location.assign('/')
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiGet('/user/me')
      const nextUser = unwrapUser(me)
      if (aliveRef.current) {
        setUser(nextUser)
        writeCache(nextUser)
      }
      return nextUser
    } catch {
      if (aliveRef.current) {
        setUser(null)
        writeCache(null)
      }
      return null
    }
  }, [])

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

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải được dùng trong AuthProvider')
  return ctx
}

export default useAuth
