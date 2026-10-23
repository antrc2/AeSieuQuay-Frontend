/**
 * MOCK DATA — Trang chủ (development).
 *
 * ⚠️ QUY CHUẨN: tất cả key dùng SNAKE_CASE khớp với JSON backend trả về.
 * Sau này khi kết nối API thật chỉ cần data = await apiGet('/') là dùng lại y nguyên.
 *
 * ⚠️ QUY TẮC ẢNH:
 * - Mọi trường ảnh (bg_image / image / src_asset / src) nhận URL https:// ĐẦY ĐỦ
 *   trực tiếp từ backend/mock — UI dùng nguyên xi, KHÔNG ghép CDN/base URL.
 * - Chưa có ảnh thì để null → UI tự render placeholder gradient/icon (không lệch layout).
 * - Các trường text/label/mock — fake đầy đủ (dấu *) để UI có nội dung demo.
 */

export const home_mock = {
  header: {
    menu: [
      { label: 'Trang chủ', to: '/' },
      { label: 'Máy chủ', to: '/may-chu' },
      { label: 'Nạp thẻ', to: '/nap-the' },
    ],
    cta: { label: 'Chơi ngay', to: '/nap-the' },
  },

  hero: {
    name: 'SV AeSieuQuay',
    tagline: 'Minecraft Server Việt Nam',
    description:
      'Máy chủ Minecraft Việt Nam với nhiều chế độ chơi — nơi cộng đồng AE cùng nhau sinh tồn, xây dựng và cạnh tranh.',
    cta: { primary: 'Chơi ngay', secondary: 'Tham gia Discord' },
    discord_url: 'https://discord.gg/tBH4zEpK2S',
    bg_image: null, // 1 ảnh (nhanh) — null → dùng images[]
    images: [
      // Slideshow hero: src là URL https:// đầy đủ (vd: 'https://.../hero/1.webp') — > 1 ảnh → auto slideshow + dots
      { id: 1, src: "https://scontent.fhan2-3.fna.fbcdn.net/v/t39.30808-6/565374242_681987928284774_7809804959431331500_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x1365&ctp=s2048x1365&_nc_cat=108&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeEJFeGM4YGfjuVN_QI6QEjvhgcksLTNwPWGBySwtM3A9QiiJNpk0xJfjalR98Ag3fxJJGkRy--cS_VvSzUZuJ6w&_nc_ohc=tsrWFS8axTYQ7kNvwGHqfbZ&_nc_oc=AdrMtBfs8sGXlEhydtu8fV7p59ok2aTDsfR1z_1y7pyCxYy_dzMsiW5ejAPyngpg3rw&_nc_zt=23&_nc_ht=scontent.fhan2-3.fna&_nc_gid=cKPduiVpwH1Pr761e6G1aQ&_nc_ss=7b2a8&oh=00_AQPAhU2FPH0kYOmK7EKdcF9PmHZYaS8xkB8n0xKSbVKk3w&oe=6AE17188", alt: 'Toàn cảnh thế giới AeSieuQuay' },
      { id: 2, src: "https://scontent.fhan14-1.fna.fbcdn.net/v/t39.30808-6/854339217_1515804923640584_3264793913077626530_n.png?stp=dst-jpg_tt6&cstp=mx1254x1254&ctp=s1254x1254&_nc_cat=106&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=2285d6&_nc_eui2=AeGp9K6Ux2Wdr8fIhRc0xUzqOaES_cjoEFU5oRL9yOgQVU2JIP1nLTrJDQrKShMhw6EMURKorha3ZEbIH4gculDQ&_nc_ohc=oEL2eajh4EMQ7kNvwEMNnNi&_nc_oc=AdpDHNv2YOKbPKgoQR3k1sMaINwfmd2zDDBxvRkfMVbVx1Du-f4dNBaINgRw357mcCc&_nc_zt=23&_nc_ht=scontent.fhan14-1.fna&_nc_gid=KT-aa-3UhuUX0ly19Z4xSg&_nc_ss=7b2a8&oh=00_AQMP9K6ezAW4tlxA5VvI-WFo-_1RhR3AGRTw0xMzXUcOkQ&oe=6AE14D4A", alt: 'Khu sinh tồn ban đêm' },
      { id: 3, src: "https://scontent.fhan20-1.fna.fbcdn.net/v/t39.30808-6/562349911_681987754951458_6247526690889907526_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x1365&ctp=s2048x1365&_nc_cat=106&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeFtgm6dfdp_cqyzevqwLXqmvlvdXOc-yFq-W91c5z7IWpI01NokdUIlJu2TpxiYPTUEN9vbEXORNt4YV8fdOozG&_nc_ohc=-P-evDxMwUQQ7kNvwHxqho4&_nc_oc=AdpZ54MZgguYMFNz3xYq9q3ovTIqjLXE9DARl9XqrzuHInMk4HVQkxFQz4ry3rOASZg&_nc_zt=23&_nc_ht=scontent.fhan20-1.fna&_nc_gid=r4Hj2cPwyFhztoVRXhDVXA&_nc_ss=7b2a8&oh=00_AQPStSHHgODGMqtTHtGD6asHFDFhuVtzS76Y2IYwooeV1g&oe=6AE17E06", alt: 'Đấu trường PvP' },
    ],
    slideshow_interval: 1000, // ms chuyển ảnh
  },

  server_info: {
    ip: 'aesieuquay.com',
    online: true, // true = Online (chấm xanh) | false = Offline (chấm đỏ) | null = chưa có dữ liệu
    players: {
      online: 120,
      max: 500,
    },
    version: '1.21.11',
  },

  /* ===== game_modes — CẤU TRÚC CHUẨN (tên key + desc + features + image) ===== */
  game_modes: {
    title: 'Máy chủ', // tiêu đề section — luôn căn giữa (xem HomePage > GameModes)
    subtitle: 'Chọn phong cách chơi của bạn',
    modes: [
      {
        slug: 'sinh-ton',
        name: 'Sinh tồn',
        desc: 'Khám phá thế giới rộng lớn, xây dựng nhà cửa và đối mặt với đàn boss mỗi cuối tuần.',
        features: ['Bảo vệ lãnh thổ', 'Boss & rồng', 'Sự kiện hàng tuần'],
        image: null, // null → placeholder icon 🌳
      },
      {
        slug: 'skyblock',
        name: 'Skyblock',
        desc: 'Bắt đầu từ hòn đảo nhỏ bé trên không, mở rộng và phát triển đảo base của riêng mình.',
        features: ['Đảo riêng', 'Bảo vật', 'Shop & bang hội'],
        image: null, // null → placeholder icon 🏝️
      },
      {
        slug: 'pvp',
        name: 'PvP',
        desc: 'Khẳng định kỹ năng chiến đấu với các trận đấu đối kháng và arena đỉnh cao.',
        features: ['Arena 1v1', 'Team fight', 'Bảng xếp hạng mùa giải'],
        image: null, // null → placeholder icon ⚔️
      },
      {
        slug: 'minigame',
        name: 'Mini Game',
        desc: 'Nhiều mini game giải trí nhanh: Bed Wars, TNT Run, Parkour và nhiều trò khác.',
        features: ['Bed Wars', 'TNT Run', 'Parkour'],
        image: null, // null → placeholder icon 🎯
      },
    ],
  },

  highlights: {
    title: 'Vì sao chọn AeSieuQuay?',
    items: [
      {
        icon: '👥',
        title: 'Cộng đồng người chơi',
        desc: 'Cùng chơi với cộng đồng Minecraft AE Việt Nam thân thiện, hỗ trợ lẫn nhau.',
      },
      {
        icon: '🎮',
        title: 'Chế độ chơi đa dạng',
        desc: 'Nhiều lựa chọn từ sinh tồn, skyblock đến PvP cho mỗi phong cách chơi.',
      },
      {
        icon: '🛡️',
        title: 'Nội quy minh bạch',
        desc: 'Quy định rõ ràng, môi trường chơi lành mạnh và công bằng cho mọi người.',
      },
      {
        icon: '✨',
        title: 'Hình ảnh riêng biệt',
        desc: 'Website và in-game đều mang bản sắc riêng của server AeSieuQuay.',
      },
    ],
  },

  /* ===== gallery — fake cấu trúc (src_asset null → placeholder) ===== */
  gallery: {
    title: 'Khám phá thế giới AeSieuQuay',
    description: 'Những khoảnh khắc đáng nhớ trong game — từ khu sinh tồn đến đấu trường PvP.',
    images: [
      { id: 1, title: 'Khu sinh tồn', alt: 'Khu sinh tồn buổi đêm', src_asset: null, width: 1920, height: 1080 },
      { id: 2, title: 'Hòn đảo Skyblock', alt: 'Hòn đảo Skyblock giữa biển mây', src_asset: null, width: 1080, height: 1080 },
      { id: 3, title: 'Đấu trường PvP', alt: 'Arena PvP đỉnh cao', src_asset: null, width: 1080, height: 1080 },
      {
        id: 4,
        title: 'Thành thị do người chơi xây',
        alt: 'Thành phố do người chơi xây dựng',
        src_asset: null,
        width: 1920,
        height: 1080,
      },
    ],
  },

  /* ===== community — mạng xã hội ===== */
  community: {
    title: 'Cộng đồng AeSieuQuay',
    description:
      'Tham gia Discord, Facebook và TikTok để cập nhật tin tức, sự kiện và kết nối với người chơi khác.',
    cta: 'Tham gia cộng đồng',
    discord_url: 'https://discord.gg/tBH4zEpK2S',
    socials: [
      { icon: 'discord', label: 'Discord', url: 'https://discord.gg/tBH4zEpK2S' },
      { icon: 'facebook', label: 'Facebook', url: 'https://facebook.com/aesieuquay' }, // *demo — thay link thật
      { icon: 'tiktok', label: 'TikTok', url: 'https://tiktok.com/@aesieuquay' }, // *demo — thay link thật
    ],
    members_estimate: null, // KHÔNG bịa số thành viên — null → ẩn
    widget_id: null, // widget ID nếu backend cấp
  },

  /* ===== footer — socials fake (sau này nối API thật sẽ thay) ===== */
  footer: {
    columns: [
      {
        title: 'Khám phá',
        links: [
          { label: 'Chế độ chơi', to: '/che-do-choi' },
          { label: 'Bảng xếp hạng', to: '/bang-xep-hang' },
        ],
      },
      {
        title: 'Hỗ trợ',
        links: [
          { label: 'Wiki', to: '/wiki' },
          { label: 'Nội quy', to: '/noi-quy' },
          { label: 'Cửa hàng', to: '/cua-hang' },
        ],
      },
    ],
    socials: [
      { label: 'Discord', url: 'https://discord.gg/tBH4zEpK2S' },
      { label: 'Facebook', url: 'https://facebook.com/aesieuquay' }, // *demo — cần link thật
      { label: 'TikTok', url: 'https://tiktok.com/@aesieuquay' }, // *demo — cần link thật
      { label: 'YouTube', url: 'https://youtube.com/@aesieuquay' }, // *demo — cần link thật
    ],
    copyright: '© 2026 SV AeSieuQuay — Minecraft Việt Nam. Không liên kết chính thức với Mojang AB hoặc Microsoft.',
  },
}

/* Alias — nơi khác import homeMock cho gọn */
export const homeMock = home_mock

export default home_mock
