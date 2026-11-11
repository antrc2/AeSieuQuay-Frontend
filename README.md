# SV AeSieuQuay — Frontend

Website cho máy chủ Minecraft **SV AeSieuQuay**: React 19 + Vite + Tailwind CSS v4,
TypeScript toàn bộ. Trang user render từ `window.DATA` do backend Flask nhúng
(SSR hydrate); khu admin là SPA gọi `/api/admin/*`.

## Công nghệ

| Nhóm | Thư viện |
|---|---|
| UI | React 19, Tailwind CSS v4 (`@tailwindcss/vite`), lucide-react |
| Build | Vite 8 (rolldown), TypeScript 5.9 |
| Routing | React Router DOM v7 |
| HTTP | Axios (cookie HttpOnly, auto-refresh single-flight) |
| Form/feedback | sweetalert2, validation tự viết trong từng form |
| Editor HTML | CodeMirror 6 (lazy-load riêng cho 2 trang soạn nội dung) |
| Captcha | `@marsidev/react-turnstile` (Cloudflare Turnstile) |
| Font | `@fontsource-variable/inter` |

## Cài đặt & chạy

```bash
npm install
npm run dev        # dev server — mặc định đọc MOCK (xem bên dưới)
npm run build      # build production → dist/
npm run preview    # xem thử build
npm run typecheck  # tsc --noEmit
npm run lint       # oxlint
```

Biến môi trường (`.env.development` / `.env.production`):

```env
VITE_API_BASE_URL=http://localhost:5000/api   # prod: /api
VITE_DATA_SOURCE=mock|window                  # mock: dữ liệu giả; window: đọc window.DATA
VITE_SITE_URL=https://aesieuquay.com          # canonical/OG (tuỳ chọn)
```

- **Dev mặc định = mock** (`src/mock-data/`) — không cần backend vẫn xem được UI.
  Đặt `VITE_DATA_SOURCE=window` để test shape production với backend thật.
- **Khu admin luôn gọi API thật** kể cả dev; chỉ rơi về mock khi
  `VITE_DATA_SOURCE=mock`.
- Build ra `dist/index.js` + `dist/index.css` (tên cố định — template SSR của
  backend tham chiếu trực tiếp). Copy `dist/*` sang `backend/static/` khi deploy.

## Kiến trúc dữ liệu

Luật bất biến của trang user (chi tiết: `docs/data-contract.md`):

```
read  = window.DATA        (backend SSR nhúng payload theo src/data/contract.ts)
write = POST /api/...      (chỉ ACTION: /card/charge, /card/check, /points/transfers, /checkin)
live  = poll GET tối thiểu CHỈ cho giao dịch vừa action, tới khi terminal thì DỪNG
```

- Trang user (`/`, `/may-chu*`, `/nap-the`, `/chuyen-xu`, `/trang/:slug`…)
  **không fetch danh sách/biểu phí/số dư lúc mở trang** — mọi thứ nằm trong
  `window.DATA`. Ngoại lệ duy nhất: `/chuyen-xu` gọi `POST /points/balance-check`
  + poll 1s (≤20s) vì số dư thật nằm PlayerPoints in-game.
- Điều hướng giữa trang user dùng `<a href>` (full reload → nhận `window.DATA`
  mới), **không** `<Link>` SPA. Khu `/admin/**` ngược lại: SPA + `<Link>`,
  dữ liệu qua `src/api/admin.ts`.
- `src/data/index.ts` là reader duy nhất: chuẩn hoá envelope/payload phẳng,
  trả `DataResult<T>` (`ok | missing | not_found`). Production không fallback mock.
- **Menu là đặc quyền frontend**: `DEFAULT_MENU` trong `src/data/site.ts` là
  nguồn duy nhất — backend không còn trả `header.menu`. Thêm/bớt menu = sửa file đó.

## Cấu trúc thư mục

```
src/
├── api/            # client.ts (axios + ApiError + auto-refresh), admin.ts (toàn bộ /api/admin)
├── components/
│   ├── admin/      # blocks/badges/form/Modal/Pagination/HtmlEditor/LineChart… dùng chung trang admin
│   ├── layout/     # Header, Footer, SiteLayout, AdminLayout, ScrollTopButton
│   ├── ui/         # button, card, badge, States (Skeleton/EmptyState), Toast, CopyIpButton
│   └── …           # CheckinCard/Dialog, donators, stats, game, auth, theme
├── config/         # env.ts — đọc biến VITE_*, window.DATA, useMockData
├── data/           # contract.ts (type payload SSR), index.ts (reader), site.ts (menu/footer default)
├── hooks/          # useAuth, useAdminList, usePagedQuery, useBalanceCheck, useSeo, useTheme
├── lib/            # format.ts (tiền/giờ VN), siteAddress.ts, utils.ts (cn, getBackHref)
├── mock-data/      # pages.ts + generate.ts (trang user), admin.ts (admin API in-memory)
├── pages/          # landing, game, topup, transfer, site, auth, errors, admin (16 trang)
├── providers/      # AuthProvider — phiên đăng nhập, cache sessionStorage 5', re-validate khi tab hiện
├── router/         # index.tsx (route tree), RouteHelpers (legacy redirect)
├── styles/         # index.css — design tokens light/dark, @source safelist
├── theme/          # initTheme — dark-first, chống nhấp nháy trước khi React render
└── utils/          # swal.ts — showApiError/showSuccess (envelope + validation 422)
```

`tailwind-safelist.html` (root): safelist class Tailwind xuất hiện trong HTML
admin soạn lưu DB (không qua scanner) — được `@source` trong `styles/index.css`.
**Đừng xoá.**

## Quy ước chung

- **Type-first**: mọi payload SSR khai báo trong `data/contract.ts`; mọi response
  admin khai báo trong `api/admin.ts`. Không `any` mới ở code application.
- **Hook danh sách admin**: `useAdminList(fetcher, errorTitle)` — load + reload +
  toast lỗi + chống setState sau unmount. Phân trang server-side: `usePagedQuery`
  (lưu ý `sizeKey`: bank/points đọc `limit`, card/users đọc `page_size`).
- **Lỗi API**: interceptor chuẩn hoá về `ApiError {message, status, data}`;
  trang gọi `showApiError(err, title)` — tự bung danh sách lỗi validation 422.
- **Theme**: dark mặc định, lưu `localStorage['aesq-theme']`, đồng bộ tab khác
  qua `storage` event; token màu trong `styles/index.css`.
- **SEO**: `useSeo` (title/meta/OG/JSON-LD) — trang admin luôn `noindex: true`.
- Route tiếng Việt: `/dang-nhap`, `/dang-ky`, `/nap-the`, `/chuyen-xu`, `/may-chu`,
  `/luat-le`, `/dieu-khoan`, `/chinh-sach-bao-mat`, `/trang/:slug`.

## Tài liệu chi tiết

- `docs/data-contract.md` — contract `window.DATA` giữa backend SSR và frontend.
- `docs/admin-api.md` — API khu admin (shape từng endpoint).
- Backend repo: `../backend/README.md` + các spec `admin-api.md`,
  `admin-history-api.md`, `points-user-api.md`.

## License

Private project — All rights reserved.