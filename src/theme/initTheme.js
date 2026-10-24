/**
 * INIT THEME — chạy ngay khi app boot (import đầu tiên trong main.jsx).
 *
 * Luồng ưu tiên:
 * 1. User đã chọn theme trước đó (localStorage 'aesq-theme')
 * 2. Chưa chọn → mặc định DARK MODE
 *
 * Gắn class 'dark' lên <html> trước khi React render → không nhấp nháy.
 */

const STORAGE_KEY = 'aesq-theme'

export const initTheme = () => {
  let saved = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    /* private mode — vẫn chạy mặc định */
  }

  const isDark = saved ? saved === 'dark' : true // mặc định dark

  document.documentElement.classList.toggle('dark', isDark)

  // Đồng bộ màu thanh trình duyệt trên mobile
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', isDark ? '#070b14' : '#f6f8fb')

  return isDark ? 'dark' : 'light'
}

export default initTheme
