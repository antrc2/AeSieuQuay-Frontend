/**
 * Dữ liệu dùng chung cho site chrome: menu Header, Footer, thông tin server.
 *
 * FRONTEND-5 §1 — MENU LÀ ĐẶC QUYỀN FRONTEND: `DEFAULT_MENU` dưới đây là NGUỒN
 * DUY NHẤT của menu Header. Backend KHÔNG còn trả `header.menu` (backend-5 §2);
 * mọi payload/mock có key này đều bị bỏ qua. THÊM/BỚT MENU = SỬA FILE NÀY.
 *
 * Phần còn lại (footer, server_info) vẫn là cấu hình tĩnh dùng làm fallback an toàn khi
 * `window.DATA` không kèm khối `site`. Ở production, backend nên gửi kèm
 * `site: { header, footer, server_info }` trong mọi payload.
 *
 * ⚠️ Mọi `to` ở đây chỉ trỏ tới route có thật trong `src/router/index.tsx`.
 */

import type {
  FooterColumn,
  FooterData,
  HeaderData,
  HomePayload,
  MenuItem,
  ServerInfo,
  SiteData,
} from './contract'

export const DEFAULT_DISCORD_URL = 'https://discord.gg/tBH4zEpK2S'

/**
 * VietQR nhận nạp tiền qua ngân hàng — CHUẨN CỨNG chủ server chốt 27/10 (FRONTEND-4 §2):
 * OCB / HNC61025015012 / NGUYEN NGOC AN, tỷ giá 1.000đ = 1 Xu.
 * Đây là FALLBACK: ưu tiên build URL từ `payload.bank` (window.DATA); constants ở đây
 * phải trùng giá trị backend cấu hình, đừng để trỏ ngân hàng khác.
 * Khi user đã đăng nhập, frontend thêm `?addInfo=<ten nap>&accountName=<chủ TK>`.
 */
export const BANK_RECEIVING_FALLBACK = {
  bank: 'OCB',
  account_number: 'HNC61025015012',
  account_name: 'NGUYEN NGOC AN',
}

export const BANK_VND_PER_XU_FALLBACK = 1000

export const BANK_QR_BASE_URL = 'https://img.vietqr.io/image/OCB-HNC61025015012-compact2.svg'

export const DEFAULT_MENU: MenuItem[] = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Máy chủ', to: '/may-chu' },
  { label: 'Nạp thẻ', to: '/nap-the' },
  // FRONTEND-4 §3.1 — trang tiện ích chuyển xu (SSR page, điều hướng <a href> full reload).
  { label: 'Chuyển xu', to: '/chuyen-xu' },
]

export const DEFAULT_SERVER_INFO: ServerInfo = {
  ip: 'aesieuquay.com',
  online: null,
  players: null,
  version: null,
}

export const DEFAULT_FOOTER: FooterData = {
  columns: [
    {
      title: 'Khám phá',
      links: [
        { label: 'Máy chủ', to: '/may-chu' },
        { label: 'Nạp thẻ', to: '/nap-the' },
        { label: 'Chuyển xu', to: '/chuyen-xu' },
      ],
    },
    {
      title: 'Tài khoản',
      links: [
        { label: 'Đăng nhập', to: '/dang-nhap' },
        { label: 'Đăng ký', to: '/dang-ky' },
      ],
    },
    {
      title: 'Pháp lý',
      links: [
        { label: 'Luật lệ', to: '/luat-le' },
        { label: 'Điều khoản dịch vụ', to: '/dieu-khoan' },
        { label: 'Chính sách bảo mật', to: '/chinh-sach-bao-mat' },
      ],
    },
  ],
  socials: [
    { label: 'Discord', url: DEFAULT_DISCORD_URL },
    { label: 'Facebook', url: 'https://facebook.com/aesieuquay' },
    { label: 'TikTok', url: 'https://tiktok.com/@aesieuquay' },
  ],
  copyright:
    '© 2026 SV AeSieuQuay — Minecraft Việt Nam. Không liên kết chính thức với Mojang AB hoặc Microsoft.',
}

