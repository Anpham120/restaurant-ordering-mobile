# Triển khai production

Ứng dụng đặt món Atlas Restaurant chạy trên máy chủ 163.61.182.201 tại **https://order.atlasplatform12.tech**. CI/CD chạy bằng **GitHub Actions** (`.github/workflows/ci-cd.yml`):
- Mọi nhánh: chạy test.
- Commit lên `develop`: chạy **staging tạm** trên máy ảo của GitHub (dựng, test, xóa), rồi đưa lên `main` và deploy **production** lên máy chủ qua SSH.

## Kiến trúc

```
Internet ──HTTPS──> nginx (host, certbot)
                     ├─ /api/  ──> 127.0.0.1:8084  backend  (Spring Boot, profile prod)
                     └─ /      ──> 127.0.0.1:8085  web      (nginx, bundle Expo web)
                                                  db       (PostgreSQL 16, không mở cổng, volume pgdata)

GitHub Actions ──SSH (khóa chỉ chạy được deploy/ci-ssh-gate.sh)──> máy chủ ──> scripts/deploy.sh
```

- Compose project: `restaurant-ordering-system` (`docker-compose.yml`). Image: `ordering-backend`, `ordering-web`.
- Schema do Flyway quản lý (`backend/src/main/resources/db/migration`). Hibernate chạy `ddl-auto=validate`, nên entity lệch với schema thì app không khởi động.
- Web và API chung một domain, nên không có request cross-origin. CORS chỉ cho phép `https://order.atlasplatform12.tech`.

| Đường dẫn trên host | Nội dung |
|---|---|
| `/home/coder/ordering-deploy` | Bản checkout `main` (production) dùng để build và chạy. `.env` chỉ tồn tại trong lúc deploy |
| `/home/coder/ordering-backups` | Bản dump DB: trước mỗi lần deploy và hằng đêm, giữ 30 bản mới nhất |
| `/home/coder/ordering-secrets/prod.env` | `.env` production gốc (quyền 600). Không bao giờ rời máy chủ, không lưu trên GitHub |
| `/home/coder/ordering-secrets/ci-ssh-gate.sh` | Bản cài của `deploy/ci-ssh-gate.sh`: lệnh duy nhất mà khóa SSH của GitHub Actions được chạy |
| `~/.ssh/authorized_keys` | Dòng khóa `github-actions-ordering`, gắn `command="…/ci-ssh-gate.sh",restrict` |

## Quy trình nhánh

```
feature/xxx ──PR──> develop ──(tự động)──> main
 (làm việc)        (CI + staging tạm)       (production)
```

1. Tách nhánh tính năng từ `develop`: `git checkout develop && git pull && git checkout -b feature/ten-tinh-nang`.
2. Đẩy nhánh lên GitHub: GitHub Actions chạy **CI** (test + kiểm tra mobile). Chưa deploy gì.
3. Mở PR vào `develop`, CI xanh thì merge. `develop` được bảo vệ: không push thẳng được, chỉ merge qua PR, và hai check `backend`, `mobile` phải đạt (PR chỉ đổi tài liệu thì hai job này được bỏ qua và vẫn tính là đạt). GitHub Actions dựng **staging tạm** trên máy ảo của GitHub, chạy bộ smoke test rồi bỏ máy ảo.
4. Staging test đạt thì workflow **tự đẩy commit đó lên `main`** (chỉ fast-forward, bằng `GITHUB_TOKEN`), rồi **deploy production** ngay trong cùng lần chạy. Lần đẩy bằng `GITHUB_TOKEN` không tạo lần chạy mới, nên không bị deploy hai lần. Nếu `main` có commit mà `develop` không có, workflow dừng lại và báo lỗi: merge `main` vào `develop` trước.
5. Không mở PR `develop` → `main` và không commit thẳng vào `main`: merge bằng PR tạo merge commit trên `main` mà `develop` không có, các lần promote sau sẽ thất bại. Nếu có đẩy thẳng, workflow vẫn chạy CI rồi deploy. Muốn bật *Branch protection* cho `main` thì phải cho GitHub Actions đẩy thẳng (bypass), nếu không bước tự đẩy sẽ bị từ chối.

