/** Format helpers cho trang admin (locale vi-VN). */

export const fmtDateTime = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return '—'
  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('vi-VN', { hour12: false })
}

export const fmtTime = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleTimeString('vi-VN', { hour12: false })
}

export const fmtNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toLocaleString('vi-VN')
}

export const fmtBytes = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—'
  const gb = value / 1024 ** 3
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  return `${(value / 1024 ** 2).toFixed(0)} MB`
}

/** UUID/transfer rút gọn để hiển thị trong bảng. */
export const shortId = (id: string | null | undefined, size = 8) => {
  if (!id) return '—'
  return id.length > size * 2 ? `${id.slice(0, size)}…${id.slice(-4)}` : id
}

export const timeAgo = (ms: number | null | undefined) => {
  if (!ms) return '—'
  const diff = Date.now() - ms
  if (diff < 60_000) return 'vừa xong'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`
  return `${Math.floor(diff / 86_400_000)} ngày trước`
}

/* ================= FRONTEND-3 — format tiền/thời gian cho trang lịch sử ================= */

const VN_TZ = 'Asia/Ho_Chi_Minh'

/** 1.000.000 ₫ */
export const fmtVnd = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `${new Intl.NumberFormat('vi-VN').format(n)} ₫`

/** 2.500 Xu */
export const fmtXu = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `${new Intl.NumberFormat('vi-VN').format(n)} Xu`

/** epoch ms (*_at_ms của backend) → "26/10/2026, 21:35" giờ VN — mọi transaction_date_ms dùng cái này. */
export const fmtDateTimeMs = (ms: number | null | undefined) => {
  if (!ms || !Number.isFinite(ms)) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: VN_TZ,
  }).format(new Date(ms))
}

/**
 * ISO naive UTC (`created_at`/`credited_at` từ MySQL) → giờ VN.
 * Backend trả chuỗi KHÔNG có 'Z' (đã là UTC) → bù 'Z' trước khi parse;
 * chuỗi đã có timezone (Z/±hh:mm) thì giữ nguyên.
 */
export const fmtIsoVN = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const raw = String(iso).trim()
  const fixed = /Z$|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`
  const date = new Date(fixed)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: VN_TZ,
  }).format(date)
}

/** epoch ms → "2 phút trước" (dùng cho updated_at_ms của stats). */
export const fmtAgoMs = (ms: number | null | undefined) => timeAgo(ms)

/** '1234567890' → '******7890' — code thẻ (backend đã mask, đây là lớp phụ). */
export const maskTail = (s: string | null | undefined, keep = 4) => {
  if (!s) return '—'
  return '*'.repeat(Math.max(0, s.length - keep)) + s.slice(-keep)
}

/** ISO naive-UTC (đã bù Z) → epoch ms; sai → 0. Dùng cho timeAgo(iso). */
export const isoToMs = (iso: string | null | undefined): number => {
  if (!iso) return 0
  const raw = String(iso).trim()
  const fixed = /Z$|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`
  const ms = new Date(fixed).getTime()
  return Number.isFinite(ms) ? ms : 0
}

/** khoảng ms → "3 ngày" / "5 giờ" / "12 phút" — thanh uptime, playtime. */
export const fmtDuration = (ms: number | null | undefined) => {
  if (!ms || ms < 0) return '—'
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `${min}p`
  const h = Math.floor(min / 60)
  if (h < 48) return `${h}h${min % 60 ? ` ${min % 60}p` : ''}`
  return `${Math.floor(h / 24)} ngày`
}
