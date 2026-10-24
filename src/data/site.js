/**
 * Dữ liệu dùng chung cho site chrome: menu Header, Footer, thông tin server.
 *
 * Đây là cấu hình tĩnh (không phải nội dung trang), dùng làm fallback an toàn khi
 * `window.DATA` không kèm khối `site`. Ở production, backend nên gửi kèm
 * `site: { header, footer, server_info }` trong mọi payload.
 *
 * ⚠️ Mọi `to` ở đây chỉ trỏ tới route có thật trong `src/router/index.tsx`.
 */

export const DEFAULT_DISCORD_URL = 'https://discord.gg/tBH4zEpK2S'

export const DEFAULT_MENU = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Máy chủ', to: '/may-chu' },
  { label: 'Nạp thẻ', to: '/nap-the' },
]

export const DEFAULT_SERVER_INFO = {
  ip: 'aesieuquay.com',
  online: null,
  players: null,
  version: null,
}

export const DEFAULT_FOOTER = {
  columns: [
    {
      title: 'Khám phá',
      links: [
        { label: 'Máy chủ', to: '/may-chu' },
        { label: 'Nạp thẻ', to: '/nap-the' },
      ],
    },
    {
      title: 'Tài khoản',
      links: [
        { label: 'Đăng nhập', to: '/dang-nhap' },
        { label: 'Đăng ký', to: '/dang-ky' },
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

export const DEFAULT_HEADER = {
  menu: DEFAULT_MENU,
  cta: { label: 'Chơi ngay', to: '/nap-the' },
}

export const buildDefaultSiteData = () => ({
  header: DEFAULT_HEADER,
  footer: DEFAULT_FOOTER,
  server_info: DEFAULT_SERVER_INFO,
})

/**
 * Gộp dữ liệu site từ backend với default.
 * `windowData.site` được ưu tiên; nếu là trang chủ phẳng thì dùng header/footer
 * của payload đó; cuối cùng mới tới default.
 */
export const resolveSiteData = (site, homePayload) => {
  const fallback = buildDefaultSiteData()

  const header = site?.header ?? homePayload?.header ?? fallback.header
  const footer = site?.footer ?? homePayload?.footer ?? fallback.footer
  const serverInfo = site?.server_info ?? homePayload?.server_info ?? fallback.server_info

  return {
    header: {
      ...fallback.header,
      ...header,
      menu: header?.menu?.length ? header.menu : fallback.header.menu,
    },
    footer: {
      ...fallback.footer,
      ...footer,
      columns: footer?.columns?.length ? footer.columns : fallback.footer.columns,
      socials: footer?.socials?.length ? footer.socials : fallback.footer.socials,
    },
    server_info: { ...fallback.server_info, ...serverInfo },
  }
}