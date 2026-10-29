/**
 * Contract dữ liệu giữa backend SSR và frontend.
 *
 * BACKEND CẦN CUNG CẤP:
 * - Mỗi URL SPA (`/`, `/may-chu`, `/may-chu/<slug>`, `/nap-the`, `/chuyen-xu`,
 *   `/dang-nhap`, `/dang-ky`) trả HTML đầy đủ SEO + `<div id="root">` + script ở cuối body:
 *
 *     window.DATA = {
 *       page: 'home' | 'machine_list' | 'machine_detail' | 'topup' | 'transfer' | 'auth',
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
 *
 * Luật data trang user (FRONTEND-4 §0):
 *   read  = window.DATA (SSR backend-4 §2/§3)
 *   write = POST /api/... (action: charge / check / transfer)
 *   live  = poll GET tối thiểu CHỈ cho giao dịch vừa action, tới khi terminal thì DỪNG.
 * Không trang user nào fetch danh sách/biểu phí/balance bằng axios lúc mở trang
 * (ngoại lệ bất khả kháng: balance-check /chuyen-xu — số dư nằm PlayerPoints in-game).
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
  /** Frontend-3 §6 — backend nhét ClusterStats tương ứng vào server_info (push-only, không ping). */
  tps?: { avg_1m: number } | null
  uptime?: { percent_7d: number | null; window_hours: number } | null
  servers?: { total: number; online: number } | null
}

export interface GameModeSummary {
  slug: string
  name: string
  tagline?: string
  short_desc?: string
  status?: string
  image?: string | null
}

/* ================= Frontend Requirements v2 — khối động SSR =================
 * `server_status` / `top_donators` / `captcha` do backend Flask nhét thẳng vào
 * window.DATA lúc render (cache TTL ngắn, merge sau content-cache).
 * FE KHÔNG fetch API cho các khối này — snapshot lúc render là hợp lệ (§0 doc v2),
 * không poll/refetch. Trường bên trong có thể null → FE ẩn tương ứng.
 */

/** Widget "Trạng thái máy chủ" — doc v2 §1. Block LUÔN tồn tại, field trong có thể null. */
export interface ServerStatusBlock {
  /** TĨNH — site_config.server_ip (DB), hỗ trợ "host:port". */
  ip: string
  /** Port tách từ IP tĩnh / registry; mặc định 25565. */
  port: number
  /** Heartbeat tươi nhất → registry admin. nullable. */
  version: string | null
  /** Đã strip mã màu §. nullable. */
  motd: string | null
  status: 'online' | 'offline' | 'maintenance'
  online: boolean
  maintenance: boolean
  /** null nếu chưa từng có heartbeat. */
  players: { online: number; max: number } | null
  /** nullable — từ stats cụm (push Monitor). */
  tps: { avg_1m: number } | null
  /** percent_7d cũng có thể null. */
  uptime: { percent_7d: number | null; window_hours: number } | null
  /** nullable — pill "5/6 server". */
  servers: { total: number; online: number } | null
  cluster: { id: number; slug: string; name: string } | null
  /** Server đang làm nguồn hiển thị (admin chọn display_public, fallback proxy→lobby→game). */
  source: {
    server_key: string
    name: string
    role: 'proxy' | 'lobby' | 'game'
    /** false = đang ăn fallback tự động. */
    admin_picked: boolean
  } | null
  updated_at_ms: number
}

/** Widget "Top 5 Đại gia" — doc v2 §2. Tổng hợp toàn thời gian, cache Redis 300s. */
export interface TopDonatorItem {
  rank: number
  /** Tên in-game (AuthMe). */
  username: string
  /** Realname DB, fallback = username. */
  display_name: string
  /** int, đơn vị ₫ — chỉ amount_vnd thực nạp, không bonus. */
  total_vnd: number
  medal: 'gold' | 'silver' | 'bronze' | null
  avatar_url: string
}

export interface TopDonatorsBlock {
  title: string
  /** constant — toàn thời gian, không tab tháng. */
  period: 'all'
  currency: 'VND'
  /** Có thể [] (chưa ai nạp / lỗi DB) → FE ẩn section. */
  items: TopDonatorItem[]
  updated_at_ms: number
}

