# Plan Frontend v2 — tiêu thụ `window.DATA` (SSR backend Flask)

> Áp dụng requirements **Frontend Requirements v2** (backend Flask SSR + `window.DATA`).
> Repo: frontend React 19 + Vite + Tailwind v4. Đọc kèm: `src/data/contract.ts`,
> `docs/data-contract.md`, `requirement.md`.

---

## 0. Current state đã xác minh trong repo (không phỏng đoán)

| Hạng mục | Trạng thái hiện tại | Hệ quả với v2 |
|---|---|---|
| Data layer | `src/data/index.ts` + `readWindowData()` đã hỗ trợ **payload phẳng** (`header/hero/server_info/game_modes/highlights/gallery/community/footer`) | Cần mở rộng keys mới: `stats` đã có, **thiếu** `server_status`, `top_donators`, `captcha` |
| Widget server home | `ServerInfoBar` trong `src/pages/landing/HomePage.tsx:373` đọc `data.server_info` (badge online/offline xám-trắng, không có maintenance, không bar players, không motd, copy IP thô) | **Thay bằng widget mới đọc `server_status`**; `server_info` chỉ còn fallback IP cho Footer/Hero/FinalCTA |
| Top đại gia | **Chưa tồn tại** (grep `donator` = 0 kết quả ngoài plan này) | Build mới hoàn toàn |
| Ping/latency pill | Không có ở home (`ClusterStatsStrip` chỉ status/players/tps/uptime) | Chỉ cần giữ nguyên — xác nhận "không vẽ ping" trong test |
| Turnstile | `@marsidev/react-turnstile@^1.6.3` **đã có trong package.json nhưng chưa dùng ở đâu**. `AuthPage.tsx` POST `/auth/login` + `/auth/register` **không** gửi `captcha_token`, không handle code captcha | Tích hợp widget + error handling `captcha_failed` / `captcha_unavailable` |
| Auth API | `src/api/client.js`: axios `withCredentials: true` ✓, auto-refresh single-flight ✓, envelope unwrap sẵn (`res.data`) | Gần như không đổi; thêm phân nhánh lỗi captcha ở `AuthPage` |
| Admin servers | `AdminServer` (`src/api/admin.ts:45`) và `ServerFormModal` (`AdminServersPage.tsx:204`) **chưa có** `display_public` / `lobby_display` | Thêm 2 flag + cột badge |
| Refresh cache | **Chưa có** hàm nào gọi `/admin/cache/refresh` | Thêm API fn + nút cooldown 15s |
| Format VND | `fmtVnd()` (`src/lib/format.ts:49`) → `"12.500.000 ₫"` | Dùng lại — đúng yêu cầu §2 |
| Toast | `src/components/ui/Toast.jsx` (portal, tự ẩn) | Dùng cho copy IP / refresh cache |
| Mock | `src/mock-data/pages.js` (`homePageMock`), `src/mock-data/admin.ts` | Phải bổ sung keys mới để dev chạy được |

**Nguyên tắc bất biến khi làm:** trang user KHÔNG fetch API lấy dữ liệu hiển thị;
điều hướng user-page dùng `<a href>`; khu `/admin/**` vẫn axios `/api/admin/*`.

---

## 1. Workstream A — Data contract (nền móng, làm trước tiên)

**File:** `src/data/contract.ts`, `src/data/index.ts`, `src/mock-data/pages.js`, `docs/data-contract.md`

A1. Thêm types vào `contract.ts`:

```ts
export interface ServerStatusBlock {
  ip: string
  port: number                    // 25565 mặc định
  version: string | null
  motd: string | null             // đã strip §
  status: 'online' | 'offline' | 'maintenance'
  online: boolean
  maintenance: boolean
  players: { online: number; max: number } | null
  tps: { avg_1m: number } | null
  uptime: { percent_7d: number | null; window_hours: number } | null
  servers: { total: number; online: number } | null
  cluster: { id: number; slug: string; name: string } | null
  source: { server_key: string; name: string; role: 'proxy'|'lobby'|'game'; admin_picked: boolean } | null
  updated_at_ms: number
}

export interface TopDonatorsBlock {
  title: string
  period: 'all'
  currency: 'VND'
  items: Array<{
    rank: number; username: string; display_name: string
    total_vnd: number; medal: 'gold'|'silver'|'bronze'|null
    avatar_url: string
  }>
  updated_at_ms: number
}

export interface CaptchaConfig { site_key: string | null }   // null = dev, ẩn widget
```

