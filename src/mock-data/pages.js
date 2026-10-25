/**
 * MOCK DATA — một nguồn duy nhất cho development.
 *
 * - `machineListPageMock` là source of truth: danh sách máy chủ đầy đủ.
 * - `homePageMock.game_modes` được dẫn xuất từ danh sách này.
 * - Chi tiết máy chủ: slug có trong danh sách → dùng entry thật;
 *   slug lạ → `generateMachineDetail()` sinh dữ liệu giả ổn định.
 *
 * Shape khớp với payload backend:
 * - gallery dùng `src_asset`
 * - highlight icon là emoji
 * - ảnh dùng URL https:// đầy đủ, không ghép CDN
 */

import { DEFAULT_FOOTER, DEFAULT_HEADER, DEFAULT_SERVER_INFO, DEFAULT_DISCORD_URL } from '@/data/site'

/* ================== Stat cụm mock (shape backend.md 0.1) ================== */

const MOCK_CLUSTER = { id: 1, slug: 'aesq', name: 'AESQ Network' }

/**
 * ClusterStats mẫu — plausible để test UI. Muốn test "ẩn strip khi
 * backend chưa từng report", đổi thành `null` (payload.stats == null).
 */
const clusterStats = (players, max, tps, uptime, serversOnline, serverStatus) => ({
  cluster: MOCK_CLUSTER,
  scope: 'cluster',
  status: 'online',
  updated_at_ms: Date.now(),
  players: { online: players, max },
  tps: { avg_1m: tps },
  uptime: { percent_7d: uptime, window_hours: 168 },
  servers: { total: serverStatus.length, online: serversOnline },
  server_status: serverStatus,
})

const MOCK_SERVER_STATUS = [
  { server_key: 'proxy-1', name: 'Proxy 1', role: 'proxy', online: true, maintenance: false, players_online: 210, players_max: 1000 },
  { server_key: 'survival-1', name: 'Survival 1', role: 'game', online: true, maintenance: false, players_online: 96, players_max: 300 },
  { server_key: 'pvp-1', name: 'PvP 1', role: 'game', online: true, maintenance: false, players_online: 58, players_max: 200 },
  { server_key: 'minigame-1', name: 'Minigame 1', role: 'game', online: false, maintenance: false, players_online: null, players_max: null },
]

/* ================== TRANG DANH SÁCH MÁY CHỦ ================== */

export const machineListPageMock = {
  title: 'Máy chủ',
  subtitle: 'Khám phá tất cả máy chủ tại SV AeSieuQuay',
  cluster: MOCK_CLUSTER,
  stats: clusterStats(210, 1000, 19.8, 99.4, 3, MOCK_SERVER_STATUS),
  modes: [
    {
      slug: 'sinh-ton',
      name: 'Sinh tồn',
      tagline: 'Classic Survival',
      short_desc: 'Khám phá thế giới, bảo vệ lãnh thổ, chinh phục Boss mỗi cuối tuần.',
      status: 'hot',
      image: 'https://images.unsplash.com/photo-1601987077677-5346c0c57d3f?q=80&w=1974&auto=format&fit=crop',
    },
    {
      slug: 'skyblock',
      name: 'Skyblock',
      tagline: 'Sky Islands',
      short_desc: 'Bắt đầu từ đảo nhỏ trên không, mở rộng thành đảo vương quốc.',
      status: 'hot',
      image: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=2050&auto=format&fit=crop',
    },
    {
      slug: 'pvp',
      name: 'PvP',
      tagline: 'Arena Combat',
      short_desc: 'Sảnh combat tối ưu ping Việt Nam.',
      status: 'new',
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop',
    },
    {
      slug: 'minigame',
      name: 'Minigame',
      tagline: 'Fun & Casual',
      short_desc: 'Bedwars, SkyWars, Build Battle và nhiều hơn nữa.',
      status: 'normal',
      image: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=2070&auto=format&fit=crop',
    },
  ],
}

/**
 * Nội dung mẫu cho mock — Tailwind classes nằm trong HTML (không qua
 * scanner) nên mọi class dùng ở đây phải có trong `tailwind-safelist.html`
 * hoặc mặc định `.aqs-prose` lo.
 */
