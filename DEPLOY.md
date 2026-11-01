# Triển khai production

Ứng dụng đặt món Atlas Restaurant chạy trên chính máy chủ này (163.61.182.201) tại **https://order.atlasplatform12.tech**. Jenkins tự test và deploy mỗi khi có commit lên `main`.

## Kiến trúc

```
Internet ──HTTPS──> nginx (host, certbot)
                     ├─ /api/  ──> 127.0.0.1:8084  backend  (Spring Boot, profile prod)
                     └─ /      ──> 127.0.0.1:8085  web      (nginx, bundle Expo web)
                                                  db       (PostgreSQL 16, không mở cổng, volume pgdata)
```

- Compose project: `restaurant-ordering-system` (`docker-compose.yml`). Image: `ordering-backend`, `ordering-web`.
- Schema do Flyway quản lý (`backend/src/main/resources/db/migration`). Hibernate chạy `ddl-auto=validate`, nên entity lệch với schema thì app không khởi động.
- Web và API chung một domain, nên không có request cross-origin. CORS chỉ cho phép `https://order.atlasplatform12.tech`.

| Đường dẫn trên host | Nội dung |
|---|---|
| `/home/coder/ordering-deploy` | Bản checkout `main` mà Jenkins dùng để build và chạy. `.env` chỉ tồn tại trong lúc deploy |
| `/home/coder/ordering-backups` | Bản dump DB: trước mỗi lần deploy và hằng đêm, giữ 30 bản mới nhất |
| `/home/coder/ordering-secrets/prod.env` | `.env` production gốc (quyền 600). `prod.env.b64` là bản base64 để dán vào Jenkins |

## Pipeline (`Jenkinsfile`, job multibranch `ordering`)

| Khi nào | Các bước |
|---|---|
| Mọi nhánh / PR | `mvn verify`: 19 bộ test, gồm test profile prod trên PostgreSQL thật (embedded). Sau đó `tsc`, `expo lint`, `expo export --platform web` |
| `main` | Thêm bước **Deploy production** (`scripts/deploy.sh`): backup DB → build image → chờ healthy → kiểm tra `/api/health`, `/api/menu`, trang web. Lỗi ở bất kỳ bước nào thì tự quay về image trước |
| 3 giờ sáng (nhánh `main`) | Chỉ backup DB (`scripts/backup-db.sh nightly`) |

Thông báo Telegram dùng chung bot và chat với dự án `rsm` (credential `telegram-bot-token`).

## Cài đặt lần đầu

### 1. DNS
Tạo bản ghi A `order.atlasplatform12.tech` → `163.61.182.201`. Kiểm tra bằng `getent hosts order.atlasplatform12.tech`.

### 2. Jenkins (giao diện web, quyền admin)
1. **Credential.** Vào *Manage Jenkins → Credentials → (global) → Add Credentials*.
   - Kind: **Secret text**
   - ID: `ordering-prod-env`
   - Secret: nội dung file `/home/coder/ordering-secrets/prod.env.b64` (một dòng)
2. **Job.** Vào *New Item → `ordering` → Multibranch Pipeline*.
   - Branch Source GitHub: `https://github.com/Anpham120/restaurant-ordering-system`. Repo public nên không cần credential, nhưng chọn `github-branch-source` để tránh giới hạn số lần gọi API.
   - Build Configuration: *by Jenkinsfile*, Script Path `Jenkinsfile`.
   - Scan triggers: *Periodically if not otherwise run*, interval **1 minute**, giống job `rsm`.
3. Lưu job. Jenkins quét nhánh, chạy build `main` và tự deploy.

### 3. nginx + HTTPS (cần sudo)
```bash
sudo cp deploy/nginx/order.atlasplatform12.tech.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/order.atlasplatform12.tech.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d order.atlasplatform12.tech --redirect
```
certbot thêm khối 443/TLS, chuyển HTTP sang HTTPS và tự gia hạn chứng chỉ.

## Thanh toán chuyển khoản (VietQR + SePay)

Khách chọn "Chuyển khoản VietQR". App hiện mã QR có sẵn số tiền và nội dung `ATL<mã đơn>`. Khi tiền vào tài khoản quán, SePay gọi webhook, đơn tự chuyển từ "Chờ thanh toán" sang "Chờ xác nhận". Đơn chuyển khoản chưa thanh toán sẽ tự hủy sau thời hạn cài trong mục Cài đặt (mặc định 15 phút).

1. Đăng ký tại https://my.sepay.vn và liên kết tài khoản ngân hàng nhận tiền của quán.
2. Vào *Webhooks → Thêm webhook*:
   - URL: `https://order.atlasplatform12.tech/api/payments/sepay/webhook`
   - Sự kiện: tiền vào
   - Kiểu chứng thực: **API Key**
3. Đặt `SEPAY_API_KEY=<key>` trong `prod.env`, chạy `base64 -w0 prod.env > prod.env.b64`, cập nhật credential `ordering-prod-env` trong Jenkins, rồi deploy lại.
4. Đăng nhập quản lý, vào *Cài đặt cửa hàng* và nhập mã ngân hàng (ví dụ `MB`, `VCB`), số tài khoản, tên chủ tài khoản. Chỉ khi đã nhập đủ, lựa chọn chuyển khoản mới hiện ra cho khách.

Nếu khách chuyển sai nội dung, nhân viên vẫn xác nhận tay được: mở đơn → "Xác nhận đã nhận CK". Mọi giao dịch SePay báo về, kể cả giao dịch không khớp đơn nào, đều xem được ở *Quản lý → Thanh toán*. Đơn đã chuyển khoản mà sau đó bị hủy sẽ vào hàng "Chờ hoàn tiền".

## Vận hành

```bash
cd /home/coder/ordering-deploy
docker compose -p restaurant-ordering-system ps
docker compose -p restaurant-ordering-system logs -f backend
```

- **Tài khoản quản lý đầu tiên:** đăng nhập bằng số điện thoại `APP_ADMIN_PHONE` (mặc định `0900000000`), mật khẩu là `APP_ADMIN_PASSWORD` trong `prod.env`. Đăng nhập xong nên tạo tài khoản riêng cho từng nhân viên trong mục *Nhân viên*.
- **Dữ liệu mẫu:** `APP_SEED_DEMO=true` nạp thực đơn 19 món kèm ảnh, 8 khu vực giao và 2 mã giảm giá (`WELCOME10`, `FREESHIP`) khi DB còn trống. Không tạo tài khoản demo có mật khẩu công khai, vì đã có tài khoản quản lý.
- **Đổi secret:** sửa `prod.env`, chạy `base64 -w0 prod.env > prod.env.b64`, cập nhật credential `ordering-prod-env`, rồi build lại `main` trong Jenkins. Riêng `POSTGRES_PASSWORD` chỉ có tác dụng khi volume DB được tạo lần đầu, nên muốn đổi thì phải đổi trong PostgreSQL trước.
- **Khôi phục DB:**
  ```bash
  cd /home/coder/ordering-deploy && set -a && . /home/coder/ordering-secrets/prod.env && set +a
  gunzip -c /home/coder/ordering-backups/<file>.sql.gz | docker compose -p restaurant-ordering-system exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
  ```
- **Quay lui code:** revert commit trên `main` rồi push, pipeline sẽ deploy lại bản cũ. Migration Flyway đã chạy không tự hoàn tác, nên phải khôi phục DB từ bản backup `pre-deploy`.
