# Hợp đồng dữ liệu frontend ↔ backend

Tài liệu này mô tả dữ liệu mà frontend mong đợi ở production. Frontend **không gọi API
để lấy dữ liệu trang**; backend render HTML đầy đủ SEO và nhúng `window.DATA`, sau đó
React đọc dữ liệu này để render lại giao diện.

## 1. Cách frontend chọn nguồn dữ liệu

| Môi trường | Nguồn |
| --- | --- |
| `npm run dev` | Mock trong `src/mock-data/` |
| `npm run build` | `window.DATA` do backend nhúng |
| `VITE_DATA_SOURCE=window` | Ép dev đọc `window.DATA` (test shape production) |
| `VITE_DATA_SOURCE=mock` | Ép dùng mock kể cả production (chỉ dùng khi debug) |

Production **không fallback về mock**. Thiếu dữ liệu → UI báo "Dữ liệu trang chưa sẵn
sàng"; slug không tồn tại → UI 404.

## 2. Envelope `window.DATA`

Đặt script ở cuối `<body>`, sau `<div id="root">` và asset JS:

```html
<body>
  <div id="root"><!-- SSR HTML đầy đủ SEO --></div>
  <script src="/index.js" defer></script>
  <script>window.DATA = {...};</script>
</body>
```

Shape khuyến nghị:

```jsonc
{
  "page": "home | machine_list | machine_detail | topup | auth",
  "payload": { /* dữ liệu riêng của trang */ },
  "site": {
    "header": { "menu": [{ "label": "Trang chủ", "to": "/" }] },
    "footer": {
      "columns": [{ "title": "Khám phá", "links": [{ "label": "Máy chủ", "to": "/may-chu" }] }],
      "socials": [{ "label": "Discord", "url": "https://..." }],
      "copyright": "© 2026 SV AeSieuQuay"
    },
    "server_info": { "ip": "aesieuquay.com", "online": true, "players": { "online": 120, "max": 500 }, "version": "1.21.11" }
  },
  "seo": {
    "title": "...",
    "description": "...",
    "canonical": "https://aesieuquay.com/...",
    "og_image": "https://...",
    "robots": "index, follow"
  },
  "notFound": false
}
```

- `payload` có thể đặt tên `data` — frontend chấp nhận cả hai.
- Trang chủ hiện tại backend phát **payload phẳng** (các key `header`, `hero`,
  `server_info`, … ở cấp cao nhất). Frontend vẫn hỗ trợ để tương thích.

## 3. Payload theo trang

### `/` — `page: "home"`

```jsonc
{
  "header": { "menu": [...] },
  "hero": {
    "name": "SV AeSieuQuay",
    "tagline": "Minecraft Server Việt Nam",
    "description": "...",
    "cta": { "primary": "Chơi ngay", "secondary": "Tham gia Discord" },
    "discord_url": "https://...",
    "bg_image": null,
    "images": [{ "id": 1, "src": "https://...", "alt": "..." }],
    "slideshow_interval": 4000
  },
  "server_info": { "ip": "...", "online": true, "players": { "online": 120, "max": 500 }, "version": "1.21.11" },
  "game_modes": { "title": "Máy chủ", "subtitle": "...", "modes": [{ "slug": "sinh-ton", "name": "Sinh tồn", "desc": "...", "features": [], "image": null }] },
  "highlights": { "title": "...", "items": [{ "icon": "⚡", "title": "...", "desc": "..." }] },
  "gallery": { "title": "...", "description": "...", "images": [{ "id": 1, "title": "...", "alt": "...", "src_asset": "https://...", "width": 1920, "height": 1080 }] },
  "community": { "title": "...", "description": "...", "socials": [{ "icon": "discord", "label": "Discord", "url": "..." }] },
  "footer": { "columns": [], "socials": [], "copyright": "..." }
}
```

Lưu ý:
- `highlights[].icon` là **emoji**, không phải tên icon.
- Gallery dùng `src_asset` (không phải `src`).
- `subtitle` ở `highlights`/`gallery` là tuỳ chọn, frontend không bắt buộc.

### `/may-chu` — `page: "machine_list"`

```jsonc
{
  "title": "Máy chủ",
  "subtitle": "...",
  "modes": [
    {
      "slug": "sinh-ton",
      "name": "Sinh tồn",
      "tagline": "Classic Survival",
      "short_desc": "...",
      "desc": "...",
      "status": "hot | new | normal",
      "players_online": 156,
      "difficulty": "Trung bình",
      "features": ["..."],
      "highlights": [{ "title": "...", "desc": "..." }],
      "images": ["https://..."],
      "rules": ["..."],
      "commands": ["/spawn"]
    }
  ]
}
```

### `/may-chu/<slug>` — `page: "machine_detail"`

Cùng shape với một phần tử trong `modes`, bắt buộc có `slug` và `name`; có thể thêm
`ip`, `discord_url`.

Nếu slug không tồn tại:

```jsonc
{ "page": "machine_detail", "notFound": true, "payload": null }
```

Backend **phải trả HTTP 404** cho trường hợp này. Frontend render trang 404 và đặt
`robots: noindex`.

### `/nap-the` — `page: "topup"`

```jsonc
{ "title": "Nạp thẻ", "subtitle": "Chọn hình thức nạp phù hợp với bạn", "cards": [] }
```