/** Cloudflare Turnstile — doc v2 §3. site_key null = backend chưa bật captcha (dev). */
export interface CaptchaConfig {
  site_key: string | null
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
  /** @deprecated Key cũ — FE đọc `server_status` cho widget, `server_info` chỉ fallback ip. */
  server_info?: ServerInfo
  /** Doc v2 §1 — khối động, luôn tồn tại khi backend v2 render. */
  server_status?: ServerStatusBlock | null
  /** Doc v2 §2 — khối động, items có thể []. */
  top_donators?: TopDonatorsBlock | null
  /** Doc v2 §3 — site_key null = chưa bật captcha (ẩn widget). */
  captcha?: CaptchaConfig | null
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

/* ================= Trang tiền: /nap-the + /chuyen-xu (FRONTEND-4 §1) =================
 * Luật mới (§0): trang user ĐỌC 100% từ window.DATA — biểu phí thẻ, info bank,
 * event khuyến mãi, lịch sử của user đều nằm trong payload SSR. API còn lại
 * CHỈ là action (charge/check/transfer) + poll giao dịch vừa action.
 */

export interface CardFeeValue {
  amount: number
  fee_percent: number
  real_receive_vnd: number
  xu: number
}

export interface CardFeeTelco {
  telco: string
  label: string
  min: number
  max: number
  values: CardFeeValue[]
}

/**
 * Info bank công khai — shape theo backend modules/api/bank/service.py::public_info
 * (endpoint GET công khai cũ; từ FRONTEND-4 nằm trong window.DATA, không fetch).
 */
export interface BankPublicInfo {
  enabled: boolean
  vnd_per_xu: number
  min_amount_vnd: number
  credit_server_key: string
  receiving: {
    bank: string
    account_number: string
    account_name: string
  }
  content_format: string
}

export interface PromotionBanner {
  name: string
  bonus_percent: number
  /** ISO — backend trả naive UTC như habit repo; hiển thị qua fmtIsoVN. */
  ends_at: string
  /** null khi unlimited-ish/unknown. */
  slots_left: number | null
  /** user này đã claim / hết suất → hiện "đã áp dụng / hết suất". */
  applied: boolean
  applies_to: 'card' | 'bank' | 'all'
}

export interface TopupMineUser {
  username: string
  realname: string
}

/** Subset CardTx (admin-history-api.md §4.1) an toàn cho user — code thẻ giữ masked. */
export interface CardTxRow {
  request_id: string
  telco: string
  amount_vnd: number
  xu_amount: number | null
  status: 'pending' | 'success' | 'failed' | 'error'
  gateway_message: string | null
  in_game: boolean
  serial?: string | null
  card_code_masked?: string | null
  created_at: string | null
  promotion_id?: number | null
  bonus_xu?: number | null
}

/** Subset BankDepositAdmin — đủ cho DepositStatusBadge + render dòng lịch sử. */
export interface BankDepositRow {
  id: number
  amount_vnd: number
  xu_amount: number | null
  status: string
  credit_command_status: string | null
  credit_command_error: string | null
  reference_code: string | null
  transaction_date_ms: number
  promotion_id?: number | null
  bonus_xu?: number | null
  content?: string
}

export interface TopupMine {
  user: TopupMineUser
  card_history: CardTxRow[]
  bank_history: BankDepositRow[]
}

export interface TopupPayload {
  title?: string
  subtitle?: string
  card: {
    enabled: boolean
    vnd_per_xu: number
    user_fee_rate: number
    telcos: CardFeeTelco[]
  }
  bank: BankPublicInfo
  promotion: PromotionBanner | null
  /** null = chưa login (SSR resolve cookie optional). */
  my: TopupMine | null
}

/* ---- /chuyen-xu ---- */

export type TransferStatus =
  | 'pending'
  | 'debited'
  | 'refund_pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'needs_reconcile'

export interface TransferRow {
  transfer_id: string
  to_server_key: string
  amount: number
  status: TransferStatus
  error: string | null
  created_at: string | null
  completed_at: string | null
}

export interface TransferPagePayload {
  title?: string
  lobby: { server_key: string; name: string }
  /** Chỉ server role=game, points_enabled, đang hoạt động — KHÔNG có proxy/lobby làm đích. */
  targets: Array<{ server_key: string; name: string }>
  limits: { min_amount: number; max_amount: number }
  command_ttl_seconds: number
  my: { user: TopupMineUser; transfers: TransferRow[] } | null
}

/* ================= Envelope & result ================= */

export type PageKey =
  | 'home'
  | 'machine_list'
  | 'machine_detail'
  | 'topup'
  | 'transfer'
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
  ('hero' in value || 'server_info' in value || 'game_modes' in value || 'server_status' in value || 'top_donators' in value)

export const isMachineListPayload = (value: unknown): value is MachineListPayload =>
  isObject(value) && Array.isArray(value.modes)

export const isMachineDetailPayload = (value: unknown): value is MachineDetailPayload =>
  isObject(value) && typeof value.name === 'string' && typeof value.slug === 'string'

/** Shape mới (FRONTEND-4 §1): card/telcos là nguồn phí; title nhận diện payload trần. */
export const isTopupPayload = (value: unknown): value is TopupPayload =>
  isObject(value) && ('card' in value || 'bank' in value || 'title' in value)

/** Payload trần /chuyen-xu: backend-4 trả phẳng { lobby, targets, ... } như /nap-the. */
export const isTransferPayload = (value: unknown): value is TransferPagePayload =>
  isObject(value) && isObject(value.lobby) && Array.isArray(value.targets)

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
  // Thử machine_detail/machine_list TRƯỚC home: payload home v2 cũng phẳng và
  // có thể chứa key trùng tên — nhưng detail/list có dấu hiệu riêng (name+slug / modes[]).
  if (isHomePayload(raw)) {
    return { page: 'home', payload: raw, notFound: false }
  }
  if (isMachineDetailPayload(raw)) {
    return { page: 'machine_detail', payload: raw, notFound: false }
  }
  if (isMachineListPayload(raw)) {
    return { page: 'machine_list', payload: raw, notFound: false }
  }
  // /chuyen-xu TRƯỚC /nap-the: payload transfer cũng có `title` — phân biệt bằng lobby+targets.
  if (isTransferPayload(raw)) {
    return { page: 'transfer', payload: raw, notFound: false }
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