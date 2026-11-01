# Atlas Restaurant – đặt món giao tận nhà

Ứng dụng đặt món giao tận nhà cho nhà hàng **Atlas Restaurant**. Khách thanh toán khi nhận hàng (COD) hoặc chuyển khoản VietQR, được SePay tự xác nhận. Bốn vai trò:

- **Khách hàng:** xem thực đơn có ảnh và đánh giá, chọn size và topping, giỏ hàng lưu trên máy chủ, sổ địa chỉ, mã giảm giá, đặt hàng, thanh toán COD hoặc quét QR, theo dõi đơn, thông báo, banner chương trình, hủy đơn, đặt lại, đánh giá món, món yêu thích.
- **Nhân viên:** bảng đơn theo trạng thái; xác nhận hoặc hủy đơn (có lý do), giao hàng, thu COD; tạm ngưng nhận đơn.
- **Bếp:** màn hình phiếu chế biến, báo hết món.
- **Quản lý:** tổng quan, báo cáo doanh thu, thực đơn kèm tùy chọn món, danh mục, khu vực giao và phí ship, mã giảm giá, chương trình quảng bá (gửi thông báo cho khách), thanh toán (hoàn tiền, đối soát giao dịch ngân hàng), nhân viên, khách hàng, đánh giá, cài đặt cửa hàng.

Bản production: **https://order.atlasplatform12.tech**

| Thư mục | Nội dung |
|---|---|
| `backend/` | REST API: Java 21, Spring Boot 3.4, JPA, Flyway, PostgreSQL (prod) / H2 (dev), JWT |
| `mobile/` | App Expo SDK 58 / React Native 0.88 / TypeScript / Expo Router: app khách và web cửa hàng trong một mã nguồn |
| `docs/` | Báo cáo BTL, slide, ERD, use-case, [DATABASE.md](docs/DATABASE.md) |
| `deploy/`, `scripts/`, `docker-compose.yml`, `Jenkinsfile` | Triển khai production, xem [DEPLOY.md](DEPLOY.md) |

## Chạy trên máy phát triển

```bash
# backend: H2 in-memory, tự nạp thực đơn mẫu và tài khoản demo
cd backend
mvn spring-boot:run                      # http://localhost:8080 (cổng bận: -Dspring-boot.run.arguments=--server.port=8099)

# app (web hoặc Expo Go)
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://localhost:8080 npx expo start --web
```

Tài khoản demo (chỉ có ở môi trường dev), mật khẩu đều là `Atlas@123`:

| Vai trò | Số điện thoại |
|---|---|
| Quản lý | `0900000001` |
| Nhân viên | `0900000002` |
| Bếp | `0900000003` |
| Khách hàng | `0900000004` |

Mã giảm giá mẫu: `WELCOME10` (giảm 10%, tối đa 30.000đ, đơn từ 100.000đ, mỗi khách dùng 1 lần) và `FREESHIP` (giảm 20.000đ cho đơn từ 200.000đ).

## Kiểm thử

```bash
cd backend
mvn verify     # 26 bộ test, gồm 1 bộ chạy profile prod trên PostgreSQL thật (embedded)
node perf/load-test.js <baseUrl> <sđt quản lý> <mật khẩu> 30    # đo tải; tạo dữ liệu thử nên KHÔNG chạy vào CSDL production
```

## API

| Nhóm | Đường dẫn | Quyền |
|---|---|---|
| Công khai | `GET /api/store`, `/api/zones`, `/api/categories`, `/api/menu?categoryId=&q=`, `/api/menu/popular`, `/api/menu/{id}`, `/api/vouchers`, `/api/promotions` | Mọi người |
| SePay | `POST /api/payments/sepay/webhook` (header `Authorization: Apikey <SEPAY_API_KEY>`) | SePay |
| Tài khoản | `POST /api/auth/register`, `POST /api/auth/login` (`login` là số điện thoại hoặc email), `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET /api/auth/me`, `PUT /api/auth/profile` (gồm `marketingOptIn`), `POST /api/auth/change-password` (trả token mới, đăng xuất các thiết bị khác) | Mọi người / đã đăng nhập |
| Khách hàng | `/api/me/addresses`, `/api/me/favorites`, `GET/DELETE /api/me/cart`, `POST /api/me/cart/items` (`menuItemId`, `quantity`, `note`, `optionIds`), `PATCH /api/me/cart/items/{lineId}`, `POST /api/me/checkout/preview`, `/api/me/orders` (`paymentMethod`: `COD` hoặc `BANK_TRANSFER`), `POST /api/me/orders/{id}/cancel`, `POST /api/me/orders/{id}/reorder`, `POST /api/me/reviews`, `/api/me/notifications` (`/unread-count`, `/{id}/read`, `/read-all`) | `CUSTOMER` |
| Cửa hàng | `GET /api/manage/orders?status=&q=&date=&sort=oldest`, `PATCH /api/manage/orders/{id}/status`, `PATCH /api/manage/orders/{id}/confirm-transfer`, `GET /api/manage/kitchen/queue`, `PATCH /api/manage/menu-items/{id}/availability`, `PATCH /api/manage/store/accepting` | `STAFF`, `KITCHEN`, `MANAGER` |
| Quản trị | `/api/admin/dashboard`, `/api/admin/reports/revenue`, `/api/admin/categories`, `/api/admin/menu-items`, `PUT /api/admin/menu-items/{id}/options`, `/api/admin/promotions` (+ `POST /{id}/announce`), `/api/admin/payments`, `PATCH /api/admin/payments/{id}/refunded`, `/api/admin/bank-transactions`, `/api/admin/zones`, `/api/admin/vouchers`, `/api/admin/staff`, `/api/admin/customers`, `/api/admin/users/{id}/active`, `POST /api/admin/users/{id}/reset-password`, `/api/admin/reviews`, `/api/admin/settings` | `MANAGER` |

Mã lỗi:
- Thiếu token: **401**.
- Sai vai trò: **403**.
- Dữ liệu của người khác: **404**.
- Dữ liệu đang được tham chiếu, trùng, hoặc vừa bị người khác sửa: **409**.

Body lỗi luôn có dạng `{"status": ..., "error": "thông báo tiếng Việt"}`.

## Giới hạn hiện tại

- Thanh toán online chỉ có chuyển khoản VietQR qua SePay, chưa có thẻ hay ví điện tử.
- Phí giao tính theo khu vực (quận), không theo khoảng cách. App không có vai trò tài xế, nhân viên quán tự giao.
- Trạng thái đơn được cập nhật bằng cách hỏi lại định kỳ (polling), chưa có thông báo đẩy.
