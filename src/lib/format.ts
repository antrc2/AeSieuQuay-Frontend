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
