# Admin dashboard — frontend admin (khu `/admin`)

Tài liệu mô tả **khu `/admin` phía frontend**. Admin quản lý **hạ tầng**
(cụm, server, API key, monitor) và **nội dung máy chủ game** (game modes:
form + editor HTML). **Chuyển xu (points) KHÔNG thuộc admin** —
đó là tính năng của user đã đăng nhập qua `/api/points/**`
(xem `backend/points-user-api.md`); `/api/admin/points/*` đã bị backend bỏ (404).

Khác trang nội dung SEO (`window.DATA` + full reload `<a href>`), admin là
dashboard động gọi `/api/admin/*` → **được phép điều hướng SPA bằng React
Router (`<Link>`, `useNavigate`)** trong toàn khu `/admin/**`.

## 1. Auth

- Backend `middleware/admin_guard.py` chặn `/admin` + `/api/admin/**`: JWT hợp lệ
  và claim `role = "admin"`. Thiếu/hết hạn → `401`; role khác → `403`.
- `JWT_TOKEN_LOCATION=["headers","cookies"]` → frontend chỉ gửi cookie
  (`withCredentials`), không gắn Bearer thủ công.
- `AdminLayout` gate bằng `GET /api/user/me` (`role_slug === 'admin'`):
  **guest / sai role / hết hạn → trang 403 tại chỗ, không bounce sang
  `/dang-nhap`** (Forbidden có sẵn nút "Đăng nhập lại"; backend cũng trả shell
  403 cho `/admin/*` khi chưa đủ quyền). Đây chỉ là UX; **bảo mật thật nằm ở
  middleware backend**.
- `client.js` tự refresh khi 401 rồi retry 1 lần, áp dụng cho `/admin/*` và cả
  `/user/me` (hết access 30' nhưng refresh cookie còn 7 ngày → phiên vẫn sống;
  `/user/me` fail im lặng cho khách vãng lai, không redirect).
- Phiên = **cookie HttpOnly** (`access_token_cookie` Path=/,
  `refresh_token_cookie` Path=/api/auth): JS không đọc/ghi/xoá; muốn kết thúc
  phiên là `POST /auth/logout` trên đường duy nhất.

## 2. Màn hình ↔ API

| Route frontend | File | API |
| --- | --- | --- |
| `/admin` | `AdminOverviewPage` | `clusters` + `servers` + `monitor/overview` + `monitor/servers` (auto-refresh 15s) |
| `/admin/clusters` | `AdminClustersPage` | CRUD `/api/admin/clusters` (tạo kèm server con 1 transaction; DELETE = soft) |
| `/admin/servers` | `AdminServersPage` | CRUD `/api/admin/servers` — registry thuần, không chứa key panel |
| `/admin/keys` | `AdminKeysPage` | `GET /servers/<id>/keys`, rotate/set/revoke `/servers/<id>/keys/<kind>`; deep link `?server=<key>` |
| `/admin/monitor` | `AdminMonitorPage` | `monitor/servers` — lưới card server, refresh 15s |
| `/admin/monitor/<server_key>` | `AdminMonitorDetailPage` | `monitor/servers/<n>` + `/metrics` (chart SVG nội bộ) + `/events` + `/players/online` + `/exceptions` + `/plugins` |
| `/admin/game-modes` | `AdminGameModesPage` | CRUD `/api/admin/game-modes` (bảng + form basic; select `cluster_id` từ `listClusters`) |
| `/admin/game-modes/<id>/content` | `AdminGameModeContentPage` | `GET/PATCH game-modes/<id>` (`content_html`) + `POST /api/admin/upload` (multipart → S3, trả `{key,url}`); CodeMirror 6, lazy chunk riêng |
| `/admin/bank-deposits` | `AdminBankDepositsPage` | `GET /admin/bank-deposits` (+deep link `?status=`/`?q=`) · `POST …/<id>/requeue {username?}` là action DUY NHẤT; badge `DepositStatusBadge` theo ma trận §1.3, poll 3s khi còn cmd `pending/claimed` |
| `/admin/points-history` | `AdminPointsHistoryPage` | 2 tab `?tab=`: Transfers (`/admin/points/transfers` + detail drawer saga) · Commands (`/points/commands`, filter server points_enabled, chip `nạp bank #` → deep link `?q=<command_id>`); refresh TAY, không poll |
| `/admin/card-transactions` | `AdminCardTransactionsPage` | `GET /admin/card-transactions?status&q&user_id`; 3 StatCard tổng hợp client-side; tự refresh 10s khi còn `pending`; code thẻ luôn masked |
| `/admin/users` | `AdminUsersPage` | `GET /api/users?q&sort&order` (admin-only) — search debounce 300ms, sort header; click row → `GET /api/users/<id>` drawer: `money_summary` + reuse `BankDepositsTable`/`PointTransfersTable` với `user_id=`. CHỈ ĐỌC — đổi role/mật khẩu chưa có API |
| `/admin/monitor/<server>` | + tab Uptime / Disk & Worlds / Nâng cao | `uptime-periods` (thanh 7 ngày + %), `disks` + `worlds` (delta size), `samples`/`batches` (click row → modal JSON); top playtime cạnh "Đang online" |