Xem các lần chạy ở tab **Actions** của repo. Lịch sử deploy nằm ở môi trường **production** (mục *Deployments*).

## Pipeline (`.github/workflows/ci-cd.yml`)

| Job | Khi nào | Làm gì |
|---|---|---|
| `plan` | mọi lần push / PR | Nếu chỉ đổi `docs/**` hoặc `*.md` thì bỏ qua test, staging và deploy (nhánh `develop` vẫn đẩy lên `main`) |
| `backend` | mọi lần push / PR | `mvn verify`: các bộ test, gồm test profile prod trên PostgreSQL thật (embedded) |
| `mobile` | mọi lần push / PR | `npm ci`, `tsc`, `expo lint`, `expo export --platform web` |
| `staging` | push lên `develop` | `scripts/staging-test.sh` trên máy ảo GitHub: dựng stack bằng `docker-compose.yml` và Dockerfile của production, chạy 15 kiểm tra (health, web, thực đơn, báo giá giao hàng, đăng ký và đăng nhập, sai mật khẩu, phân quyền 401/403…), rồi xóa. Không cần secret |
| `promote` | push lên `develop`, các job trên đạt | Đẩy commit lên `main` (fast-forward) |
| `deploy` | sau `promote`, hoặc push thẳng lên `main` | SSH vào máy chủ chạy `deploy <sha>`. Trên máy chủ, `ci-ssh-gate.sh` kiểm tra commit có trên `main`, checkout, chép `prod.env` vào `.env` rồi chạy `scripts/deploy.sh`: backup DB → build image → chờ healthy → kiểm tra. Lỗi ở bất kỳ bước nào thì tự quay về image trước |
| `apk` | sau `deploy`, khi thư mục `mobile/` có thay đổi | Gửi yêu cầu build Android APK lên EAS (không chờ, 10–30 phút). Lỗi bước này chỉ cảnh báo, không làm hỏng deploy |
| `backup` | 3 giờ sáng (cron `0 20 * * *` UTC) | SSH chạy `backup` → `scripts/backup-db.sh nightly` |
| `notify` | cuối mỗi lần chạy (không chạy cho PR) | Gửi Telegram: thất bại, đã deploy, chỉ đổi tài liệu, link APK |

### Secret của repo (*Settings → Secrets and variables → Actions*)

| Secret | Dùng cho | Bắt buộc |
|---|---|---|
| `DEPLOY_SSH_KEY` | Khóa riêng ed25519 của khóa `github-actions-ordering` | có (deploy, backup) |
| `DEPLOY_KNOWN_HOSTS` | Kết quả `ssh-keyscan 163.61.182.201`, để chống giả mạo máy chủ | có (deploy, backup) |
| `EXPO_TOKEN` | Build APK trên EAS | không: thiếu thì bỏ qua build APK |
| `TELEGRAM_BOT_TOKEN` | Thông báo Telegram (chung bot với dự án `rsm`) | không: thiếu thì chỉ ghi log |

`prod.env` không nằm trong secret của GitHub. Khóa SSH chỉ chạy được hai lệnh `deploy <sha>` và `backup`; `restrict` tắt shell, chuyển tiếp cổng và PTY.

### Staging tạm và production khác nhau thế nào

Hai môi trường dùng chung `docker-compose.yml` và Dockerfile, nên image staging được build giống hệt production. Mọi thứ còn lại tách riêng:

| | Production (`main`) | Staging tạm (`develop`) |
|---|---|---|
| Chạy ở đâu | máy chủ 163.61.182.201 | máy ảo `ubuntu-latest` của GitHub, không tốn tài nguyên máy chủ |
| Sống bao lâu | chạy liên tục | chỉ trong lúc test, xong là xóa |
| Compose project / volume DB | `restaurant-ordering-system` | `ordering-staging`, DB trống mới mỗi lần |
| Cổng (chỉ `127.0.0.1`) | backend 8084, web 8085 | backend 8184, web 8185 |
| Secret (`.env`) | `/home/coder/ordering-secrets/prod.env` | sinh ngẫu nhiên mỗi lần, không lưu ở đâu |
| Dữ liệu | thật, backup trước mỗi lần deploy | thực đơn mẫu (`APP_SEED_DEMO=true`); quản lý là tài khoản `APP_ADMIN_*` sinh ngẫu nhiên |
| SePay, SMTP | thật | không có |

