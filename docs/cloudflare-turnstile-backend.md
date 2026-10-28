# Cloudflare Turnstile — hướng dẫn tích hợp backend (Flask)

Tài liệu này dành cho backend. Frontend (Vite + React) **đã hoàn tất phía client**.

## Hiện trạng frontend (backend không cần làm gì thêm ở đây)

- Widget captcha đã gắn vào 2 form: `/dang-nhap` (đăng nhập) và `/dang-ky` (đăng ký).
- Site key đọc từ env Vite `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY` (khai báo trong file `.env`).
- Widget là loại **visible, auto-verify** (`appearance: 'always'`, managed challenge):
  người dùng nhìn thấy widget nhưng **không cần bấm checkbox** — Cloudflare tự xác minh.
- Sau khi verify, frontend nhận token và gửi lên backend qua field **`turnstile_token`**
  trong JSON body của:
  - `POST /api/auth/login`
  - `POST /api/auth/register`

Đường dẫn đầy đủ (frontend gọi với `VITE_API_BASE_URL=/api`, xem `src/api/client.js`):
- Production (same-origin, sau Nginx/Flask): `POST /api/auth/login`, `POST /api/auth/register`
- Development: `http://localhost:5000/api/auth/login`, `.../api/auth/register`

Payload thực tế frontend gửi (JSON, kèm cookie session nếu có):

```json
{
  "username": "player1",
  "password": "***",
  "turnstile_token": "XXXX.YYYYY token do Cloudflare cấp"
}
```

Lưu ý: `turnstile_token` LUÔN xuất hiện trong body. Nếu widget chưa verify xong, giá trị là chuỗi rỗng `""` → backend nên trả 400 `captcha_missing`.

## PROMPT gửi cho backend (copy nguyên khối dưới đây)

```text
Bối cảnh: Frontend web Minecraft (Vite + React) đã tích hợp Cloudflare Turnstile (captcha) ở 2 form đăng nhập (/dang-nhap) và đăng ký (/dang-ky). Widget là loại HIỂN THỊ CÔNG KHAI (không hidden) và TỰ ĐỘNG XÁC MINH (managed challenge, appearance='always') — người dùng không cần bấm checkbox. Site key frontend đọc từ env VITE_CLOUDFLARE_TURNSTILE_SITE_KEY (hiện đang dùng sitekey test của Cloudflare: 0x4AAAAAAADnPIDROrmt1Wwj).

Yêu cầu phía backend (Flask, Python):

1. Accept field mới "turnstile_token" (string) trong JSON body của 2 endpoint:
   - POST /api/auth/login  (body: { username, password, turnstile_token })
   - POST /api/auth/register (body: { username, email?, password, turnstile_token })
   Field này luôn tồn tại; nếu rỗng/chuỗi trống nghĩa là captcha chưa xác minh xong.

2. Thêm biến môi trường TURNSTILE_SECRET_KEY chứa secret key (private) tương ứng site key của frontend (lấy từ Cloudflare Dashboard → Turnstile → Widgets). Trong dev có thể dùng secret key test của Cloudflare: 1x0000000000000000000000000000000AA (luôn pass khi pair với sitekey test ở trên). TUYỆT ĐỐI không gửi secret key ra client.

3. Trước khi xử lý login/register, validate token bằng cách gọi:
   POST https://challenges.cloudflare.com/turnstile/v0/siteverify
   Content-Type: application/x-www-form-urlencoded
   Body params: secret=<TURNSTILE_SECRET_KEY>, response=<turnstile_token>, remoteip=<IP người dùng, tuỳ chọn>
   Timeout gợi ý 5s. Parse JSON response, chỉ tiếp tục khi "success": true.

4. Quy ước lỗi (frontend hiển thị message trả về):
   - Thiếu/sai turnstile_token hoặc token rỗng → HTTP 400, JSON: {"error":"captcha_missing","message":"Thiếu captcha, vui lòng thử lại"}
   - siteverify trả success=false → HTTP 403, JSON: {"error":"captcha_failed","message":"Xác minh captcha thất bại, vui lòng thử lại"}
   - Không được thay đổi response thành công hiện có của 2 endpoint (giữ nguyên logic code cũ, chỉ THÊM bước kiểm tra captcha ở đầu handler).

5. Gợi ý implement: viết decorator @turnstile_required bọc 2 route, ví dụ:

   import os, requests
   from functools import wraps
   from flask import jsonify, request

   TURNSTILE_SECRET = os.environ.get("TURNSTILE_SECRET_KEY")
   SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

   def verify_turnstile(token, remote_ip=None):
       if not TURNSTILE_SECRET:
           return True  # chưa cấu hình → bỏ qua (chỉ dev)
       payload = {"secret": TURNSTILE_SECRET, "response": token}
       if remote_ip:
           payload["remoteip"] = remote_ip
       try:
           r = requests.post(SITEVERIFY_URL, data=payload, timeout=5)
           r.raise_for_status()
           return bool(r.json().get("success"))
       except requests.RequestException:
           return False

   def turnstile_required(fn):
       @wraps(fn)
       def wrapper(*a, **kw):
           body = request.get_json(silent=True) or {}
           token = (body.get("turnstile_token") or "").strip()
           if not token:
               return jsonify({"error": "captcha_missing", "message": "Thiếu captcha, vui lòng thử lại"}), 400
           if not verify_turnstile(token, request.remote_addr):
               return jsonify({"error": "captcha_failed", "message": "Xác minh captcha thất bại, vui lòng thử lại"}), 403
           return fn(*a, **kw)
       return wrapper

6. Lưu ý spec Cloudflare: token hết hạn sau ~300 giây và siteverify chỉ dùng được MỖI TOKEN MỘT LẦN (verify lại lần 2 sẽ fail). Không cache/reuse token; mỗi lần user submit là token mới.

7. Test:
   - Dev: dùng cặp test keys ở trên → mọi submit hợp lệ phải trả 200.
   - Gửi request body turnstile_token="" → phải nhận 400 captcha_missing.
   - Gửi token giả → phải nhận 403 captcha_failed.
   - Khi deploy: thay sitekey thật (trong .env frontend VITE_CLOUDFLARE_TURNSTILE_SITE_KEY) và thêm domain production vào widget trên Cloudflare Dashboard, set TURNSTILE_SECRET_KEY thật cho backend.
```