### `/dang-nhap`, `/dang-ky` — `page: "auth"`

Không cần payload riêng; vẫn nên gửi `site` để Header/Footer đúng.

## 4. SEO

- Backend render `<title>`, `meta[name=description]`, `link[rel=canonical]`, OG/Twitter,
  robots và JSON-LD trong `<head>`.
- Frontend `useSeo` upsert các thẻ trên (không tạo trùng) để giữ đồng bộ khi render lại.
- Tab đăng nhập/đăng ký, 404, 403, 500: `noindex, nofollow`.
- Canonical chuẩn:
  - `/`
  - `/may-chu`
  - `/may-chu/<slug>` (slug lowercase, ASCII, dấu gạch nối)
  - `/nap-the`
- JSON-LD gợi ý:
  - Trang chủ: `WebSite` + `Organization`
  - Danh sách: `ItemList` + `BreadcrumbList`
  - Chi tiết: `VideoGame` + `BreadcrumbList`
  - Nạp thẻ: `WebPage`

## 5. URL & status code

| URL | Xử lý |
| --- | --- |
| `/che-do-choi`, `/che-do-choi/<slug>` | Backend **301** → `/may-chu`, `/may-chu/<slug>` |
| Slug không tồn tại | **404** + HTML SEO + `notFound: true` |
| `/not-found` | Không còn route riêng; dùng catch-all 404 |
| `/nap-the/<card>` | Chưa hỗ trợ tới khi có dữ liệu thẻ |

Frontend có redirect tạm `/che-do-choi*` bằng full reload, nhưng 301 từ backend vẫn
bắt buộc để chuẩn SEO.

## 6. Checklist backend

- [ ] Trả HTML cho **mọi** URL SPA ở trên (hiện chỉ `/` có HTML; các URL khác trả JSON 404).
- [ ] Nhúng `window.DATA` ở cuối `<body>`, sau `<div id="root">` và script app.
- [ ] Gửi kèm `site` (header/footer/server_info) trong mọi payload.
- [ ] Trả HTTP 404 + `notFound: true` cho slug không tồn tại.
- [ ] 301 `/che-do-choi*` → `/may-chu*`.
- [ ] Sinh `sitemap.xml` động từ danh sách máy chủ thật.
- [ ] Giữ `#root` chứa HTML semantic đầy đủ cho crawler/no-JS.

## 7. Build output

`npm run build` xuất:

- `dist/index.js` — entry JS (tên cố định để khớp template `/index.js`)
- `dist/index.css` — CSS (tên cố định để khớp template `/index.css`)
- `dist/assets/*` — font/asset phụ (có hash, cache an toàn)
- `dist/favicon.png`, `dist/logo.png`, `dist/robots.txt`

Copy toàn bộ `dist/*` vào `backend/static/` (Flask serve tại root). Không dùng
`dist/index.html` ở production vì backend render template riêng.

## 8. Nhà mạng / mệnh giá nạp thẻ

Danh sách nhà mạng + mệnh giá được chụp **một lần** từ API getfee của
gachthe1s và hardcode tại `src/data/card-options.js` (chỉ giữ `telco` + `value`).

- Frontend **không** gọi API biểu phí lúc runtime.
- Không cần CORS, proxy hay partner_id trong `.env`.
- Không nằm trong `window.DATA`.
- Khi cổng gạch thẻ thay đổi mệnh giá/nhà mạng, cập nhật file trên thủ công.

Backend chỉ xử lý `POST /api/card/charge` khi gạch thẻ.

## 9. Session bootstrap — `GET /api/user/me`

Frontend gọi endpoint này khi app khởi động để khôi phục phiên đăng nhập
(`AuthProvider`). Auth qua cookie `access_token_cookie` hoặc Bearer token.

### Đã đăng nhập — HTTP 200

```json
{
  "success": true,
  "code": "success",
  "message": "Lấy thông tin người dùng thành công",
  "data": {
    "id": 1,
    "username": "AeSieuQuay123",
    "realname": "Nguyễn Văn A",
    "email": "user@example.com",
    "role_slug": "user",
    "registered_at": "2026-01-01T00:00:00Z",
    "last_login": "2026-10-24T12:00:00Z"
  },
  "request_id": "..."
}
```

- Khuyến nghị: `data` là **object user trực tiếp** (không bọc thêm `user`).
- Bắt buộc: `data.username`.
- Tuỳ chọn: `id`, `realname`, `email`, `role_slug`, `registered_at`, `last_login`.
- Header hiển thị `username` (fallback `realname` / `email`) và email trong dropdown.
- Frontend tự unwrap `data`; nếu backend trả `data: { user: {...} }` hoặc trả thẳng
  object user, frontend vẫn đọc được.

### Chưa đăng nhập

Khuyến nghị HTTP **200** với `data: null`:

```json
{
  "success": true,
  "code": "success",
  "message": "Chưa đăng nhập",
  "data": null,
  "request_id": "..."
}
```

Hoặc HTTP **401** (`code: "unauthorized"`) cũng được: frontend đã loại `/user/me`
khỏi cơ chế auto-refresh/redirect, nên guest sẽ được coi là "chưa có user" thay vì
bị đẩy sang `/dang-nhap`.