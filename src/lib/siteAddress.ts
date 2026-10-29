/**
 * Địa chỉ IP công khai của server — dùng chung cho Header (nút copy), Hero,
 * FinalCTA… theo doc v2 §1: nguồn là khối động `window.DATA.server_status`
 * (`server_info` chỉ còn là fallback cho backend chưa upgrade).
 */

import { getWindowData, useMockData } from '@/config/env'
import { homePageMock } from '@/mock-data/pages'
import type { ServerStatusBlock } from '@/data/contract'

const DEFAULT_PORT = 25565

/** "host[:port]" — chỉ nối ":port" khi port khác mặc định / IP chưa chứa port. */
export const formatAddress = (ip?: string | null, port?: number | null): string => {
  if (!ip) return ''
  const ipHasPort = ip.includes(':')
  if (ipHasPort || !port || port === DEFAULT_PORT) return ip
  return `${ip}:${port}`
}

const statusFromWindow = (): ServerStatusBlock | null => {
  try {
    const raw = getWindowData() as Record<string, unknown> | null
    if (!raw) return null
    // Payload phẳng (trang home) hoặc envelope { payload: {...} }.
    const candidates = [raw, raw.payload, raw.data]
    for (const c of candidates) {
      const block = (c as Record<string, unknown> | undefined)?.server_status as
        | ServerStatusBlock
        | undefined
      if (block && typeof block.ip === 'string') return block
    }
    return null
  } catch {
    return null
  }
}

/**
 * Trả về chuỗi "play.xxx[:port]" để copy, hoặc '' khi dữ liệu chưa sẵn sàng.
 * Mock mode → địa chỉ mock; production → window.DATA.server_status (fallback server_info).
 */
export const getSiteAddress = (): string => {
  if (useMockData) {
    const s = (homePageMock as { server_status?: ServerStatusBlock }).server_status
    if (s?.ip) return formatAddress(s.ip, s.port)
    const legacy = (homePageMock as { server_info?: { ip?: string } }).server_info?.ip
    return legacy ?? ''
  }
  const st = statusFromWindow()
  if (st?.ip) return formatAddress(st.ip, st.port)
  // Fallback key cũ server_info (doc v2: server_status thắng khi có data thật).
  try {
    const raw = getWindowData() as Record<string, unknown> | null
    const info = ((raw?.payload ?? raw) as Record<string, unknown>)?.server_info as
      | { ip?: string }
      | undefined
    return info?.ip ?? ''
  } catch {
    return ''
  }
}
