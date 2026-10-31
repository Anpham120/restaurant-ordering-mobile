# Cơ sở dữ liệu – Atlas Restaurant

CSDL PostgreSQL cho ứng dụng đặt món giao tận nhà của một nhà hàng, thanh toán COD. Schema nằm ở `backend/src/main/resources/db/migration/V1__init.sql` và do Flyway quản lý. Hibernate chạy ở chế độ `ddl-auto=validate`: nếu entity lệch với schema thì app không khởi động.

![ERD](erd.png)

**13 bảng, 16 khóa ngoại.** Bảng nào cũng có quan hệ với ít nhất một bảng khác, và cột khóa ngoại nào cũng có index (đã kiểm tra tự động trên PostgreSQL).

## Các bảng

| Bảng | Ý nghĩa | Khóa | Quan hệ |
|---|---|---|---|
| `users` | Mọi tài khoản: khách hàng, nhân viên, bếp, quản lý | `id`; unique `phone`, `email` | 1–N `addresses`, `cart_items`, `favorites`, `orders` (khách), `order_status_history` (người đổi trạng thái), `store_settings` (người sửa) |
| `delivery_zones` | Khu vực (quận) nhận giao, phí ship và thời gian giao dự kiến | `id`; unique `name` | 1–N `addresses`, `orders` |
| `addresses` | Sổ địa chỉ của khách, có một địa chỉ mặc định | `id` | N–1 `users` (xóa theo user), N–1 `delivery_zones` |
| `categories` | Danh mục món | `id`; unique `name` | 1–N `menu_items` |
| `menu_items` | Món ăn. `is_available` là còn hàng hôm nay, `is_active` là còn trong thực đơn | `id`; unique `name` | N–1 `categories`; 1–N `order_items`, `cart_items`, `favorites` |
| `favorites` | Món yêu thích của khách | `(user_id, menu_item_id)` | Bảng nối N–N giữa `users` và `menu_items` |
| `cart_items` | Giỏ hàng lưu trên server, giữ nguyên khi đổi thiết bị | `(user_id, menu_item_id)` | Bảng nối N–N giữa `users` và `menu_items` |
| `vouchers` | Mã giảm giá: theo % (có mức giảm tối đa) hoặc số tiền; đơn tối thiểu, thời hạn, giới hạn lượt dùng tổng và theo từng khách | `id`; unique `code` | 1–N `orders` |
| `orders` | Đơn giao hàng | `id` | N–1 `users`, `delivery_zones`, `vouchers`; 1–N `order_items`, `order_status_history` |
| `order_items` | Các dòng món trong đơn | `id` | N–1 `orders`, `menu_items`; 1–1 `reviews` |
| `order_status_history` | Nhật ký đổi trạng thái: ai đổi, lúc nào, lý do. Màn hình theo dõi đơn hiển thị từ bảng này | `id` | N–1 `orders`, N–1 `users` |
| `reviews` | Đánh giá 1–5 sao cho từng món trong đơn đã giao | `id`; unique `order_item_id` | 1–1 `order_items` |
| `store_settings` | Cài đặt cửa hàng, chỉ có đúng một dòng (`id = 1`): giờ mở cửa, hotline, đơn tối thiểu, bật/tắt nhận đơn | `id` | N–1 `users` (người sửa gần nhất) |

## Vì sao đạt 3NF

