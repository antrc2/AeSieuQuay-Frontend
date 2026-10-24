# SV AeSieuQuay - Frontend

Frontend website cho máy chủ Minecraft **SV AeSieuQuay** được xây dựng với React 19, Vite, Tailwind CSS v4 và shadcn/ui.

## Công nghệ sử dụng

- [React 19](https://react.dev/) - Thư viện UI
- [Vite](https://vitejs.dev/) - Build tool & dev server
- [Tailwind CSS v4](https://tailtailwindcss.com/) - CSS framework
- [React Router DOM v7](https://reactrouter.com/) - Routing
- [Axios](https://axios-http.com/) - HTTP client
- [TypeScript](https://www.typescriptlang.org/) - Type checking (hỗ trợ JS/TSX)
- [React Hook Form](https://react-hook-form.com/) + [Yup](https://github.com/jquense/yup) - Form validation
- [@marsidev/react-turnstile](https://github.com/marsidev/react-turnstile) - Cloudflare Turnstile
- [react-icons](https://react-icons.github.io/react-icons/) - Icon library

## Tính năng

- **Landing page** - Trang chủ với Hero, Máy chủ, Cộng đồng,...
- **Dark/Light mode** - Chế độ sáng/tối mặc định dark, lưu trữ trong localStorage
- **Routing tiếng Việt** - Đường dẫn thân thiện như `/dang-nhap`, `/dang-ky`, `/nap-the`, `/may-chu`
- **Xác thực** - Đăng nhập/đăng ký, quản lý session với cookie, auto-refresh token
- **Nạp thẻ** - Trang nạp thẻ với form thẻ cào và ATM/Bank
- **Máy chủ** - Danh sách và chi tiết các máy chủ (Sinh tồn, Skyblock, PvP, Minigame)
- **Auth Context** - Quản lý trạng thái đăng nhập toàn cục, giảm thiểu request `/user/me`

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build production
npm run build

# Preview build
npm run preview

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Cấu trúc dự án

```
src/
├── api/          # API client (axios + interceptors)
├── components/   # UI components & layout
├── config/       # Cấu hình môi trường
├── hooks/        # Custom hooks
├── lib/          # Utilities
├── mock-data/    # Mock data cho development
├── pages/        # Các trang
├── providers/    # React Context providers
├── router/       # React Router configuration
├── styles/       # Global styles & CSS variables
└── theme/        # Theme management
```

## Biến môi trường

Tạo file `.env.development` và `.env.production`:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_ENV=development
```

## Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng tạo pull request hoặc issue để thảo luận.

## License

Private project - All rights reserved
