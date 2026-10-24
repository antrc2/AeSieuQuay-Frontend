/**
 * Data layer duy nhất của frontend.
 *
 * - development (hoặc VITE_DATA_SOURCE=mock): trả mock từ `src/mock-data`.
 * - production : chỉ đọc `window.DATA` do backend SSR nhúng.
 *
 * Không có fallback mock ở production. Thiếu dữ liệu → `missing`;
 * slug/trang không tồn tại → `not_found`.
 */

import { useMockData } from '@/config/env'
import { homePageMock, machineListPageMock, topupPageMock } from '@/mock-data/pages'
import { generateMachineDetail } from '@/mock-data/generate'

import {
  isHomePayload,
  isMachineDetailPayload,
  isMachineListPayload,
  isObject,
  normalizeSlug,
  readWindowData,
  type DataResult,
  type HomePayload,
  type MachineDetailPayload,
  type MachineListPayload,
  type SiteData,
  type TopupPayload,
} from './contract'
import { resolveSiteData } from './site'

const ok = <T>(data: T, source: 'mock' | 'window' = 'mock'): DataResult<T> => ({
  status: 'ok',
  source,
  data,
})

const missing = <T>(): DataResult<T> => ({ status: 'missing' })
const notFound = <T>(): DataResult<T> => ({ status: 'not_found' })

/* ================= Site chrome ================= */

/** Menu Header, Footer và thông tin server dùng chung mọi trang. */
export const getSiteData = (): SiteData => {
  if (useMockData) {
    return resolveSiteData(
      {
        header: homePageMock.header,
        footer: homePageMock.footer,
        server_info: homePageMock.server_info,
      },
      homePageMock,
    )
  }

  const w = readWindowData()
  const homePayload = isHomePayload(w?.payload) ? w.payload : null
  return resolveSiteData(w?.site, homePayload)
}

/* ================= Trang chủ ================= */

export const getHomePageData = (): DataResult<HomePayload> => {
  if (useMockData) return ok(homePageMock)

  const w = readWindowData()
  if (!w) return missing()
  if (w.notFound || w.page === 'not_found') return notFound()
  if (isHomePayload(w.payload)) return ok(w.payload, 'window')

  return missing()
}

/* ================= Danh sách máy chủ ================= */

export const getMachineListData = (): DataResult<MachineListPayload> => {
  if (useMockData) return ok(machineListPageMock)

  const w = readWindowData()
  if (!w) return missing()
  if (w.notFound || w.page === 'not_found') return notFound()

  // Envelope mới: { page: 'machine_list', payload: { title, subtitle, modes } }
  if (w.page === 'machine_list' && isMachineListPayload(w.payload)) {
    return ok(w.payload, 'window')
  }

  // Payload phẳng: { title, subtitle, modes }
  if (!w.page && isMachineListPayload(w.payload)) {
    return ok(w.payload, 'window')
  }

  return missing()
}

/* ================= Chi tiết máy chủ ================= */

export const getMachineDetailData = (slug: string): DataResult<MachineDetailPayload> => {
  const normalized = normalizeSlug(slug)

  if (useMockData) {
    // Trả đúng object mock, không thêm field phụ (giống payload backend).
    const fromList = machineListPageMock.modes.find((mode) => mode.slug === normalized)
    if (fromList) return ok(fromList as MachineDetailPayload)
    // Slug lạ ở development: sinh dữ liệu giả ổn định để luôn render được UI.
    return ok(generateMachineDetail(normalized))
  }

  const w = readWindowData()
  if (!w) return missing()
  if (w.notFound || w.page === 'not_found') return notFound()

  const payload =
    w.page === 'machine_detail' && isMachineDetailPayload(w.payload)
      ? w.payload
      : isMachineDetailPayload(w.payload)
        ? w.payload
        : null

  if (!payload) return missing()
  // Backend có thể trả detail khác slug (cache/route sai) → coi như không tồn tại.
  if (payload.slug && normalizeSlug(payload.slug) !== normalized) return notFound()

  return ok(payload, 'window')
}

/* ================= Nạp thẻ ================= */

export const getTopupPageData = (): DataResult<TopupPayload> => {
  if (useMockData) return ok(topupPageMock)

  const w = readWindowData()
  if (!w) return missing()
  if (w.notFound || w.page === 'not_found') return notFound()

  if (w.page === 'topup' && isObject(w.payload)) {
    return ok(w.payload as TopupPayload, 'window')
  }
  if (!w.page && isObject(w.payload)) {
    return ok(w.payload as TopupPayload, 'window')
  }

  return missing()
}

export { useMockData }
export type {
  DataResult,
  HomePayload,
  MachineDetailPayload,
  MachineListPayload,
  SiteData,
  TopupPayload,
}