A2. Mở rộng `HomePayload`: `server_status?: ServerStatusBlock`, `top_donators?: TopDonatorsBlock`, `captcha?: CaptchaConfig`. Lưu ý va chạm tên: `ClusterStats.server_status` (mảng per-server) là field **bên trong** `stats` — khác cấp với key `server_status` của payload; đặt tên component/type phải tránh nhầm (type block mới tên `ServerStatusBlock`).

A3. `isHomePayload()`: thêm `'server_status' in value || 'top_donators' in value` vào điều kiện nhận diện payload phẳng.

A4. Reader `getHomePageData()` giữ nguyên luồng; quy ước resolve: **`server_status` thắng `server_info`**, `server_info` chỉ là fallback `ip` (khi backend chưa ship block).

A5. Mock: thêm `server_status` / `top_donators` / `captcha: { site_key: null }` vào `homePageMock`; mock `source.admin_picked` cả 2 trạng thái để test.

A6. Cập nhật `docs/data-contract.md` mục `/` + README luật data (§0 doc v2) — docs là nguồn truth cho backend.

**Acceptance:** `npm run typecheck` pass; dev mock render đủ 2 widget mới.

---

## 2. Workstream B — Widget "Trạng thái máy chủ" (§1 doc v2)

**File mới:** `src/components/stats/ServerStatusWidget.tsx`; sửa `HomePage.tsx` (xoá/thay `ServerInfoBar:373`).

B1. Props: `{ status: ServerStatusBlock | null, fallbackIp?: string }`. `status == null` → render bản dùng `server_info` cũ (giữ tương thích backend chưa upgrade); block luôn tồn tại theo hợp đồng nên branch này mỏng.

B2. Render rules (đúng bảng §1):
- Badge 3 màu: online `bg-emerald-500` "Đang online" · offline `bg-rose-500` "Offline" · maintenance `bg-amber-500` "Đang bảo trì". Chấm tròn pulse khi online (reuse tone logic `ClusterStatsStrip`).
- Players: progress bar `width = online/max*100%` + text `42/200`; `players == null` → ẩn dòng.
- IP: hiển thị `host` + chỉ nối `:${port}` khi `port !== 25565`; **copy luôn chuỗi đầy đủ** (`navigator.clipboard` + fallback textarea như code hiện có) + `Toast "Đã sao chép IP server!"`.
- Pill nhỏ `version`, `motd` — ẩn khi `null`.
- Sub-stats: `⚡ TPS {avg_1m.toFixed(1)}` (vàng nếu <18), `🕐 Uptime 7 ngày {percent_7d}%` (ẩn nếu `null` kể cả `percent_7d == null`), `🖥️ {online}/{total} server`.
- **Không** vẽ ping/latency — thêm comment chống tái xuất hiện.
- `updated_at_ms`: caption mờ "Cập nhật {fmtAgoMs(updated_at_ms)}" (hàm đã có trong `lib/format.ts`).
- Accessibility: `role="status"`, `aria-label` theo `status`.

B3. **KHÔNG** setInterval/poll — snapshot lúc render là hợp lệ (doc §0).

B4. Vị trí: ngay dưới Hero (đúng chỗ `ServerInfoBar` cũ), `FinalCTA`/Footer vẫn lấy IP từ `server_status.ip ?? server_info.ip`.

**Acceptance:** null-out từng field trong mock → từng sub-stat biến mất; đổi `status` → đúng badge; F5 thấy số mới (do TTL backend, FE không làm gì).

---

## 3. Workstream C — Widget "Top 5 Đại gia" (§2 doc v2)

**File mới:** `src/components/donators/TopDonators.tsx`; mount trong `HomePage.tsx` sau `GameModes` (trước `Highlights`).

C1. Header: `title` từ block (fallback "Bảng xếp hạng đại gia"). Không tab tháng — `period: "all"` constant.

C2. Row rendering:
- Rank 1: nền gradient vàng (`from-amber-400/20`), 👑, avatar 80px, border vàng glow.
- Rank 2–3: badge medal bạc/đồng theo `medal`, avatar 64px.
- Rank 4–5: dòng thường.
- Tên: `display_name` (dòng chính) + `@username` (dòng phụ muted).
- Tiền: `fmtVnd(total_vnd)` → `12.500.000 ₫` (đúng format doc yêu cầu).

C3. Avatar: `<img loading="lazy">` + placeholder `bg-surface-2` trong lúc load + `onError` → swap `https://mc-heads.net/avatar/Steve/{size}` (state `failed` per-item). CDN thứ 3 chậm/chặn là case thật → bắt buộc.

