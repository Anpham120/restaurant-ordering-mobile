# Triển khai production

Ứng dụng đặt món Atlas Restaurant chạy trên chính máy chủ này (163.61.182.201) tại **https://order.atlasplatform12.tech**. Jenkins tự test mọi nhánh, chạy **staging tạm** (dựng, test, xóa) khi có commit lên `develop` và deploy **production** khi có commit lên `main`.

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
| `/home/coder/ordering-deploy` | Bản checkout `main` (production) mà Jenkins dùng để build và chạy. `.env` chỉ tồn tại trong lúc deploy |
| `/home/coder/ordering-staging` | Bản checkout `develop` cho staging tạm. Không có `.env` lâu dài: script tự sinh rồi xóa |
| `/home/coder/ordering-backups` | Bản dump DB: trước mỗi lần deploy và hằng đêm, giữ 30 bản mới nhất |
| `/home/coder/ordering-secrets/prod.env` | `.env` production gốc (quyền 600). `prod.env.b64` là bản base64 để dán vào Jenkins (credential `ordering-prod-env`) |

## Quy trình nhánh

```
feature/xxx ──PR──> develop ──(tự động)──> main
 (làm việc)        (CI + staging tạm)       (CI + production)
```

1. Tách nhánh tính năng từ `develop`: `git checkout develop && git pull && git checkout -b feature/ten-tinh-nang`.
2. Đẩy nhánh lên GitHub: Jenkins chạy **CI** (test + kiểm tra mobile). Chưa deploy gì.
3. Mở PR vào `develop`, CI xanh thì merge. Jenkins dựng **staging tạm**, chạy bộ smoke test rồi xóa sạch (giải phóng tài nguyên).
4. Staging test đạt thì Jenkins **tự đẩy commit đó lên `main`** (chỉ fast-forward), build `main` tự **deploy production**. Không cần PR hay merge tay. Nếu `main` có commit mà `develop` không có, Jenkins dừng lại và báo lỗi: merge `main` vào `develop` trước.
5. Không commit thẳng vào `main`. Muốn bật *Branch protection* cho `main` thì phải cho phép tài khoản của credential `github-branch-source` đẩy thẳng (bypass), nếu không bước tự đẩy sẽ bị GitHub từ chối. Credential này cần token có quyền ghi repo (`contents: write`).

## Pipeline (`Jenkinsfile`, job multibranch `ordering`)

| Khi nào | Các bước |
|---|---|
| Mọi nhánh / PR | **CI**: `mvn verify` (26 bộ test, gồm test profile prod trên PostgreSQL thật), sau đó `tsc`, `expo lint`, `expo export --platform web` |
| `develop` | CI + **Staging test** + **Promote to main** (đạt hết thì tự đẩy lên `main`) (`scripts/staging-test.sh`): dựng stack riêng bằng `docker-compose.yml` và Dockerfile của production, chạy 15 kiểm tra (health, web, thực đơn, báo giá giao hàng, đăng ký và đăng nhập, sai mật khẩu, phân quyền 401/403…), rồi xóa container, volume, image, `.env` và cache build không dùng quá 3 ngày. Không cần credential |
| `main` | CI + **Deploy production** (`scripts/deploy.sh`, credential `ordering-prod-env`): backup DB → build image → chờ healthy → kiểm tra. Lỗi ở bất kỳ bước nào thì tự quay về image trước |
| `main`, khi thư mục `mobile/` có thay đổi | Sau khi deploy xong: **Build Android APK**, gửi yêu cầu build lên EAS (không chờ, 10–30 phút), Telegram báo link theo dõi. Lỗi bước này chỉ cảnh báo, không làm hỏng deploy |
| 3 giờ sáng (nhánh `main`) | Chỉ backup DB (`scripts/backup-db.sh nightly`) |

### Staging tạm và production khác nhau thế nào

Hai môi trường dùng chung máy chủ, `docker-compose.yml`, Dockerfile và Docker, nên image staging giống hệt production. Mọi thứ còn lại tách riêng:

| | Production (`main`) | Staging tạm (`develop`) |
|---|---|---|
| Sống bao lâu | chạy liên tục | chỉ trong lúc test, xong là xóa |
| Compose project / volume DB | `restaurant-ordering-system` | `ordering-staging`, DB trống mới mỗi lần |
| Cổng (chỉ `127.0.0.1`) | backend 8084, web 8085 | backend 8184, web 8185 |
| Secret (`.env`) | credential `ordering-prod-env` | sinh ngẫu nhiên mỗi lần, không lưu ở đâu |
| Dữ liệu | thật, backup trước mỗi lần deploy | thực đơn mẫu (`APP_SEED_DEMO=true`); quản lý là tài khoản `APP_ADMIN_*` sinh ngẫu nhiên |
| SePay, SMTP | thật | không có |

