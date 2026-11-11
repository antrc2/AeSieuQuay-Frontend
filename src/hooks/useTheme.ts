import { useEffect, useSyncExternalStore } from 'react'

import { applyTheme, THEME_STORAGE_KEY, type Theme } from '@/theme/initTheme'

const listeners = new Set<() => void>()

const notify = (): void => {
  listeners.forEach((fn) => fn())
}

const getSnapshot = (): Theme =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light'

export function useTheme(): Theme {
  const theme = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => {
        listeners.delete(onChange)
      }
    },
    getSnapshot,
    () => 'dark' as Theme,
  )

  useEffect(() => {
    // Theo dõi thay đổi từ tab khác
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        applyTheme(e.newValue === 'dark' ? 'dark' : 'light')
        notify()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return theme
}

export function toggleTheme(): Theme {
  const next: Theme = getSnapshot() === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    /* private mode */
  }
  applyTheme(next)
  notify()
  return next
}