C4. `items.length === 0` → ẩn cả section (return `null`), không có empty-state ồn ào trên home. Block thiếu hẳn (backend cũ) → cũng ẩn.

C5. Caption `updated_at_ms` qua `fmtAgoMs`.

**Acceptance:** mock 5 item / rỗng / avatar URL sai → 3 trạng thái render đúng; không fetch API nào.

---

## 4. Workstream D — Cloudflare Turnstile trong Login/Register (§3, §4 doc v2)

**Files:** `src/pages/auth/AuthPage.tsx`, reader captcha mới `getCaptchaConfig()` trong `src/data/index.ts` (+mock `captcha.site_key`), `src/api/client.js` (chỉ thêm comment).

D1. Nguồn site key: `window.DATA.captcha.site_key` cho page `auth`. `site_key == null` → **không render widget, submit thẳng** (dev). Backend cần nhét `captcha` vào payload `/dang-nhap`+`/dang-ky` → ghi vào `docs/data-contract.md` (mục auth).

D2. Dùng `@marsidev/react-turnstile` (đã install):
```tsx
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
const tsRef = useRef<TurnstileInstance>(null)
const [token, setToken] = useState<string | null>(null)

{siteKey && (
  <Turnstile ref={tsRef} sitekey={siteKey} action="login"   // register: "register"
             appearance="auto"
             onSuccess={(t) => setToken(t?.token ?? null)}
             onExpire={() => setToken(null)}
             onError={() => setToken(null)} />
)}
```
Không cần script tag thủ công — thư viện tự inject `api.js`.

D3. Submit: body thêm `captcha_token: token` khi widget bật. **Client-side gate**: `siteKey && !token` → báo "Vui lòng xác minh bạn không phải robot", chặn submit (tiết kiệm 1 roundtrip 400).

D4. Xử lý lỗi theo envelope (`err.status`, `err.data.code` — `ApiError` đã expose cả hai):

| Điều kiện | Hành vi |
|---|---|
| `status===400 && code==='captcha_failed'` | Toast/alert "Xác minh thất bại, thử lại" + `setToken(null)` + `tsRef.current?.reset()` (render lại checkbox) |
| `status===503 && code==='captcha_unavailable'` | "Hệ thống xác minh đang bận, thử lại sau" + đếm retry trong state, **≥2 lần → disable submit 30s** (không auto-retry dồn) |
| Các lỗi auth khác | Giữ luồng `showApiError` hiện tại |

D5. `credentials: "include"` đã có (`withCredentials: true` trong client) — chỉ verify, không đổi. Cookie httpOnly: FE không đụng token trong response body.

D6. Register form cùng pattern (`action="register"`). Validate cũ giữ nguyên (username 3–16 `^[A-Za-z0-9_]+$`, password ≥6 — trùng doc §4).

**Acceptance:** dev (site_key null) login y như cũ; test với staging key: solved→200 cookie set; xoá token giả→400 `captcha_failed`→widget reset; block CF endpoint→503→message + giới hạn retry.

---

## 5. Workstream E — Admin: 2 flag mới (§5 doc v2)

**Files:** `src/api/admin.ts`, `src/pages/admin/AdminServersPage.tsx`, `src/mock-data/admin.ts`.

E1. `AdminServer` += `display_public: boolean | null`, `lobby_display: boolean | null`; `ServerDraft` += 2 field optional.

E2. Bảng server: thêm cột/badge "Public 🏠" (server nguồn widget home) và "Lobby chuyển xu" — dễ nhìn thấy trạng thái toàn cục.

E3. `ServerFormModal`: 2 checkbox. Radio semantics do backend guarantee (tối đa 1 `display_public` toàn hệ thống, 1 `lobby_display`/cụm) — FE chỉ gửi `true/false/null` qua PATCH, không tự enforce; nếu backend trả conflict thì showApiError hiển thị.
- `lobby_display` disable khi `role !== 'lobby'`.
- Hint UI: "Thay đổi flag tự invalidate cache home — không cần bấm refresh".

**Acceptance:** toggle `display_public` server B → reload list: server A tự false (backend); F5 home thấy IP/status đổi nguồn.

---

## 6. Workstream F — Nút "Làm mới dữ liệu" (§6 doc v2)

**Files:** `src/api/admin.ts`, `src/pages/admin/AdminOverviewPage.tsx` (PageHeader đã có slot Button, dòng ~101/117).

