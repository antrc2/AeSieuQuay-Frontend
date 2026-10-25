/**
 * Contract dữ liệu giữa backend SSR và frontend.
 *
 * BACKEND CẦN CUNG CẤP:
 * - Mỗi URL SPA (`/`, `/may-chu`, `/may-chu/<slug>`, `/nap-the`, `/dang-nhap`,
 *   `/dang-ky`) trả HTML đầy đủ SEO + `<div id="root">` + script ở cuối body:
 *
 *     window.DATA = {
 *       page: 'home' | 'machine_list' | 'machine_detail' | 'topup' | 'auth',
 *       payload: { ...dữ liệu riêng của trang... },
 *       site: { header, footer, server_info },   // nên có ở mọi trang
 *       seo: { title, description, canonical, og_image, robots },
 *       notFound: false,
 *     }
 *
 * - Trang chủ hiện tại backend phát payload PHẲNG (header, hero, server_info,
 *   game_modes, highlights, gallery, community, footer) — reader vẫn hỗ trợ.
 * - Slug không tồn tại: trả HTTP 404 + `notFound: true` để frontend render NotFound.
 * - URL cũ `/che-do-choi*`: backend nên 301 sang `/may-chu*`.
 *
 * Frontend KHÔNG dùng mock ở production. Mock chỉ dùng khi phát triển.
 */

import { getWindowData } from '@/config/env'

/* ================= Payload types ================= */

export interface MenuItem {
  label: string
  to: string
}

export interface HeaderData {
  menu?: MenuItem[]
  cta?: { label: string; to: string }
}

export interface HeroImage {
  id?: number | string
  src: string
  alt?: string
}

export interface HeroData {
  name?: string
  tagline?: string
  description?: string
  cta?: { primary?: string; secondary?: string }
  discord_url?: string | null
  bg_image?: string | null
  images?: HeroImage[]
  slideshow_interval?: number
}

export interface ServerInfo {
  ip?: string
  online?: boolean | null
  players?: { online: number; max: number } | null
  version?: string | null
}

export interface GameModeSummary {
  slug: string
  name: string
  tagline?: string
  short_desc?: string
  status?: string
  image?: string | null
}

/* ================= Cluster stats (backend.md mục 0.1) ================= */

export interface ClusterStatsServerStatus {
  server_key: string
  name: string
  role: string // 'proxy' | 'lobby' | 'game'
  online: boolean
  maintenance: boolean
  players_online: number | null
  players_max: number | null
}

export interface ClusterStats {
  cluster: { id: number; slug: string; name: string }
  scope: string // 'cluster' | 'game' | 'group:<slug>'
  status: 'online' | 'offline' | 'maintenance'
  updated_at_ms: number
  players: { online: number; max: number } | null
  tps: { avg_1m: number } | null
  uptime: { percent_7d: number | null; window_hours: number } | null
  servers: { total: number; online: number }
  server_status: ClusterStatsServerStatus[]
}

export interface ClusterSummary {
  id?: number
  slug: string
  name: string
  description?: string | null
}

export interface GalleryImage {
  id?: number | string
  title?: string
  alt?: string
  /** Backend dùng `src_asset`; `src` được chấp nhận để tương thích mock cũ. */
  src_asset?: string | null
  src?: string | null
  width?: number
  height?: number
}

export interface SocialLink {
  icon?: string
  label: string
  url: string
}

export interface FooterColumn {
  title: string
  links: MenuItem[]
}

export interface FooterData {
  columns?: FooterColumn[]
  socials?: SocialLink[]
  copyright?: string
}

export interface SiteData {
  header: HeaderData
  footer: FooterData
  server_info: ServerInfo
}

export interface HomePayload {
  header?: HeaderData
  hero?: HeroData
  server_info?: ServerInfo
  game_modes?: {
    title?: string
    subtitle?: string
    modes?: GameModeSummary[]
  }
  /** Stat cụm thật — backend override `server_info.players` từ đây. null → ẩn strip. */
  stats?: ClusterStats | null
  highlights?: {
    title?: string
    subtitle?: string
    items?: Array<{ icon?: string; title: string; desc?: string }>
  }
  gallery?: {
    title?: string
    description?: string
    subtitle?: string
    images?: GalleryImage[]
  }
  community?: {
    title?: string
    description?: string
    socials?: SocialLink[]
  }
  footer?: FooterData
}