Sidebar admin chia nhóm: **Tổng quan · Hạ tầng · Nội dung · Tài chính · Người dùng · Giám sát**.

Toàn bộ gọi qua `src/api/admin.ts` (duy nhất). **Mặc định — kể cả `npm run dev` —
gọi thẳng API thật** `http://localhost:5000/api/admin/*` (backend đã chạy; CORS
credentials + cookie `access_token_cookie` hoạt động vì `localhost:5173` và
`localhost:5000` cùng site, khác port). Chỉ khi đặt `VITE_DATA_SOURCE=mock`
trong `.env.development` mới dùng `src/mock-data/admin.ts` in-memory (shape
khớp backend) để làm việc offline.

## 3. Quy tắc nghiệp vụ đã cài ở UI (khớp backend)

- `role`: `proxy | lobby | game`; **proxy không được `points_enabled`** — form
  disable checkbox + lỗi inline (API vẫn là chốt cuối, trả 400).
- `server_key` khớp `^[A-Za-z0-9._-]+$`; slug cluster khớp `^[a-z0-9][a-z0-9-]*$`;
  trùng → 409 hiển thị message backend.
- Delete cluster/server = **soft delete** (inline confirm 2 bước, không SweetAlert).
- Monitor fields có thể `null` → mọi chỗ render "—"; LineChart ngắt nét tại null,
  không vẽ 0 giả.
- `bucket_ms` tăng dần → thẳng thành trục X; range nút: 1h/24h (`minute`),
  7 ngày (`hour`).

## 4. API key — quy tắc an toàn đã code

- Mỗi server 2 key (`monitor`, `points`); key tự định danh server (agent chỉ gửi
  `X-AESQ-Key`).
- **Raw key chỉ hiển thị đúng 1 lần** trong `GeneratedKeyModal` từ response
  rotate; state bị xoá khi đóng modal. Không log, không lưu, không vào URL.
- Rotate/revoke: inline confirm 2 bước; cảnh báo agent 401 tới khi cập nhật
  `config.yml`; rotate/set tự bật flag tương ứng, revoke tự tắt.
- Set key thủ công ≥24 ký tự; trùng key server khác → 409.
- Badge đỏ "chưa set" trên servers + card cảnh báo ở trang tổng quan.

## 4b. Editor nội dung máy chủ (game modes)

- 2 cột **HTML SOURCE** (CodeMirror 6, oneDark) / **CLIENT PREVIEW** (debounce
  250ms, toggle dark riêng cho preview bằng class `.dark` trên wrapper).
- `content_html` **chỉ sanitize server-side** (nh3, `core/sanitize.py`) lúc ghi
  DB; preview không sanitize (source chưa lưu của chính admin, trong browser
  của họ). Sau PATCH, editor **reset về `content_html` trong response** — admin
  thấy đúng bản canonical đã sạch.
- Chèn ảnh: `POST /api/admin/upload` (FormData `file` + `prefix=game-modes`;
  `Content-Type` để null để browser tự sinh boundary — axios XHR không thêm nếu
  set tay). URL trả về chèn tại con trỏ dưới dạng `<img … loading="lazy">`.
- Unsaved guard: `beforeunload` + `useBlocker` (confirm) khi còn lệch so với bản
  đã lưu; Ctrl/Cmd+S = Lưu.
- Class Tailwind trong DB HTML không được scanner thấy → khai báo tay trong
  `tailwind-safelist.html` (`@source` trong `styles/index.css`) + style mặc
  định `.aqs-prose` (dùng chung cho SSR Jinja, trang React và preview).

## 5. SweetAlert2 & validation

- SweetAlert2 **chỉ** dùng để báo response API (`showApiError` / `showSuccess`).
- Validation: chữ đỏ inline dưới từng field (`<Field error=…>`), không alert.

## 6. backend cần gì thêm

Xem `requirement.md` ở root repo frontend (R1–R8): shell HTML cho deep path
`/admin/**`, chuẩn hoá shape list monitor, `uptime_ms`, enum event `kind`,
endpoint uptime-periods (phase sau).
