# Restaurant Ordering System

Hệ thống gọi món nhà hàng: khách quét QR tại bàn để xem thực đơn, đặt món, theo dõi món, gọi nhân viên và thanh toán. Nhân viên, bếp và quản lý dùng chung một app với giao diện theo vai trò.

| Thư mục | Nội dung |
|---|---|
| `backend/` | REST API: Java 21, Spring Boot 3.4.3, Spring Data JPA, H2, JWT |
| `mobile/` | App Expo SDK 58 / React Native 0.88 / TypeScript / Expo Router (Android, iOS, web) |
| `docs/` | Báo cáo BTL (`.docx`) và slide thuyết trình (`.pptx`) |
| `deploy/`, `scripts/`, `docker-compose.yml`, `Jenkinsfile` | Triển khai production (Docker, nginx, Jenkins CI/CD), xem [DEPLOY.md](DEPLOY.md) |

Bản production: **https://order.atlasplatform12.tech**

## Chạy backend

```bash
cd backend
mvn spring-boot:run                       # http://localhost:8080
# cổng 8080 bận thì:
mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8099
```

- Môi trường dev dùng H2 in-memory, dữ liệu mất khi tắt server. Production dùng PostgreSQL (`SPRING_PROFILES_ACTIVE=prod`, xem [DEPLOY.md](DEPLOY.md)). Xem dữ liệu tại `/h2-console` (JDBC URL `jdbc:h2:mem:restaurant_db`, user `sa`).
- Dữ liệu mẫu được tạo khi khởi động: 7 món, 5 bàn `T1`–`T5`, voucher `WELCOME10` (giảm 10%, đơn từ 50.000đ).
- Tài khoản mẫu: `manager/manager123`, `staff/staff123`, `kitchen/kitchen123`.
- Lấy mã QR của bàn: đăng nhập `manager`, gọi `GET /api/admin/tables` (trường `qrToken`).

## Chạy app mobile

```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://<IP-máy-chạy-backend>:8080 npx expo start
```

Mở bằng Expo Go trên điện thoại cùng mạng LAN, hoặc nhấn `w` để chạy trên web. Nếu không đặt `EXPO_PUBLIC_API_URL`, app tự dùng IP của máy chạy Expo với cổng 8080.

## Kiểm thử

```bash
cd backend
mvn verify                                 # 15 test: 14 test tích hợp H2 + 1 test profile prod trên PostgreSQL (Flyway)
node perf/load-test.js http://localhost:8080 30   # đo tải, cần backend đang chạy với dữ liệu mẫu
```

## API chính

| Vai trò | Endpoint |
|---|---|
| Công khai (khách) | `GET /api/menu?category=&q=`, `GET /api/categories`, `GET /api/tables/qr/{token}`, `POST /api/orders`, `GET /api/orders/{id}`, `POST /api/orders/{id}/items`, `POST /api/orders/{id}/voucher`, `POST /api/orders/{id}/payments`, `POST /api/service-requests`, `POST /api/reviews`, `GET /api/menu-items/{id}/reviews` |
| Đăng nhập | `POST /api/auth/login` → `{ token, user }`; gửi `Authorization: Bearer <token>` |
| Bếp, nhân viên, quản lý | `GET /api/orders?status=`, `PATCH /api/order-items/{id}/status`, `PATCH /api/menu-items/{id}/availability?available=` |
| Nhân viên, quản lý | `PATCH /api/orders/{id}/status`, `PATCH /api/payments/{id}/confirm`, `PATCH /api/payments/{id}/fail`, `GET /api/service-requests`, `PATCH /api/service-requests/{id}/done` |
| Quản lý | `/api/admin/categories`, `/api/admin/menu-items`, `/api/admin/tables`, `/api/admin/vouchers`, `/api/admin/users`, `GET /api/admin/reports/revenue?from=&to=` |

Gọi không có token trả 401, sai vai trò trả 403.

## Giới hạn hiện tại

- Thanh toán chuyển khoản và ví điện tử được ghi nhận ngay, chưa tích hợp cổng thanh toán thật.
- App cập nhật trạng thái bằng polling 5 giây, chưa dùng WebSocket.
- Mã bàn nhập tay hoặc truyền qua link `?table=<token>`, chưa quét bằng camera.
- Mã đơn là số tăng dần, nên ai biết mã đơn có thể xem đơn đó.