/**
 * Trang /may-chu/<slug>: nội dung dài KHÔNG còn là field cấu trúc —
 * admin soạn tự do trong `content_html` (đã sanitize server-side, render
 * qua `.aqs-prose`). Các field cũ (features/highlights/rules/commands/
 * difficulty/players_online/desc) đã rời payload.
 */
export interface MachineDetailPayload {
  slug: string
  name: string
  tagline?: string
  short_desc?: string
  status?: string
  /** Ảnh cover (game_modes.image_url). */
  image?: string | null
  /** Gallery — ảnh trong nội dung. */
  images?: string[]
  cluster?: { id: number } | null
  stats?: ClusterStats | null
  content_html?: string | null
}

export interface MachineModeCard {
  slug: string
  name: string
  tagline?: string
  short_desc?: string
  status?: string
  image?: string | null
}

export interface MachineListPayload {
  title?: string
  subtitle?: string
  cluster?: ClusterSummary | null
  stats?: ClusterStats | null
  modes?: MachineModeCard[]
}

export interface TopupPayload {
  title?: string
  subtitle?: string
  cards?: unknown[]
}

/* ================= Envelope & result ================= */

export type PageKey =
  | 'home'
  | 'machine_list'
  | 'machine_detail'
  | 'topup'
  | 'auth'
  | 'not_found'

export interface SeoPayload {
  title?: string
  description?: string
  canonical?: string
  og_image?: string
  robots?: string
}

export interface WindowData {
  page?: PageKey | string
  payload?: unknown
  /** Một số backend dùng key `data` thay vì `payload`. */
  data?: unknown
  site?: Partial<SiteData>
  seo?: SeoPayload
  notFound?: boolean
  status?: number
}

export type DataResult<T> =
  | { status: 'ok'; source: 'mock' | 'window'; data: T }
  | { status: 'not_found' }
  | { status: 'missing' }

/* ================= Helpers ================= */

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Payload trang chủ: envelope mới hoặc payload phẳng hiện tại của backend. */
export const isHomePayload = (value: unknown): value is HomePayload =>
  isObject(value) &&
  ('hero' in value || 'server_info' in value || 'game_modes' in value)

export const isMachineListPayload = (value: unknown): value is MachineListPayload =>
  isObject(value) && Array.isArray(value.modes)

export const isMachineDetailPayload = (value: unknown): value is MachineDetailPayload =>
  isObject(value) && typeof value.name === 'string' && typeof value.slug === 'string'

export const isTopupPayload = (value: unknown): value is TopupPayload =>
  isObject(value) && ('cards' in value || 'title' in value)

/**
 * Đọc `window.DATA` và chuẩn hoá về envelope.
 * Hỗ trợ cả payload phẳng hiện tại (trang chủ) lẫn envelope mới.
 */
export const readWindowData = (): WindowData | null => {
  const raw = getWindowData()
  if (!isObject(raw)) return null

  const payload = raw.payload ?? raw.data

  // Envelope mới
  if (typeof raw.page === 'string' || payload !== undefined) {
    return {
      page: typeof raw.page === 'string' ? raw.page : undefined,
      payload,
      site: isObject(raw.site) ? (raw.site as Partial<SiteData>) : undefined,
      seo: isObject(raw.seo) ? (raw.seo as SeoPayload) : undefined,
      notFound: raw.notFound === true,
      status: typeof raw.status === 'number' ? raw.status : undefined,
    }
  }

  // Backward compatibility: backend phát payload phẳng (không bọc envelope).
  if (isHomePayload(raw)) {
    return { page: 'home', payload: raw, notFound: false }
  }
  if (isMachineDetailPayload(raw)) {
    return { page: 'machine_detail', payload: raw, notFound: false }
  }
  if (isMachineListPayload(raw)) {
    return { page: 'machine_list', payload: raw, notFound: false }
  }
  if (isTopupPayload(raw)) {
    return { page: 'topup', payload: raw, notFound: false }
  }

  // Không nhận diện được — coi như payload thô
  const rawPayload = raw as Record<string, unknown>
  return { payload: rawPayload, notFound: rawPayload.notFound === true }
}

/** Chuẩn hoá slug trên URL và trong dữ liệu. */
export const normalizeSlug = (slug: unknown): string => {
  const value = String(slug ?? '').trim().toLowerCase()
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}