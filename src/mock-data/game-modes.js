/**
 * MOCK DATA — Chế độ chơi
 */
export const gameModesMock = {
  list: {
    title: 'Máy chủ',
    subtitle: 'Khám phá tất cả máy chủ / chế độ tại SV AeSieuQuay',
    modes: [
      {
        slug: 'sinh-ton',
        name: 'Sinh tồn',
        tagline: 'Classic Survival',
        short_desc: 'Khám phá thế giới, bảo vệ lãnh thổ, chinh phục Boss mỗi cuối tuần.',
        desc: 'Chế độ Sinh tồn truyền thống với nhiều nâng cấp riêng. Xây dựng căn cứ, liên minh bang hội, bảo vệ tài nguyên và tham gia các sự kiện Boss hàng tuần để nhận phần thưởng giá trị.',
        status: 'hot',
        players_online: 156,
        difficulty: 'Trung bình',
        features: [
          'Lãnh thổ & claim đất',
          'Boss & World Boss hàng tuần',
          'Bang hội & liên minh',
          'Thương mại giữa người chơi',
          'Sự kiện PvE định kỳ',
        ],
        highlights: [
          { icon: 'shield', title: 'Bảo vệ lãnh thổ', desc: 'Chỉ thành viên có quyền truy cập claim của bang' },
          { icon: 'sword', title: 'Boss đấu', desc: 'Tham gia đấu Boss với đội ngũ để nhận loot hiếm' },
          { icon: 'users', title: 'Cộng đồng', desc: 'Xây dựng, kết giao và phát triển cùng AE' },
        ],
        images: [
          'https://images.unsplash.com/photo-1601987077677-5346c0c57d3f?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
          'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        ],
        rules: [
          'Không grief không được phép',
          'Không sử dụng hack/client bất hợp pháp',
          'Tôn trọng người chơi khác',
          'Tham gia sự kiện theo quy định',
        ],
        commands: ['/spawn', '/home', '/sethome', '/warp', '/tpa', '/claim'],
      },
      {
        slug: 'skyblock',
        name: 'Skyblock',
        tagline: 'Sky Islands',
        short_desc: 'Bắt đầu từ đảo nhỏ trên không, phát triển thành đảo vương quốc.',
        desc: 'Skyblock của AeSieuQuay mang đến trải nghiệm đảo bay độc đáo. Mở rộng đảo, nâng cấp máy móc, trao đổi, đấu giá và tham gia sự kiện island để leo bảng xếp hạng.',
        status: 'hot',
        players_online: 98,
        difficulty: 'Dễ - Trung bình',
        features: [
          'Đảo riêng của bạn',
          'Nâng cấp island & value',
          'Shop đảo & trade',
          'Sự kiện island hàng tuần',
          'Khu PvE đặc biệt',
        ],
        highlights: [
          { icon: 'island', title: 'Từ nhỏ đến lớn', desc: 'Mỗi block đều quý giá, phát triển từng bước' },
          { icon: 'chart', title: 'Xếp hạng đảo', desc: 'Cạnh tranh top đảo với cộng đồng' },
          { icon: 'gift', title: 'Phần thưởng', desc: 'Nhiều quà tặng từ sự kiện và nhiệm vụ' },
        ],
        images: [
          'https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=2050&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        ],
        rules: [
          'Không phá đảo người khác',
          'Không exploit bug',
          'Tuân thủ quy định trade',
        ],
        commands: ['/is create', '/is home', '/is visit', '/is shop', '/is top'],
      },
      {
        slug: 'pvp',
        name: 'PvP',
        tagline: 'Arena Combat',
        short_desc: 'Khẳng định kỹ năng trong các trận đấu 1v1, Team và Giải đấu.',
        desc: 'Arena PvP được tối ưu hóa cho combat mượt mà. Nhiều chế độ: 1v1, 2v2, Team Deathmatch, FFA với hệ thống rank, ELO và phần thưởng theo thứ hạng.',
        status: 'new',
        players_online: 64,
        difficulty: 'Khó',
        features: [
          '1v1 / 2v2 / FFA',
          'Hệ thống Rank & ELO',
          'Kit tùy chỉnh',
          'Giải đấu tuần',
          'Bảng xếp hạng toàn server',
        ],
        highlights: [
          { icon: 'sword-cross', title: 'Combat cân bằng', desc: 'Kit được cân chỉnh thường xuyên' },
          { icon: 'trophy', title: 'Thăng hạng', desc: 'Leo rank từ Bronze đến Master' },
          { icon: 'award', title: 'Giải thưởng', desc: 'Top giải đấu nhận vật phẩm giá trị' },
        ],
        images: [
          'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
          'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        ],
        rules: [
          'Không sử dụng hack',
          'Chơi fair, không toxic quá mức',
          'Tôn trọng đối thủ',
        ],
        commands: ['/pvp join', '/pvp leave', '/stats', '/top pvp'],
      },
      {
        slug: 'minigame',
        name: 'Minigame',
        tagline: 'Fun & Casual',
        short_desc: 'Nhiều game ngắn: Bedwars, Build Battle, SkyWars và nhiều hơn nữa.',
        desc: 'Tập hợp các minigame giải trí, phù hợp mọi người chơi. Quick match, lobby tiện lợi, vote map, hệ thống coin và shop reward.',
        status: 'normal',
        players_online: 87,
        difficulty: 'Dễ',
        features: [
          'Bedwars, SkyWars, Build Battle',
          'Vote map & chế độ chơi',
          'Hệ thống Coin',
          'Party cùng bạn bè',
          'Thưởng hằng ngày',
        ],
        highlights: [
          { icon: 'gamepad', title: 'Chơi nhanh', desc: 'Trận đấu ngắn, vào ngay không chờ lâu' },
          { icon: 'users', title: 'Party', desc: 'Mời bạn bè cùng vào đội' },
          { icon: 'star', title: 'Thưởng', desc: 'Hoàn thành nhiệm vụ nhận Coin' },
        ],
        images: [
          'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
          'https://images.unsplash.com/photo-1511882150382-421056c89033?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        ],
        rules: [
          'Không phá map',
          'Chơi vui vẻ là chính',
          'Không spam chat',
        ],
        commands: ['/play', '/party', '/lobby', '/stats'],
      },
    ],
  },
}

export default gameModesMock