Muốn tự thử bằng tay: trên máy chủ chạy `scripts/staging-test.sh keep` (dựng và để chạy), thử ở `http://127.0.0.1:8185`, xong chạy `scripts/staging-test.sh down`.

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
   - Branch Source GitHub: `https://github.com/Anpham120/restaurant-ordering-mobile`. Repo public nên không cần credential, nhưng chọn `github-branch-source` để tránh giới hạn số lần gọi API.
   - Build Configuration: *by Jenkinsfile*, Script Path `Jenkinsfile`.
   - Scan triggers: *Periodically if not otherwise run*, interval **1 minute**, giống job `rsm`.
3. Lưu job. Jenkins quét nhánh, chạy build `main` (deploy production) và `develop` (staging test).
4. Cho bước build APK: tạo token trên expo.dev (*Account settings → Access tokens*) rồi thêm credential Secret text, ID `expo-token`.
   Làm một lần trước đó, trên máy có đăng nhập Expo: `cd mobile && npx eas-cli@latest init` (tạo project, ghi `projectId` vào `app.json`, nhớ commit) và `npx eas-cli@latest build -p android --profile preview` (lần đầu, để EAS tạo keystore; chế độ `--non-interactive` không tạo được keystore).

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

## Email (quên mật khẩu)

Mã OTP đặt lại mật khẩu được gửi qua SMTP (cổng 587, STARTTLS). Dùng được mọi nhà cung cấp SMTP; khuyến nghị **Brevo** (miễn phí 300 email/ngày). Gmail cũng được nhưng cần App Password và tài khoản đủ điều kiện.

**Brevo:**
1. Đăng ký tại https://app.brevo.com. Vào *Senders, Domains & dedicated IPs → Senders → Add a sender*, thêm một địa chỉ gửi và bấm xác nhận trong email Brevo gửi tới. Địa chỉ chưa xác minh thì Brevo từ chối gửi.
2. Vào biểu tượng bánh răng → *SMTP & API → SMTP*: ghi lại **SMTP login** (dạng `xxxx@smtp-brevo.com`, khác địa chỉ đăng ký) và bấm *Generate a new SMTP key* để lấy key (chỉ hiện một lần).
3. Thêm vào `/home/coder/ordering-secrets/prod.env`:
   ```
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USERNAME=<SMTP login>
   SMTP_PASSWORD=<SMTP key>
   MAIL_FROM=<địa chỉ gửi đã xác minh ở bước 1>
   ```
4. Chạy `base64 -w0 prod.env > prod.env.b64`, cập nhật credential `ordering-prod-env` trong Jenkins, rồi deploy lại.

**Gmail:** `SMTP_HOST=smtp.gmail.com`, `SMTP_USERNAME` là địa chỉ Gmail, `SMTP_PASSWORD` là App Password (https://myaccount.google.com/apppasswords, cần bật xác minh 2 bước), `MAIL_FROM` có thể bỏ trống.

Chưa cấu hình thì mã chỉ được ghi vào log backend. Khi đó khách không có email (hoặc chưa cấu hình SMTP) gọi hotline, quản lý vào *Khách hàng → Đặt lại mật khẩu* để cấp mật khẩu tạm. Khách phải đổi mật khẩu này ở lần đăng nhập sau.

## Vận hành

```bash
cd /home/coder/ordering-deploy
docker compose -p restaurant-ordering-system ps
docker compose -p restaurant-ordering-system logs -f backend
```

- **Tài khoản quản lý đầu tiên:** đăng nhập bằng số điện thoại `APP_ADMIN_PHONE` (mặc định `0900000000`), mật khẩu là `APP_ADMIN_PASSWORD` trong `prod.env`. Đăng nhập xong nên tạo tài khoản riêng cho từng nhân viên trong mục *Nhân viên*.
- **Dữ liệu mẫu:** `APP_SEED_DEMO=true` nạp thực đơn 19 món kèm ảnh, và 2 mã giảm giá (`WELCOME10`, `FREESHIP`) khi DB còn trống. Không tạo tài khoản demo có mật khẩu công khai, vì đã có tài khoản quản lý.
- **Đổi secret:** sửa `prod.env`, chạy `base64 -w0 prod.env > prod.env.b64`, cập nhật credential `ordering-prod-env`, rồi build lại `main` trong Jenkins. Riêng `POSTGRES_PASSWORD` chỉ có tác dụng khi volume DB được tạo lần đầu, nên muốn đổi thì phải đổi trong PostgreSQL trước.
- **Khôi phục DB:**
  ```bash
  cd /home/coder/ordering-deploy && set -a && . /home/coder/ordering-secrets/prod.env && set +a
  gunzip -c /home/coder/ordering-backups/<file>.sql.gz | docker compose -p restaurant-ordering-system exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
  ```
- **Quay lui code:** revert commit trên `main` rồi push, pipeline sẽ deploy lại bản cũ. Migration Flyway đã chạy không tự hoàn tác, nên phải khôi phục DB từ bản backup `pre-deploy`.
