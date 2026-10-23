import { useEffect, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'aesq-theme'
const listeners = new Set()

function getSnapshot() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    getSnapshot,
    () => 'dark',
  )

  useEffect(() => {
    // Theo dõi thay đổi từ tab khác
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        apply(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return theme
}

function apply(value) {
  document.documentElement.classList.toggle('dark', value === 'dark')
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', value === 'dark' ? '#070b14' : '#f6f8fb')
  listeners.forEach((fn) => fn())
}

export function toggleTheme() {
  const next = getSnapshot() === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch (e) {
    /* private mode */
  }
  apply(next)
  return next
}