export const DEFAULT_HEADER: HeaderData = {
  menu: DEFAULT_MENU,
  cta: { label: 'Chơi ngay', to: '/nap-the' },
}

/** URL cũ → URL chuẩn. */
const ROUTE_ALIASES: Record<string, string> = {
  '/che-do-choi': '/may-chu',
}

const ROUTE_PREFIXES = ['/may-chu', '/nap-the', '/chuyen-xu', '/dang-nhap', '/dang-ky']

/** Chỉ giữ link nội bộ trỏ tới route thật (hoặc hash). */
const isKnownRoute = (to = ''): boolean => {
  if (!to) return false
  if (to === '/' || to.startsWith('#')) return true
  if (/^https?:\/\//i.test(to)) return true
  return ROUTE_PREFIXES.some((path) => to === path || to.startsWith(`${path}/`))
}

const sanitizeLinks = (links: unknown): MenuItem[] =>
  (Array.isArray(links) ? links : [])
    .map((raw) => {
      const link = raw as Partial<MenuItem> | null
      const to = ROUTE_ALIASES[link?.to ?? ''] ?? link?.to ?? ''
      return isKnownRoute(to) ? { ...(link as MenuItem), to } : null
    })
    .filter((link): link is MenuItem => link !== null)

const sanitizeMenu = (menu: unknown, fallbackMenu: MenuItem[]): MenuItem[] => {
  const items = sanitizeLinks(menu)
  return items.length ? items : fallbackMenu
}

const sanitizeFooterColumns = (columns: unknown, fallbackColumns: FooterColumn[]): FooterColumn[] => {
  const sanitized = (Array.isArray(columns) ? columns : [])
    .map((raw) => {
      const column = raw as Partial<FooterColumn> | null
      return { ...(column as FooterColumn), links: sanitizeLinks(column?.links) }
    })
    .filter((column) => column.links.length > 0)

  // Bổ sung cột mặc định còn thiếu (vd: Tài khoản) để footer không bị rỗng.
  const merged = [...sanitized]
  for (const column of fallbackColumns) {
    if (!merged.some((item) => item.title === column.title)) merged.push(column)
  }
  return merged.length ? merged : fallbackColumns
}

const buildDefaultSiteData = (): SiteData => ({
  header: DEFAULT_HEADER,
  footer: DEFAULT_FOOTER,
  server_info: DEFAULT_SERVER_INFO,
})

/**
 * Gộp dữ liệu site từ backend với default.
 * `windowData.site` được ưu tiên; nếu là trang chủ phẳng thì dùng header/footer
 * của payload đó; cuối cùng mới tới default.
 * Link chết/URL cũ được lọc hoặc map sang route chuẩn.
 *
 * FRONTEND-5 §1: `header.menu` KHÔNG BAO GIỜ đọc từ payload — luôn là
 * sanitize(DEFAULT_MENU) (sanitize giữ nguyên để route lạ vẫn bị lọc).
 */
export const resolveSiteData = (
  site?: Partial<SiteData> | null,
  homePayload?: HomePayload | null,
): SiteData => {
  const fallback = buildDefaultSiteData()

  const header = site?.header ?? homePayload?.header ?? fallback.header
  const footer = site?.footer ?? homePayload?.footer ?? fallback.footer
  const serverInfo = site?.server_info ?? homePayload?.server_info ?? fallback.server_info

  return {
    header: {
      ...fallback.header,
      ...header,
      menu: sanitizeMenu(DEFAULT_MENU, fallback.header.menu ?? DEFAULT_MENU),
    },
    footer: {
      ...fallback.footer,
      ...footer,
      columns: sanitizeFooterColumns(footer?.columns, fallback.footer.columns ?? []),
      socials: footer?.socials?.length ? footer.socials : fallback.footer.socials,
    },
    server_info: { ...fallback.server_info, ...serverInfo },
  }
}