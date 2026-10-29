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
import { homePageMock, machineDetailsMock, machineListPageMock, topupPageMock, transferPageMock } from '@/mock-data/pages'
import { generateMachineDetail } from '@/mock-data/generate'

import {
  isHomePayload,
  isMachineDetailPayload,
  isMachineListPayload,
  isObject,
  isTopupPayload,
  isTransferPayload,
  normalizeSlug,
  readWindowData,
  type CaptchaConfig,
  type DataResult,
  type HomePayload,
  type MachineDetailPayload,
  type MachineListPayload,
  type SiteData,
  type TopupPayload,
  type TransferPagePayload,
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
  // Mock viết tay bằng JS → literal union bị suy diễn thành string; cast tại ranh giới mock.
  if (useMockData) return ok(homePageMock as HomePayload)

  const w = readWindowData()
  if (!w) return missing()
  if (w.notFound || w.page === 'not_found') return notFound()
  if (isHomePayload(w.payload)) return ok(w.payload, 'window')

  return missing()
}

/* ================= Captcha (doc v2 §3) ================= */

/**
 * Site key Cloudflare Turnstile cho form login/register.
 * Nguồn: `window.DATA.captcha.site_key` — backend NHÉT CẢ 2 shape:
 *   - payload phẳng `{ captcha: {...} }` (trang home), và
 *   - envelope `{ page: 'auth', payload: { captcha: {...} } }` (trang /dang-nhap, /dang-ky).
 * Reader chấp cả hai để không phụ thuộc chốt cuối của backend.
 * `site_key === null` (hoặc thiếu block) = backend chưa bật captcha (dev) → FE ẩn widget, submit thẳng.
 */
export const getCaptchaConfig = (): CaptchaConfig | null => {
  if (useMockData) return (homePageMock as HomePayload).captcha ?? { site_key: null }

  const w = readWindowData()
  if (!w) return null

  const fromPayload = (payload: unknown): CaptchaConfig | null => {
    if (!isObject(payload)) return null
    const cap = payload.captcha
    if (!isObject(cap)) return null
    return { site_key: typeof cap.site_key === 'string' ? cap.site_key : null }
  }

  return fromPayload(w.payload) ?? fromPayload(w)
}

/* ================= Danh sách máy chủ ================= */

export const getMachineListData = (): DataResult<MachineListPayload> => {
  if (useMockData) return ok(machineListPageMock as MachineListPayload)

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
    const detail = (machineDetailsMock as Record<string, MachineDetailPayload>)[normalized]
    if (detail) return ok(detail)
    // Slug lạ ở development: sinh dữ liệu giả ổn định để luôn render được UI.
    return ok(generateMachineDetail(normalized) as MachineDetailPayload)
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

/**
 * Backend-4 §2.1 trả `my` PHẲNG (`{username, realname, card_history, bank_history}`);
 * contract FRONTEND-4 §1 chuẩn hoá về `my.user`. Reader chấp nhận cả hai shape
 * để không vỡ khi backend chốt một trong hai.
 */
const normalizeTopupPayload = (raw: Record<string, unknown>): TopupPayload => {
  const my = raw.my as Record<string, unknown> | null | undefined
  if (my && !isObject(my.user)) {
    return {
      ...(raw as unknown as TopupPayload),
      my: {
        user: { username: String(my.username ?? ''), realname: String(my.realname ?? '') },
        card_history: Array.isArray(my.card_history) ? my.card_history : [],
        bank_history: Array.isArray(my.bank_history) ? my.bank_history : [],
      },
    }
  }
  return raw as unknown as TopupPayload
}

export const getTopupPageData = (): DataResult<TopupPayload> => {
  // Mock viết tay bằng JS → literal union bị suy diễn thành string; cast tại ranh giới mock.
  if (useMockData) return ok(topupPageMock as unknown as TopupPayload)

  const w = readWindowData()
  if (!w) return missing()
  if (w.notFound || w.page === 'not_found') return notFound()

  if ((w.page === 'topup' || !w.page) && isTopupPayload(w.payload)) {
    return ok(normalizeTopupPayload(w.payload as unknown as Record<string, unknown>), 'window')
  }

  return missing()
}

/* ================= Chuyển xu (/chuyen-xu) ================= */

/** Backend-4 §3.2 trả `my` phẳng `{username, transfers}` — chuẩn hoá giống topup. */
const normalizeTransferPayload = (raw: Record<string, unknown>): TransferPagePayload => {
  const my = raw.my as Record<string, unknown> | null | undefined
  if (my && !isObject(my.user)) {
    return {
      ...(raw as unknown as TransferPagePayload),
      my: {
        user: { username: String(my.username ?? ''), realname: String(my.realname ?? '') },
        transfers: Array.isArray(my.transfers) ? my.transfers : [],
      },
    }
  }
  return raw as unknown as TransferPagePayload
}

export const getTransferPageData = (): DataResult<TransferPagePayload> => {
  if (useMockData) return ok(transferPageMock as unknown as TransferPagePayload)

  const w = readWindowData()
  if (!w) return missing()
  if (w.notFound || w.page === 'not_found') return notFound()

  if ((w.page === 'transfer' || !w.page) && isTransferPayload(w.payload)) {
    return ok(normalizeTransferPayload(w.payload as unknown as Record<string, unknown>), 'window')
  }

  return missing()
}

export { useMockData }
// DataResult được re-export từ block `export type { ... } from './contract'` dưới đây.
export type {
  CaptchaConfig,
  HomePayload,
  MachineDetailPayload,
  MachineListPayload,
  ServerStatusBlock,
  SiteData,
  TopDonatorsBlock,
  TopupPayload,
  TransferPagePayload,
} from './contract'
export type { DataResult } from './contract'