- **1NF:** mọi cột đều là giá trị nguyên tố. Không có danh sách hay JSON trong một ô. Mỗi món trong đơn là một dòng `order_items`, mỗi lần đổi trạng thái là một dòng `order_status_history`.
- **2NF:** hai bảng có khóa ghép là `favorites` và `cart_items`. Các cột không khóa của chúng (`quantity`, `note`, `created_at`, `updated_at`) phụ thuộc vào cả cặp `(user, món)`, không chỉ một nửa. Các bảng còn lại dùng khóa đơn.
- **3NF:** không cột không khóa nào phụ thuộc bắc cầu qua một cột không khóa khác.
  - **Không lưu giá trị suy ra được.**
    - Tạm tính và tổng tiền của đơn tính từ `order_items`, `delivery_fee` và `discount_amount`.
    - Mã đơn hiển thị (`#DH1031-0007`) ghép từ ngày tạo và `id`.
    - Trạng thái thanh toán COD suy từ trạng thái `DELIVERED`.
    - Tên món, ảnh và tên danh mục trong đơn đọc qua khóa ngoại.
    - Điểm đánh giá trung bình của món tính bằng truy vấn.
  - **Không lặp khóa.** `reviews` chỉ trỏ tới `order_items`. Đơn, khách và món lấy qua dòng đơn, không lưu thêm `order_id` hay `menu_item_id`, vì làm vậy sẽ tạo phụ thuộc bắc cầu.
- **Các cột "chụp lại" lúc đặt hàng là dữ kiện của chính đơn đó,** không phải bản sao dư thừa:
  - `orders.recipient_name`, `recipient_phone`, `delivery_street`, `delivery_note` là địa chỉ thực tế đơn được giao tới. `orders` không có khóa ngoại tới `addresses`, nên khách sửa hay xóa sổ địa chỉ thì lịch sử đơn vẫn đúng.
  - `orders.delivery_fee` và `orders.discount_amount` là số tiền thực thu. Phí khu vực hay mã giảm giá có đổi sau này thì đơn cũ không bị đổi theo.
  - `order_items.unit_price` là giá bán tại thời điểm đặt.
- `orders.status` là trạng thái hiện tại của đơn. `order_status_history` là một thực thể khác: các sự kiện thay đổi trạng thái, mỗi sự kiện có người thực hiện, thời điểm và lý do riêng.

## Ràng buộc nghiệp vụ ở mức CSDL

Mọi ràng buộc dưới đây cũng được kiểm tra ở API. CSDL giữ vai trò lớp bảo vệ cuối.

| Ràng buộc | Cài đặt |
|---|---|
| Giá trị liệt kê hợp lệ (vai trò, trạng thái đơn, loại giảm giá, phương thức thanh toán) | `CHECK ... IN (...)` |
| Số điện thoại 9–15 chữ số | `CHECK (phone ~ '^[0-9]{9,15}$')` |
| Giá, phí, giảm giá không âm; số lượng 1–99; điểm 1–5 | `CHECK` |
| Voucher %: không quá 100; ngày kết thúc sau ngày bắt đầu; giới hạn lượt dùng dương | `CHECK` |
| Mỗi khách có tối đa một địa chỉ mặc định | unique index một phần `ux_addresses_one_default ... where is_default` |
| Mỗi dòng đơn đánh giá tối đa một lần | `uk_reviews_order_item` |
| Giờ đóng cửa sau giờ mở cửa; bảng cài đặt chỉ có một dòng | `CHECK` |
| Hai nhân viên sửa cùng một đơn cùng lúc | khóa lạc quan qua cột `orders.version` |

## Xóa dữ liệu

| Dữ liệu | Khi xóa |
|---|---|
| Tài khoản khách | Xóa theo (`ON DELETE CASCADE`) sổ địa chỉ, giỏ hàng, món yêu thích. Đơn hàng cũ không bị xóa: khóa ngoại `RESTRICT` chặn lại, nên ứng dụng khóa tài khoản (`is_active = false`) thay vì xóa |
| Món đã từng được đặt, voucher đã dùng, khu vực đã có đơn | Không xóa được; ứng dụng chuyển sang "ngừng bán" hoặc "ngừng áp dụng" (`is_active = false`) |
| Món bị xóa hẳn (chưa từng được đặt) | Tự gỡ khỏi giỏ hàng và danh sách yêu thích |

Nhờ vậy không bao giờ có dòng mồ côi, tức dòng trỏ tới bản ghi không còn tồn tại.