const sampleContentHtml = (name, image) => `
<h2>Chào mừng đến với ${name}</h2>
<p>Nội dung trang này do admin soạn tự do ở <b>/admin/game-modes</b> — trình soạn HTML 2 cột (mã nguồn + preview). Backend đã sanitize allowlist tags/attrs trước khi ghi DB.</p>
${image ? `<img src="${image}" alt="${name}" loading="lazy" class="rounded-xl w-full" />` : ''}
<div class="grid gap-4 md:grid-cols-2">
  <div class="rounded-xl border border-border-c bg-surface p-4">
    <h3 class="font-bold">Lối chơi</h3>
    <p class="text-sm text-muted">Mô tả ngắn cho block trái — class nằm trong DB HTML, ăn safelist + .aqs-prose.</p>
  </div>
  <div class="rounded-xl border border-border-c bg-surface p-4">
    <h3 class="font-bold">Phù hợp với ai</h3>
    <p class="text-sm text-muted">Block phải. Dark mode tự đổi theo token nên không cần style cứng.</p>
  </div>
</div>
<ul>
  <li>Danh sách kế thừa style từ <code>.aqs-prose</code> (không cần class)</li>
  <li>Muốn đẹp hơn thì dùng Tailwind class có trong safelist</li>
</ul>
<blockquote>Lưu ý: style="…" bị sanitizer loại — cứ dùng class.</blockquote>
`

/**
 * Payload chi tiết mẫu cho development — giống hệt object backend trả cho
 * /may-chu/:slug (GameModeOut đã cắt còn field frontend cần).
 */
export const machineDetailsMock = {
  'sinh-ton': {
    slug: 'sinh-ton',
    name: 'Sinh tồn',
    tagline: 'Classic Survival',
    short_desc: 'Khám phá thế giới, bảo vệ lãnh thổ, chinh phục Boss mỗi cuối tuần.',
    status: 'hot',
    image: machineListPageMock.modes[0].image,
    images: [
      machineListPageMock.modes[0].image,
      'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?q=80&w=2070&auto=format&fit=crop',
    ],
    cluster: { id: 1 },
    stats: clusterStats(96, 300, 19.9, 99.6, 1, MOCK_SERVER_STATUS.slice(1, 2)),
    content_html: sampleContentHtml('Sinh tồn', machineListPageMock.modes[0].image),
  },
  skyblock: {
    slug: 'skyblock',
    name: 'Skyblock',
    tagline: 'Sky Islands',
    short_desc: 'Bắt đầu từ đảo nhỏ trên không, mở rộng thành đảo vương quốc.',
    status: 'hot',
    image: machineListPageMock.modes[1].image,
    images: [machineListPageMock.modes[1].image],
    cluster: { id: 1 },
    stats: clusterStats(58, 200, 20, 100, 1, [MOCK_SERVER_STATUS[1]]),
    content_html: sampleContentHtml('Skyblock', machineListPageMock.modes[1].image),
  },
  pvp: {
    slug: 'pvp',
    name: 'PvP',
    tagline: 'Arena Combat',
    short_desc: 'Sảnh combat tối ưu ping Việt Nam.',
    status: 'new',
    image: machineListPageMock.modes[2].image,
    images: [machineListPageMock.modes[2].image],
    cluster: { id: 1 },
    // stats === null: test trường hợp backend chưa từng report → strip ẩn.
    stats: null,
    content_html: sampleContentHtml('PvP', machineListPageMock.modes[2].image),
  },
  minigame: {
    slug: 'minigame',
    name: 'Minigame',
    tagline: 'Fun & Casual',
    short_desc: 'Bedwars, SkyWars, Build Battle và nhiều hơn nữa.',
    status: 'normal',
    image: machineListPageMock.modes[3].image,
    images: [machineListPageMock.modes[3].image],
    cluster: { id: 1 },
    stats: null,
    // content_html null → fallback paragraph short_desc.
    content_html: null,
  },
}

/* ================== TRANG CHỦ ================== */

