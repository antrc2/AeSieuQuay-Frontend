/**
 * INIT THEME — chạy ngay khi app boot (import đầu tiên trong main.tsx).
 *
 * Luồng ưu tiên:
 * 1. User đã chọn theme trước đó (localStorage 'aesq-theme')
 * 2. Chưa chọn → mặc định DARK MODE
 *
 * Gắn class 'dark' lên <html> trước khi React render → không nhấp nháy.
 * `applyTheme` + `THEME_STORAGE_KEY` dùng chung với `hooks/useTheme.ts`.
 */

export type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'aesq-theme'

/** Màu thanh trình duyệt mobile theo theme. */
const THEME_COLORS: Record<Theme, string> = {
  dark: '#070b14',
  light: '#f6f8fb',
}

/** Gắn class 'dark' + đồng bộ meta theme-color (không đụng localStorage). */
export const applyTheme = (theme: Theme): void => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[theme])
}

export const initTheme = (): Theme => {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    /* private mode — vẫn chạy mặc định */
  }

  const theme: Theme = saved ? (saved === 'dark' ? 'dark' : 'light') : 'dark'
  applyTheme(theme)
  return theme
}

export default initTheme