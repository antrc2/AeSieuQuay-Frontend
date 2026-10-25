# Requirement cho backend — từ frontend admin dashboard

Frontend đã build xong khu `/admin` theo `backend/admin-api.md` (clusters, servers,
API keys, monitor). **Chuyển xu (points) đã BỎ khỏi admin** vì backend xác nhận
`/api/admin/points/*` bị 404 — points là tính năng user (`points-user-api.md`).

Dưới đây là những gì backend cần làm / xác nhận. Endpoint nào frontend đã dùng và
chạy đúng thì **giữ nguyên contract**, đừng đổi shape.

---

## R1. Serve HTML shell cho MỌI sub-path của `/admin/**` (bắt buộc)

Frontend điều hướng SPA trong khu admin với các URL:

```
/admin
/admin/clusters
/admin/servers
/admin/keys            (?server=<key> là query, không ảnh hưởng route)
/admin/monitor
/admin/monitor/<server_key>     ← server_key có thể chứa `. - _` (vd proxy-1, survival-1)
```

Yêu cầu:
- Flask trả **đúng shell React (index.html)** cho mọi path trên khi user F5/chia sẻ
  link trực tiếp (hiện mới confirm `/admin`; check cả deep path).
- Shell `/admin/**` phải có `<meta name="robots" content="noindex, follow">` —
  khu admin không index. Không cần `window.DATA` cho khu này.
- `server_key` chứa ký tự `.` trong path (`/admin/monitor/surv.1`) không được Flask
  cắt thành file extension — dùng converter `<path:server_key>` nếu needed.

## R2. Chuẩn hoá shape list response monitor (đang không nhất quán)

Frontend đang phải phòng thủ cả 2 kiểu. Đề nghị backend **chốt 1 kiểu: mảng phẳng**
trong `data`:

| Endpoint | Hiện tại (theo tài liệu/code) | Mong muốn |
| --- | --- | --- |
| `GET /servers/<n>/exceptions?limit=` | có thể là `[…]` hoặc `{total, items:[…]}` | mảng phẳng `[…]` (mỗi item đủ `source,message,stack,count,first_seen_ms,last_seen_ms`) |
| `GET /servers/<n>/plugins` | `[…]` hoặc `{items}` | mảng phẳng |
| `GET /servers/<n>/players/online` | `[…]` | giữ nguyên ✓ |
| `GET /servers/<n>/events` | `{total, limit, offset, items}` | giữ nguyên ✓ (paged, có total để phân trang) |

## R3. `latest_boot.uptime_ms` có giá trị thật

`GET /api/admin/monitor/servers/<name>` → `latest_boot.uptime_ms` hiện có vẻ 0/null.
Frontend đang tự tính `now - started_at_ms`. Yêu cầu: backend điền `uptime_ms` =
`(now_ms - started_at_ms)` nếu boot đang chạy, hoặc `ended_at - started_at` nếu boot
đã tắt. (Nếu đã đúng rồi thì confirm, frontend sẽ bỏ đoạn tự tính.)

## R4. Metrics chart — hợp đồng dữ liệu (frontend vẽ bằng SVG nội bộ, không cần backend đổi gì nếu đã đúng)

`GET /servers/<n>/metrics?kind=perf|heartbeat|system&granularity=minute|hour&from_ms&to_ms`

- `points` **tăng dần theo `bucket_ms`** ✓ (theo doc)
- Bucket không có sample: **không bỏ hẳn** — vẫn phát sinh bucket với các field
  `null` (frontend ngắt nét tại null, không vẽ 0 giả). Nếu backend đang bỏ trống
  bucket thì đây là thay đổi cần làm; nếu không đổi được thì confirm để frontend
  render khoảng trống theo time-scale (hiện tại frontend đã vẽ theo `bucket_ms`
  thật nên vẫn đúng, chỉ thưa điểm).
- `cpu_process_avg` giữ là **fraction 0–1** (frontend ×100).
- Granularity `minute` tối đa ~48h, `hour` cho 7d/30d — frontend gửi range
  1h/24h (minute), 7d (hour). Nếu backend cap khoảng khác, ghi rõ trong doc.

## R5. Event `kind` — gửi danh sách enum ổn định

Frontend gắn nhãn màu theo `kind` (`join, quit, command, lag, death, crash,
server_start, server_stop` + fallback). Yêu cầu: liệt kê đầy đủ các `kind` sẽ phát
sinh vào doc; kind mới phải là **snake_case tiếng Anh**, frontend fallback nhãn thô
nên không vỡ UI.

## R6. Uptime lịch sử (phase sau — khi nào có endpoint, frontend nối vào)

`monitor_server_status_periods` đã có bảng nhưng chưa API. Đề xuất:

```
GET /api/admin/monitor/servers/<name>/uptime-periods?from_ms&to_ms
→ [ { started_at_ms, ended_at_ms | null, reason: 'boot'|'crash'|'shutdown'|null } ]
```

Frontend sẽ hiển thị thanh uptime + nút xem downtime. **Không tự chế endpoint nào
khác admin-api.md khi chưa thống nhất.**

## R7. Xác nhận giúp frontend (không phải code mới)

- [ ] `/api/admin/servers` (list) luôn kèm `monitor_key_configured`,
      `points_key_configured`, `*_rotated_at` — frontend dùng để badge đỏ, không
      gọi `GET /servers/<id>/keys` cho từng dòng.
- [ ] `POST .../keys/<kind>/rotate` trả 201 với `api_key` raw **duy nhất trong
      response đó** ✓ (frontend xoá state khi đóng modal — đã test).
- [ ] Middleware cho phép cookie access-token (JWT_TOKEN_LOCATION có "cookies")
      ✓ frontend admin KHÔNG gắn header Authorization thủ công.
- [ ] Lỗi validation/admin trả envelope `message` tiếng dùng được để hiển thị
      trực tiếp (frontend show `err.data.message` bằng SweetAlert — đã test với
      409/400/422 mock).
- [ ] `include_inactive=1` trên `GET /api/admin/servers` nhận cả server đã tắt ✓
      (frontend có checkbox).
- [ ] Seeder/CLI tạo sẵn cụm `aesq` + các server thật khi deploy (DB dev local
      đã có: 1 cụm, 1 server registry, 1 monitor server + samples/events —
      frontend giờ gọi API thật nên thấy rõ; DB prod chưa kiểm chứng).

## R8. Những gì frontend đã xử lý (backend KHÔNG cần làm)

- Không cần `window.DATA` cho `/admin` — mọi số liệu qua API.
- 401 → client tự refresh 1 lần rồi mới báo lỗi (đã có trong `api/client.js`).
- Guest/non-admin vào `/admin` bị chặn phía UI (403 từ backend vẫn là lớp bắt buộc).
