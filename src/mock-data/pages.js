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
  /* ===== Frontend Requirements v2 — khối động (server_status / top_donators / captcha) ===== */
  // Doc v2 §1: widget home ĐỌC block này, bỏ qua server_info. Muốn test case
  // "chưa từng có heartbeat": status:'offline', players:null, version/motd/tps/uptime/servers/source = null.
  server_status: {
    // Branding thật của site (chủ server chốt 29/10): IP = aesieuquay.com.
    ip: 'aesieuquay.com',
    port: 25565,
    version: '1.21.11 Paper',
    motd: 'AeSieuQuay - Survival & Skyblock',
    status: 'online',
    online: true,
    maintenance: false,
    players: { online: 42, max: 200 },
    tps: { avg_1m: 19.85 },
    uptime: { percent_7d: 99.2, window_hours: 168 },
    servers: { total: 6, online: 5 },
    cluster: { id: 1, slug: 'aesiumquay', name: 'AeSieuQuay' },
    source: { server_key: 'lobby-1', name: 'Lobby 1', role: 'lobby', admin_picked: true },
    updated_at_ms: Date.now(),
  },
  // Doc v2 §2: top toàn thời gian. Test ẩn section: items: [].
  // Test avatar fallback: thay avatar_url bằng URL sai (vd '/bad.png').
  top_donators: {
    title: 'Bảng xếp hạng đại gia',
    period: 'all',
    currency: 'VND',
    items: [
      { rank: 1, username: 'nguyenvana', display_name: 'Nguyễn Văn A', total_vnd: 12500000, medal: 'gold', avatar_url: 'https://mc-heads.net/avatar/nguyenvana/80' },
      { rank: 2, username: 'pe_Sity', display_name: 'Sity Player', total_vnd: 8200000, medal: 'silver', avatar_url: 'https://mc-heads.net/avatar/pe_Sity/64' },
      { rank: 3, username: 'MinhTom', display_name: 'Minh Tom', total_vnd: 5400000, medal: 'bronze', avatar_url: 'https://mc-heads.net/avatar/MinhTom/64' },
      { rank: 4, username: 'GamerPro2012', display_name: 'Pro Gamer', total_vnd: 3100000, medal: null, avatar_url: 'https://mc-heads.net/avatar/GamerPro2012/64' },
      { rank: 5, username: 'AnTrc2', display_name: 'An Trần', total_vnd: 1900000, medal: null, avatar_url: 'https://mc-heads.net/avatar/AnTrc2/64' },
    ],
    updated_at_ms: Date.now(),
  },
  // Doc v2 §3: site_key null = dev, form login/register ẩn widget.
  // Test Turnstile staging: đặt key thật (0x4AAAAAAA...) vào đây.
  captcha: { site_key: null },
  server_info: {
    ...DEFAULT_SERVER_INFO,
    online: true,
    players: { online: 210, max: 1000 },
    version: '1.21.11',
    // FRONTEND-3 §6 — cùng nguồn ClusterStats (backend override).
    tps: { avg_1m: 19.8 },
    uptime: { percent_7d: 99.4, window_hours: 168 },
    servers: { total: 4, online: 3 },
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

/* ================== TRANG NẠP THẺ (FRONTEND-4 §1 — window.DATA shape mới) ==================
 * Mock dựng sẵn `promotion` + `my` (user đã đăng nhập) + telcos thật shape
 * CardFeeTelco để test toàn bộ block lịch sử. Muốn test khách vãng lai:
 * sửa `my: null`. Muốn test cổng lỗi: sửa `card.telcos: []` → fallback
 * card-options.js + cảnh báo.
 */

/** Phí HIỂN THỊ CHO USER = user_fee_rate 10% (chủ server chốt 27/10): cổng chiết khấu
 *  sâu hơn nhưng admin bù chênh (admin_adjustment) — UI nạp thẻ KHÔNG lộ 21% của cổng. */
const USER_FEE_PERCENT = 10
const mkFeeValues = (feePercent, vndPerXu) =>
  [50000, 100000, 200000, 300000, 500000].map((amount) => {
    const real = Math.floor((amount * (100 - feePercent)) / 100)
    return { amount, fee_percent: feePercent, real_receive_vnd: real, xu: Math.floor(real / vndPerXu) }
  })

/* Tỷ giá chuẩn chủ server chốt 27/10: 1.000đ = 1 Xu (khớp BANK_VND_PER_XU_FALLBACK site.js). */
const MOCK_VND_PER_XU = 1000

export const topupPageMock = {
  title: 'Nạp thẻ',
  subtitle: 'Chọn hình thức nạp phù hợp với bạn — Thẻ cào hoặc Chuyển khoản ngân hàng',
  card: {
    enabled: true,
    vnd_per_xu: MOCK_VND_PER_XU,
    user_fee_rate: 10,
    telcos: [
      { telco: 'VIETTEL', label: 'Viettel', min: 10000, max: 1000000, values: mkFeeValues(USER_FEE_PERCENT, MOCK_VND_PER_XU) },
      { telco: 'MOBIFONE', label: 'Mobifone', min: 10000, max: 500000, values: mkFeeValues(USER_FEE_PERCENT, MOCK_VND_PER_XU) },
      { telco: 'VINAPHONE', label: 'Vinaphone', min: 10000, max: 500000, values: mkFeeValues(USER_FEE_PERCENT, MOCK_VND_PER_XU) },
      { telco: 'ZING', label: 'Zing', min: 10000, max: 500000, values: mkFeeValues(USER_FEE_PERCENT, MOCK_VND_PER_XU) },
    ],
  },
  // VietQR chuẩn cứng: OCB · HNC61025015012 · NGUYEN NGOC AN (FRONTEND-4 §2 cập nhật 27/10).
  bank: {
    enabled: true,
    vnd_per_xu: MOCK_VND_PER_XU,
    min_amount_vnd: 10000,
    credit_server_key: 'lobby-1',
    receiving: { bank: 'OCB', account_number: 'HNC61025015012', account_name: 'NGUYEN NGOC AN' },
    content_format: 'ten ingame chinh xac, khong them Prefix/Sau',
  },
  promotion: {
    name: 'Mừng ra mắt server — cộng 20% Xu',
    bonus_percent: 20,
    ends_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    slots_left: 6,
    applied: false,
    applies_to: 'all',
  },
  // Đã đăng nhập: có lịch sử trộn 2 kênh + 1 row có bonus khuyến mãi.
  my: {
    user: { username: 'AnTrc2', realname: 'An Trc' },
    card_history: [
      {
        request_id: 'r-aaaa-1111', telco: 'VIETTEL', amount_vnd: 100000, xu_amount: 90,
        status: 'success', gateway_message: 'Thành công', in_game: true,
        card_code_masked: '****5678', serial: '654321098765', created_at: new Date(Date.now() - 30 * 60_000).toISOString(),
        promotion_id: null, bonus_xu: null,
      },
      {
        request_id: 'r-cccc-3333', telco: 'VINAPHONE', amount_vnd: 200000, xu_amount: 216,
        status: 'success', gateway_message: 'Thành công', in_game: false,
        card_code_masked: '****9900', serial: '998877665544', created_at: new Date(Date.now() - 45 * 60_000).toISOString(),
        promotion_id: 2, bonus_xu: 36,
      },
      {
        request_id: 'r-dddd-4444', telco: 'VIETTEL', amount_vnd: 50000, xu_amount: null,
        status: 'failed', gateway_message: 'Thẻ đúng nhưng sai mệnh giá khai báo', in_game: false,
        card_code_masked: '****4321', serial: '556677889900', created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        promotion_id: null, bonus_xu: null,
      },
    ],
    bank_history: [
      {
        id: 1, amount_vnd: 500000, xu_amount: 500, status: 'credited',
        credit_command_status: 'done', credit_command_error: null,
        reference_code: 'OCB2610001', transaction_date_ms: Date.now() - 3_600_000,
        promotion_id: null, bonus_xu: null, content: 'AnTrc2',
      },
      {
        id: 2, amount_vnd: 10000, xu_amount: 12, status: 'credited',
        credit_command_status: 'pending', credit_command_error: null,
        reference_code: 'OCB2610006', transaction_date_ms: Date.now() - 8 * 3_600_000,
        promotion_id: 2, bonus_xu: 2, content: 'AnTrc2',
      },
      {
        id: 4, amount_vnd: 100000, xu_amount: 100, status: 'credited',
        credit_command_status: 'failed', credit_command_error: 'player_not_found',
        reference_code: 'OCB2610004', transaction_date_ms: Date.now() - 26 * 3_600_000,
        promotion_id: null, bonus_xu: null, content: 'AnTrc2',
      },
    ],
  },
}

/* ================== TRANG CHUYỂN XU /chuyen-xu (FRONTEND-4 §1) ==================
 * `my.transfers` có MỘT row cho MỖI trạng thái để test đủ badge/stepper.
 * Test khách: sửa `my: null`.
 */

const transferIso = (minsAgo) => new Date(Date.now() - minsAgo * 60_000).toISOString()

export const transferPageMock = {
  title: 'Chuyển Xu',
  lobby: { server_key: 'lobby-1', name: 'Lobby' },
  targets: [
    { server_key: 'pvp-1', name: 'PvP 1' },
    { server_key: 'survival-1', name: 'Survival 1' },
    { server_key: 'skyblock-1', name: 'Skyblock 1' },
    { server_key: 'minigame-1', name: 'Minigame 1' },
  ],
  limits: { min_amount: 10, max_amount: 1000000 },
  command_ttl_seconds: 60,
  my: {
    user: { username: 'AnTrc2', realname: 'An Trc' },
    transfers: [
      { transfer_id: 'tr-0001-pending', to_server_key: 'pvp-1', amount: 100, status: 'pending', error: null, created_at: transferIso(1), completed_at: null },
      { transfer_id: 'tr-0002-debited', to_server_key: 'skyblock-1', amount: 300, status: 'debited', error: null, created_at: transferIso(6), completed_at: null },
      { transfer_id: 'tr-0003-refpending', to_server_key: 'minigame-1', amount: 500, status: 'refund_pending', error: 'credit expired: minigame-1 offline quá TTL', created_at: transferIso(50), completed_at: null },
      { transfer_id: 'tr-0004-completed', to_server_key: 'survival-1', amount: 1200, status: 'completed', error: null, created_at: transferIso(200), completed_at: transferIso(199) },
      { transfer_id: 'tr-0005-failed', to_server_key: 'pvp-1', amount: 50, status: 'failed', error: 'player_not_found', created_at: transferIso(320), completed_at: null },
      { transfer_id: 'tr-0006-refunded', to_server_key: 'minigame-1', amount: 200, status: 'refunded', error: 'expired', created_at: transferIso(600), completed_at: null },
      { transfer_id: 'tr-0007-reconcile', to_server_key: 'survival-1', amount: 800, status: 'needs_reconcile', error: 'agent uncertain quá timeout', created_at: transferIso(1440), completed_at: null },
    ],
  },
}

export default {
  homePageMock,
  machineListPageMock,
  machineDetailsMock,
  topupPageMock,
  transferPageMock,
}