export const homePageMock = {
  header: DEFAULT_HEADER,
  hero: {
    name: 'SV AeSieuQuay',
    tagline: 'Minecraft Server Việt Nam',
    description:
      'Máy chủ Minecraft Việt Nam với nhiều máy chủ / chế độ chơi đa dạng, nơi cộng đồng AE cùng sinh tồn, xây dựng và cạnh tranh.',
    cta: { primary: 'Chơi ngay', secondary: 'Tham gia Discord' },
    discord_url: DEFAULT_DISCORD_URL,
    bg_image: null,
    images: [
      {
        id: 1,
        src: 'https://images.unsplash.com/photo-1601987077677-5346c0c57d3f?q=80&w=1974&auto=format&fit=crop',
        alt: 'Toàn cảnh SV AeSieuQuay',
      },
      {
        id: 2,
        src: 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?q=80&w=2070&auto=format&fit=crop',
        alt: 'Khu sinh tồn',
      },
      {
        id: 3,
        src: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop',
        alt: 'Arena PvP',
      },
    ],
    slideshow_interval: 4000,
  },
  // Stat cụm thật — backend override server_info.players từ cùng nguồn stats.
  stats: machineListPageMock.stats,
  server_info: {
    ...DEFAULT_SERVER_INFO,
    online: true,
    players: { online: 210, max: 1000 },
    version: '1.21.11',
  },
  game_modes: {
    title: 'Máy chủ',
    subtitle: 'Chọn máy chủ bạn yêu thích để bắt đầu chơi',
    // Dẫn xuất từ source of truth — không lặp dữ liệu.
    modes: machineListPageMock.modes.map((mode) => ({
      slug: mode.slug,
      name: mode.name,
      tagline: mode.tagline,
      short_desc: mode.short_desc,
      status: mode.status,
      image: mode.image,
    })),
  },
  highlights: {
    title: 'Tại sao chọn AeSieuQuay?',
    items: [
      { icon: '⚡', title: 'Hiệu năng cao', desc: 'Máy chủ ổn định, giảm lag, tối ưu ping Việt Nam' },
      { icon: '🛡️', title: 'Bảo mật', desc: 'Hệ thống bảo vệ, chống gian lận hiệu quả' },
      { icon: '👥', title: 'Cộng đồng lớn', desc: 'Hàng nghìn AE cùng chia sẻ, giúp đỡ lẫn nhau' },
      { icon: '🎁', title: 'Sự kiện hấp dẫn', desc: 'Nhiều sự kiện, phần thưởng giá trị hàng tuần' },
    ],
  },
  gallery: {
    title: 'Khoảnh khắc server',
    description: 'Một vài hình ảnh từ cộng đồng AeSieuQuay',
    images: [
      {
        id: 1,
        title: 'Build cộng đồng',
        alt: 'Build cộng đồng',
        src_asset: 'https://images.unsplash.com/photo-1601987077677-5346c0c57d3f?q=80&w=1974&auto=format&fit=crop',
        width: 1920,
        height: 1080,
      },
      {
        id: 2,
        title: 'Khu sinh tồn',
        alt: 'Khu sinh tồn',
        src_asset: 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?q=80&w=2070&auto=format&fit=crop',
        width: 1080,
        height: 1080,
      },
      {
        id: 3,
        title: 'PvP Arena',
        alt: 'PvP Arena',
        src_asset: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop',
        width: 1080,
        height: 1080,
      },
      {
        id: 4,
        title: 'Minigame',
        alt: 'Minigame',
        src_asset: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=2070&auto=format&fit=crop',
        width: 1920,
        height: 1080,
      },
    ],
  },
  community: {
    title: 'Tham gia cộng đồng',
    description: 'Kết nối với hàng nghìn người chơi, cập nhật tin tức và tham gia sự kiện',
    socials: [
      { icon: 'discord', label: 'Discord', url: DEFAULT_DISCORD_URL },
      { icon: 'facebook', label: 'Facebook', url: 'https://facebook.com/aesieuquay' },
      { icon: 'tiktok', label: 'TikTok', url: 'https://tiktok.com/@aesieuquay' },
    ],
  },
  footer: DEFAULT_FOOTER,
}

/* ================== TRANG NẠP THẺ ================== */

export const topupPageMock = {
  title: 'Nạp thẻ',
  subtitle: 'Chọn hình thức nạp phù hợp với bạn',
  cards: [],
}

export default {
  homePageMock,
  machineListPageMock,
  machineDetailsMock,
  topupPageMock,
}