Muốn tự thử bằng tay: trên máy chủ chạy `scripts/staging-test.sh keep` (dựng và để chạy), thử ở `http://127.0.0.1:8185`, xong chạy `scripts/staging-test.sh down`.

## Cài đặt lần đầu

### 1. DNS
Tạo bản ghi A `order.atlasplatform12.tech` → `163.61.182.201`. Kiểm tra bằng `getent hosts order.atlasplatform12.tech`.

### 2. GitHub Actions
1. **Cổng vào máy chủ.** Cài script và tạo khóa SSH riêng cho GitHub Actions (trên máy chủ, user `coder`):
   ```bash
   install -m 700 deploy/ci-ssh-gate.sh /home/coder/ordering-secrets/ci-ssh-gate.sh
   ssh-keygen -t ed25519 -N '' -C github-actions-ordering -f /tmp/gha-deploy
   install -d -m 700 ~/.ssh
   echo "command=\"/home/coder/ordering-secrets/ci-ssh-gate.sh\",restrict $(cat /tmp/gha-deploy.pub)" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```
   Sửa `deploy/ci-ssh-gate.sh` thì phải cài lại bằng lệnh `install` ở trên: máy chủ không tự lấy bản mới.
2. **Secret.** Đưa khóa riêng và known_hosts lên GitHub, rồi xóa khóa riêng khỏi máy chủ:
   ```bash
   gh secret set DEPLOY_SSH_KEY < /tmp/gha-deploy && rm -f /tmp/gha-deploy /tmp/gha-deploy.pub
   ssh-keyscan -t ed25519 163.61.182.201 | gh secret set DEPLOY_KNOWN_HOSTS
   gh secret set EXPO_TOKEN < /home/coder/ordering-secrets/expo-token.txt
   gh secret set TELEGRAM_BOT_TOKEN        # dán token bot Telegram khi được hỏi
   ```
3. Cho bước build APK: tạo token trên expo.dev (*Account settings → Access tokens*), lưu vào `/home/coder/ordering-secrets/expo-token.txt`.
   Làm một lần trước đó, trên máy có đăng nhập Expo: `cd mobile && npx eas-cli@latest init` (tạo project, ghi `projectId` vào `app.json`, nhớ commit) và `npx eas-cli@latest build -p android --profile preview` (lần đầu, để EAS tạo keystore; chế độ `--non-interactive` không tạo được keystore).
4. Push lên `develop`, xem tab **Actions**.

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
3. Đặt `SEPAY_API_KEY=<key>` trong `/home/coder/ordering-secrets/prod.env`, rồi deploy lại (*Actions → CI/CD → Re-run* lần chạy gần nhất của `main`, hoặc push một commit).
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
4. Deploy lại (*Actions → CI/CD → Re-run* lần chạy gần nhất của `main`, hoặc push một commit).

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
- **Đổi secret:** sửa `/home/coder/ordering-secrets/prod.env`, rồi deploy lại (*Actions → CI/CD → Re-run*). Riêng `POSTGRES_PASSWORD` chỉ có tác dụng khi volume DB được tạo lần đầu, nên muốn đổi thì phải đổi trong PostgreSQL trước.
- **Khôi phục DB:**
  ```bash
  cd /home/coder/ordering-deploy && set -a && . /home/coder/ordering-secrets/prod.env && set +a
  gunzip -c /home/coder/ordering-backups/<file>.sql.gz | docker compose -p restaurant-ordering-system exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
  ```
- **Quay lui code:** revert commit trên `main` rồi push, pipeline sẽ deploy lại bản cũ. Migration Flyway đã chạy không tự hoàn tác, nên phải khôi phục DB từ bản backup `pre-deploy`.
