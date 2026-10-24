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

/* ================== TRANG DANH SÁCH MÁY CHỦ ================== */

export const machineListPageMock = {
  title: 'Máy chủ',
  subtitle: 'Khám phá tất cả máy chủ tại SV AeSieuQuay',
  modes: [
    {
      slug: 'sinh-ton',
      name: 'Sinh tồn',
      tagline: 'Classic Survival',
      short_desc: 'Khám phá thế giới, bảo vệ lãnh thổ, chinh phục Boss mỗi cuối tuần.',
      desc: 'Chế độ Sinh tồn với hệ thống lãnh thổ, bang hội, Boss World Boss và sự kiện định kỳ.',
      status: 'hot',
      players_online: 156,
      difficulty: 'Trung bình',
      features: ['Lãnh thổ & claim đất', 'Boss & World Boss', 'Bang hội & liên minh', 'Thương mại người chơi', 'Sự kiện PvE'],
      highlights: [
        { title: 'Bảo vệ lãnh thổ', desc: 'Chỉ thành viên được phép trong claim' },
        { title: 'Boss đấu', desc: 'Thử thách cùng đội để nhận loot hiếm' },
        { title: 'Cộng đồng', desc: 'Xây dựng và phát triển cùng AE' },
      ],
      images: [
        'https://images.unsplash.com/photo-1601987077677-5346c0c57d3f?q=80&w=1974&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?q=80&w=2070&auto=format&fit=crop',
      ],
      rules: ['Không grief', 'Không hack/client bất hợp pháp', 'Tôn trọng người chơi khác'],
      commands: ['/spawn', '/home', '/sethome', '/warp', '/tpa', '/claim'],
    },
    {
      slug: 'skyblock',
      name: 'Skyblock',
      tagline: 'Sky Islands',
      short_desc: 'Bắt đầu từ đảo nhỏ trên không, mở rộng thành đảo vương quốc.',
      desc: 'Skyblock độc đáo với hệ thống đảo, nâng cấp giá trị đảo, shop, đấu giá và bảng xếp hạng.',
      status: 'hot',
      players_online: 98,
      difficulty: 'Dễ - Trung bình',
      features: ['Đảo riêng', 'Nâng cấp đảo', 'Shop & Trade', 'Sự kiện Island', 'Khu PvE'],
      highlights: [
        { title: 'Từ nhỏ đến lớn', desc: 'Mỗi block đều quý giá' },
        { title: 'Xếp hạng đảo', desc: 'Cạnh tranh top đảo' },
        { title: 'Phần thưởng', desc: 'Nhiều quà từ nhiệm vụ & sự kiện' },
      ],
      images: [
        'https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=2050&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
      ],
      rules: ['Không phá đảo người khác', 'Không exploit bug', 'Tuân thủ quy định trade'],
      commands: ['/is create', '/is home', '/is visit', '/is shop', '/is top'],
    },
    {
      slug: 'pvp',
      name: 'PvP',
      tagline: 'Arena Combat',
      short_desc: 'Khẳng định kỹ năng trong 1v1, Team, FFA.',
      desc: 'Arena PvP tối ưu combat, nhiều chế độ, hệ thống Rank & ELO, giải đấu tuần.',
      status: 'new',
      players_online: 64,
      difficulty: 'Khó',
      features: ['1v1 / 2v2 / FFA', 'Rank & ELO', 'Kit cân bằng', 'Giải đấu tuần', 'BXH toàn server'],
      highlights: [
        { title: 'Combat cân bằng', desc: 'Kit điều chỉnh thường xuyên' },
        { title: 'Thăng hạng', desc: 'Leo rank từ Bronze đến Master' },
        { title: 'Giải thưởng', desc: 'Top giải đấu nhận phần thưởng giá trị' },
      ],
      images: [
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
      ],
      rules: ['Không sử dụng hack', 'Chơi fair', 'Tôn trọng đối thủ'],
      commands: ['/pvp join', '/pvp leave', '/stats', '/top pvp'],
    },
    {
      slug: 'minigame',
      name: 'Minigame',
      tagline: 'Fun & Casual',
      short_desc: 'Bedwars, SkyWars, Build Battle và nhiều hơn nữa.',
      desc: 'Minigame giải trí, trận đấu ngắn, party cùng bạn bè, hệ thống coin & shop reward.',
      status: 'normal',
      players_online: 87,
      difficulty: 'Dễ',
      features: ['Bedwars', 'SkyWars', 'Build Battle', 'Party', 'Nhiệm vụ & Coin'],
      highlights: [
        { title: 'Chơi nhanh', desc: 'Vào trận ngay, không chờ lâu' },
        { title: 'Party', desc: 'Mời bạn bè cùng chơi' },
        { title: 'Thưởng', desc: 'Hoàn thành nhiệm vụ nhận Coin' },
      ],
      images: [
        'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1511882150382-421056c89033?q=80&w=2071&auto=format&fit=crop',
      ],
      rules: ['Không phá map', 'Chơi vui vẻ', 'Không spam chat'],
      commands: ['/play', '/party', '/lobby', '/stats'],
    },
  ],
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
  server_info: {
    ...DEFAULT_SERVER_INFO,
    online: true,
    players: { online: 156, max: 500 },
    version: '1.21.11',
  },
  game_modes: {
    title: 'Máy chủ',
    subtitle: 'Chọn máy chủ bạn yêu thích để bắt đầu chơi',
    // Dẫn xuất từ source of truth — không lặp dữ liệu.
    modes: machineListPageMock.modes.map((mode) => ({
      slug: mode.slug,
      name: mode.name,
      desc: mode.short_desc,
      features: mode.features.slice(0, 3),
      image: null,
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
  topupPageMock,
}