## Việc backend cần làm

Xác thực `turnstile_token` với Cloudflare **trước khi** xử lý login/register.

### 1. Biến môi trường

| Env | Ý nghĩa |
|---|---|
| `TURNSTILE_SECRET_KEY` | Secret key (bắt đầu `0x4AAAA...`) lấy từ Cloudflare Dashboard → Turnstile → Widgets. CẶP ĐÔI với site key của frontend. |

Test keys của Cloudflare (sitekey + secret đều luôn pass, dùng để dev):
- Sitekey test: `0x4AAAAAAADnPIDROrmt1Wwj` (frontend đang dùng)
- Secret test: `1x0000000000000000000000000000000AA`

### 2. Endpoint verify

`POST https://challenges.cloudflare.com/turnstile/v0/siteverify`
`Content-Type: application/x-www-form-urlencoded`

Params: `secret` (secret key), `response` (turnstile_token), `remoteip` (tuỳ chọn — IP user).

### 3. Code mẫu Flask

```python
import os
import requests
from functools import wraps
from flask import jsonify, request

TURNSTILE_SECRET = os.environ.get("TURNSTILE_SECRET_KEY")
SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile(token: str, remote_ip: str | None = None) -> bool:
    """Gọi Cloudflare siteverify. Trả về True nếu token hợp lệ."""
    if not TURNSTILE_SECRET:
        # Chưa cấu hình secret → bỏ qua (chỉ nên xảy ra ở môi trường dev)
        return True
    payload = {"secret": TURNSTILE_SECRET, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip
    try:
        resp = requests.post(SITEVERIFY_URL, data=payload, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        return bool(data.get("success"))
    except requests.RequestException:
        # Network lỗi → fail-closed hay fail-open tuỳ policy; ở đây fail-closed
        return False


def turnstile_required(handler):
    """Decorator: yêu cầu turnstile_token hợp lệ cho auth endpoint."""
    @wraps(handler)
    def wrapper(*args, **kwargs):
        body = request.get_json(silent=True) or {}
        token = (body.get("turnstile_token") or "").strip()
        if not token:
            return jsonify({"error": "captcha_missing",
                            "message": "Thiếu captcha, vui lòng thử lại"}), 400
        if not verify_turnstile(token, request.remote_addr):
            return jsonify({"error": "captcha_failed",
                            "message": "Xác minh captcha thất bại, vui lòng thử lại"}), 403
        return handler(*args, **kwargs)
    return wrapper
```

Gắn vào 2 route:

```python
@app.post("/api/auth/login")
@turnstile_required
def auth_login():
    ...  # logic cũ giữ nguyên

@app.post("/api/auth/register")
@turnstile_required
def auth_register():
    ...  # logic cũ giữ nguyên
```

### 4. Quy ước response lỗi (frontend sẽ hiển thị `message` nếu có)

| HTTP | error code | Khi nào |
|---|---|---|
| 400 | `captcha_missing` | Body không có `turnstile_token` |
| 403 | `captcha_failed` | siteverify trả `success: false` |

Frontend không cache token: mỗi lần submit là token mới; token hết hạn ~300s và chỉ verify được 1 lần (đúng spec Cloudflare) — backend không cần lưu.

### 5. Checklist

- [ ] Tạo widget Turnstile trên Cloudflare Dashboard (Managed/Non-interactive hoặc Interactive — frontend render dạng visible auto).
- [ ] Thêm domain production vào widget (dev: `localhost`).
- [ ] Set `TURNSTILE_SECRET_KEY` cho backend (KHÔNG bao giờ expose secret ra client).
- [ ] Implement verify như code trên cho `/auth/login` và `/auth/register`.
- [ ] Test flow: mở `/dang-nhap` → widget tự verify → submit → backend trả 200; giả mạo token → backend trả 403.