F1. `export const refreshPublicCache = async () => unwrapEnvelope(await apiPost('/admin/cache/refresh'))` — trả nguyên `{ refreshed, errors, lock_ttl_seconds }` (không unwrap mất data).

F2. UX:
- Button "Làm mới dữ liệu" cạnh nút tải-lại hiện có.
- Bấm → disabled + spinner; đọc `lock_ttl_seconds` từ response (fallback 15) → countdown giây trên label ("15s"), persist deadline trong `sessionStorage` để F5 không lách khoá.
- Client-guard: request lúc còn khoá → không gửi, toast "Vừa refresh, chờ Xs".
- Toast kết quả: success → `message` backend ("Đã làm mới 4 khối cache"); `errors` không rỗng → toast/list lỗi từng key (`web:donators: ...`).
- 429 `too_many_requests` (lách guard) → sync lại cooldown từ header/message.

**Acceptance:** bấm dồn dập chỉ 1 request thật; partial failure hiển thị `errors` mà không toast đỏ toàn cục (backend luôn 200).

---

## 7. Thứ tự thực hiện & estimates

| # | Task | PR | Estimate | Phụ thuộc |
|---|---|---|---|---|
| 1 | A — Contract + mock + docs | PR1 | 0.5d | — |
| 2 | B — ServerStatusWidget (thay ServerInfoBar) | PR2 | 1d | PR1 |
| 3 | C — TopDonators | PR2 | 0.5d | PR1 |
| 4 | D — Turnstile auth forms | PR3 | 1d | PR1 |
| 5 | E — Admin flags | PR4 | 0.5d | PR1 |
| 6 | F — Cache refresh button | PR4 | 0.5d | PR1 |
| 7 | Q — Test ma trận null/rỗng/lỗi + build | PR5 | 0.5d | tất cả |

Tổng ~4.5 dev-days. PR2 (home widgets) và PR3 (auth) song song được sau PR1.

## 8. Test matrix then chốt

- `server_status`: mọi sub-field `null` đồng loạt → chỉ còn badge + IP; `players:null` → ẩn bar; `maintenance:true` → badge vàng; `port:25565` → không hiện `:port`, `port:25566` → hiện.
- `top_donators.items`: `[]` → ẩn section; avatar lỗi → Steve; rank >5 không render.
- `captcha.site_key`: `null` → form không widget; invalid key → Turnstile error → token null → bị chặn client-side.
- 400 `captcha_failed` → widget reset thật (checkbox hiện lại).
- Admin: 2 server bật `display_public` liên tiếp → list reflect exclusive.
- `npm run typecheck && npm run lint && npm run build` xanh mỗi PR.

## 9. Rủi ro / open questions (cần backend confirm)

1. **Auth pages có nằm trong SSR?** Doc v2 không nêu rõ `window.DATA.captcha` có mặt ở `/dang-nhap` hay chỉ `/`. Nếu shell auth không có `window.DATA` → xin backend cam kết nhét tối thiểu `{ captcha: { site_key } }` (hoặc endpoint GET key công khai — trái principle, avoid).
2. `server_info` legacy: FE sẽ bỏ đọc cho widget (theo doc) nhưng vẫn dùng `ip` cho Footer/FinalCTA nếu `server_status.ip` thiếu — xác nhận `server_status.ip` luôn có (block "luôn tồn tại").
3. `display_public` exclusive do backend — FE không optimistic-update, luôn refetch list sau PATCH.
4. mc-heads.net bị chặn tại VN? Cân nhắc asset local `public/steve.png` làm fallback cuối (2 tầng: mc-heads → local).
5. TTL/độ tươi là việc backend; FE không thêm counter "tự cập nhật" giả.

## 10. Definition of Done (đối chiếu checklist §8 doc v2)

- [x] Home đọc `window.DATA.server_status`, không gọi API status — PR2
- [x] Badge 3 trạng thái + bar players + copy IP (+port ≠25565) — PR2
- [x] Không pill ping/latency — PR2 (review note trong code)
- [x] Ẩn từng sub-stat khi `null` — PR2
- [x] Top donators: 👑 rank 1, medal #2/#3, `fmtVnd` — PR2
- [x] Avatar onError → Steve; items rỗng → ẩn — PR2
- [x] Turnstile conditional + `captcha_token` + 2 error codes — PR3
- [x] Mọi fetch auth `credentials:"include"` — đã có, verify PR3
- [x] Admin `display_public`/`lobby_display` + refresh 15s cooldown — PR4
