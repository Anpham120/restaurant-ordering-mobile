/**
 * Tạo 2 phiếu khảo sát trực tuyến (Google Forms) cho đề tài "Ứng dụng đặt món online cho nhà hàng":
 *   1. Khảo sát nghiệp vụ: chủ nhà hàng trả lời về quy trình hiện tại, quy tắc nghiệp vụ, yêu cầu đối với hệ thống
 *   2. Khảo sát trải nghiệm người dùng (sau khi dùng thử ứng dụng)
 *
 * Cách dùng:
 *   1. Mở https://script.google.com → Dự án mới → xoá code mẫu, dán toàn bộ file này.
 *   2. Chọn hàm `taoTatCa` (hoặc `taoKhaoSatNghiepVu`, `taoKhaoSatNguoiDung`) → Chạy → cấp quyền (Google Forms, Google Sheets).
 *   3. Xem Nhật ký thực thi: link gửi người khảo sát, link chỉnh sửa, link bảng câu trả lời.
 *   4. Khảo sát nghiệp vụ: chạy `dienPhieuChuNhaHang` để điền và gửi câu trả lời của chủ nhà hàng Atlas Restaurant.
 * Mỗi lần chạy hàm tạo form sẽ tạo form mới; chạy lại chỉ khi muốn tạo lại từ đầu.
 */

const NHOM = 'Nhóm thực hiện đề tài Atlas Restaurant';
const WEB_APP = 'https://order.atlasplatform12.tech';

const HAI_LONG = ['Rất không hài lòng', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Rất hài lòng', 'Chưa sử dụng'];
const CAN_THIET = ['Không cần thiết', 'Ít cần thiết', 'Cần thiết', 'Rất cần thiết'];
const DONG_Y = ['1 - Rất không đồng ý', '2 - Không đồng ý', '3 - Trung lập', '4 - Đồng ý', '5 - Rất đồng ý'];

function taoTatCa() {
  [khaoSatNghiepVu_(), khaoSatNguoiDung_()].forEach(taoForm_);
}
function taoKhaoSatNghiepVu() { taoForm_(khaoSatNghiepVu_()); }
function taoKhaoSatNguoiDung() { taoForm_(khaoSatNguoiDung_()); }

// ---------------------------------------------------------------------------------------------
// 1. KHẢO SÁT NGHIỆP VỤ (khảo sát trực tuyến chủ nhà hàng)
//    Trường `a` của mỗi câu là câu trả lời của chủ nhà hàng Atlas Restaurant, dùng cho dienPhieuChuNhaHang().
// ---------------------------------------------------------------------------------------------
const UU_TIEN = ['Bắt buộc', 'Nên có', 'Bổ sung sau', 'Không cần'];
const ANH_HUONG = ['Không gặp', 'Thấp', 'Trung bình', 'Cao'];
const QUAN_TRONG = ['Thấp', 'Trung bình', 'Cao', 'Rất cao'];

function khaoSatNghiepVu_() {
  const khoKhan = [
    ['Đơn đến từ nhiều kênh, sót đơn hoặc trả lời chậm giờ cao điểm', 'Cao'],
    ['Ghi nhầm món, nhầm tùy chọn, bỏ sót ghi chú của khách', 'Cao'],
    ['Đối soát tiền khách chuyển khoản mất thời gian', 'Cao'],
    ['Shipper báo đã giao nhưng khách nói chưa nhận', 'Cao'],
    ['Khách gọi điện hỏi đơn đang ở bước nào', 'Trung bình'],
    ['Bếp không biết đơn đã bị hủy, làm sai thứ tự đơn', 'Trung bình'],
    ['Hết món nhưng khách đã đặt, phải gọi lại báo khách', 'Trung bình'],
    ['Khó thống kê doanh thu, món bán chạy; khó chạy khuyến mãi riêng', 'Trung bình'],
  ];
  const chucNang = [
    ['FR-01. Đăng ký, đăng nhập bằng số điện thoại; quên mật khẩu qua mã OTP', 'Bắt buộc'],
    ['FR-02. Xem thực đơn theo nhóm, tìm món, xem ảnh, giá, tình trạng còn/hết', 'Bắt buộc'],
    ['FR-03. Chọn tùy chọn món (cỡ phần, topping, mức đường, đá), ghi chú', 'Bắt buộc'],
    ['FR-04. Giỏ hàng, áp mã giảm giá, tính phí giao theo khoảng cách', 'Bắt buộc'],
    ['FR-05. Sổ địa chỉ giao hàng có vị trí trên bản đồ', 'Nên có'],
    ['FR-06. Thanh toán COD hoặc VietQR, tự xác nhận khi tiền về', 'Bắt buộc'],
    ['FR-07. Theo dõi trạng thái đơn, nhận thông báo khi đơn thay đổi', 'Bắt buộc'],
    ['FR-08. Đánh giá món, gửi góp ý, gọi và nhắn tin cho nhà hàng', 'Nên có'],
    ['FR-09. Quầy: bảng đơn theo trạng thái, xác nhận, hủy đơn, đơn chờ chuyển khoản', 'Bắt buộc'],
    ['FR-10. Bếp: phiếu chế biến, chuyển trạng thái, báo hết món', 'Bắt buộc'],
    ['FR-11. Shipper: nhận đơn, chụp ảnh xác nhận, báo giao không thành công', 'Bắt buộc'],
    ['FR-12. Quản lý thực đơn, nhóm món, tùy chọn món', 'Bắt buộc'],
    ['FR-13. Quản lý tài khoản nhân viên, phân quyền theo bộ phận', 'Bắt buộc'],
    ['FR-14. Cài đặt cửa hàng: giờ mở cửa, đơn tối thiểu, phí giao, tài khoản nhận tiền', 'Bắt buộc'],
    ['FR-15. Đối soát giao dịch ngân hàng, hoàn tiền', 'Bắt buộc'],
    ['FR-16. Báo cáo doanh thu, món bán chạy, đơn theo trạng thái', 'Bắt buộc'],
    ['FR-17. Mã giảm giá, chương trình quảng bá, banner trên trang chủ', 'Nên có'],
    ['FR-18. Theo dõi vị trí shipper trên bản đồ theo thời gian thực', 'Bổ sung sau'],
    ['FR-19. Tích điểm khách hàng thân thiết', 'Bổ sung sau'],
    ['FR-20. Thanh toán ví điện tử (MoMo, ZaloPay)', 'Bổ sung sau'],
  ];
  const phiChucNang = [['Dễ sử dụng, chữ to, ít thao tác', 'Rất cao'], ['Bảo mật, phân quyền theo bộ phận', 'Cao'], ['Ổn định trong giờ cao điểm', 'Rất cao'], ['Tốc độ phản hồi', 'Cao'], ['Chi phí vận hành thấp', 'Cao']];
  const baoCao = ['Doanh thu theo ngày / tuần / tháng', 'Món bán chạy', 'Số đơn theo trạng thái (hoàn thành, hủy, giao thất bại)', 'Doanh thu theo hình thức thanh toán', 'Hiệu quả của mã giảm giá', 'Tỷ lệ khách quay lại đặt hàng', 'Năng suất của từng shipper', 'Tồn kho nguyên liệu'];
  return {
    key: 'nghiepVu',
    publicSummary: true,
    title: 'Khảo sát nghiệp vụ – Ứng dụng đặt món online cho nhà hàng',
    description:
      'Kính gửi Anh/Chị chủ nhà hàng!\n\n' + NHOM + ' (Khoa Công nghệ Thông tin và Truyền thông, Trường Đại học CMC) ' +
      'thực hiện đề tài "Ứng dụng đặt món online cho nhà hàng", học phần Phát triển ứng dụng di động. ' +
      'Khảo sát nhằm tìm hiểu quy trình bán hàng giao tận nhà hiện tại, các quy tắc nghiệp vụ và yêu cầu của nhà hàng đối với hệ thống.\n\n' +
      'Khảo sát gồm 7 phần, thời gian trả lời khoảng 20 phút. Câu có dấu * là bắt buộc.\n' +
      'Thông tin chỉ dùng cho mục đích học tập và thiết kế hệ thống; số liệu kinh doanh của nhà hàng không được công khai.',
    thanks: 'Trân trọng cảm ơn Anh/Chị đã tham gia khảo sát! Nhóm sẽ gửi tài liệu đặc tả yêu cầu để nhà hàng góp ý trước khi xây dựng hệ thống.',
    pages: [
      {
        key: 'tt', title: 'Thông tin người trả lời',
        questions: [
          { type: 'text', title: 'Họ và tên', a: 'Trần Minh Đức' },
          { type: 'mc', title: 'Vị trí công việc', other: true, choices: ['Chủ nhà hàng', 'Quản lý nhà hàng', 'Quản lý ca'], a: 'Chủ nhà hàng' },
          { type: 'text', title: 'Tên nhà hàng', a: 'Atlas Restaurant' },
          { type: 'text', title: 'Địa chỉ nhà hàng', a: 'Đường Tố Hữu, phường Hà Đông, thành phố Hà Nội' },
        ],
      },
      {
        key: 'a', title: 'Phần A. Thông tin chung và số liệu vận hành',
        description: 'Số liệu ước tính theo tháng gần nhất.',
        questions: [
          { type: 'mc', title: 'Loại hình kinh doanh', other: true, choices: ['Quán ăn nhỏ', 'Nhà hàng', 'Chuỗi nhà hàng nhiều chi nhánh', 'Bếp online (chỉ bán mang đi, giao hàng)'], a: 'Nhà hàng' },
          { type: 'mc', title: 'Thời gian nhà hàng đã hoạt động', choices: ['Dưới 1 năm', '1 – 3 năm', '3 – 5 năm', 'Trên 5 năm'], a: '3 – 5 năm' },
          { type: 'cb', title: 'Hình thức bán hàng', choices: ['Ăn tại chỗ', 'Mang đi', 'Giao tận nhà'], a: ['Ăn tại chỗ', 'Mang đi', 'Giao tận nhà'] },
          { type: 'text', title: 'Giờ mở cửa và giờ nhận đơn giao tận nhà', a: 'Mở cửa 09:00 – 22:00; nhận đơn giao tận nhà 09:00 – 21:30, tất cả các ngày trong tuần' },
          { type: 'para', title: 'Nhân sự theo từng bộ phận (số người, ca làm việc)', a: 'Quản lý ca: 1 người, giờ hành chính. Quầy – thu ngân: 3 người, 2 ca. Bếp: 6 người, 2 ca. Shipper: 4 người, 2 ca. Tổng 14 người.' },
          { type: 'mc', title: 'Số đơn giao tận nhà trung bình mỗi ngày', choices: ['Dưới 30 đơn', '30 – 60 đơn', '60 – 100 đơn', 'Trên 100 đơn'], a: '60 – 100 đơn' },
          { type: 'mc', title: 'Giá trị trung bình một đơn giao tận nhà', choices: ['Dưới 100.000đ', '100.000 – 150.000đ', '150.000 – 200.000đ', 'Trên 200.000đ'], a: '150.000 – 200.000đ' },
          { type: 'cb', title: 'Khung giờ cao điểm', choices: ['07:00 – 09:00', '11:00 – 13:00', '14:00 – 17:00', '17:30 – 19:30', 'Sau 20:00'], a: ['11:00 – 13:00', '17:30 – 19:30'] },
          { type: 'cb', title: 'Nhà hàng đang nhận đơn giao tận nhà qua những kênh nào?', other: true, choices: ['Gọi điện thoại', 'Nhắn tin Zalo / Messenger', 'Fanpage Facebook', 'Ứng dụng trung gian (GrabFood, ShopeeFood, Be…)', 'Website / ứng dụng riêng của nhà hàng'], a: ['Gọi điện thoại', 'Nhắn tin Zalo / Messenger', 'Fanpage Facebook', 'Ứng dụng trung gian (GrabFood, ShopeeFood, Be…)'] },
          { type: 'text', title: 'Tỷ trọng đơn hàng theo từng kênh (ước tính)', a: 'Ứng dụng trung gian 55%; gọi điện 20%; Zalo, Messenger 15%; Fanpage 10%' },
          { type: 'scale', title: 'Chiết khấu trả cho ứng dụng trung gian ảnh hưởng tới lợi nhuận ở mức nào?', min: 1, max: 5, minLabel: 'Không đáng kể', maxLabel: 'Rất lớn', a: 5 },
          { type: 'text', title: 'Tỷ lệ các hình thức thanh toán của khách (ước tính)', a: 'Tiền mặt khi nhận hàng khoảng 60%; chuyển khoản, quét mã QR khoảng 40%' },
          { type: 'mc', title: 'Thời gian trung bình từ lúc khách đặt đến lúc nhận được món', choices: ['Dưới 30 phút', '30 – 45 phút', '45 – 60 phút', 'Trên 60 phút'], a: '30 – 45 phút' },
          { type: 'mc', title: 'Tỷ lệ đơn bị "bom" hoặc giao không thành công', choices: ['Dưới 2%', '2 – 5%', '5 – 10%', 'Trên 10%'], a: '2 – 5%' },
        ],
      },
      {
        key: 'b', title: 'Phần B. Quy trình nghiệp vụ hiện tại và khó khăn',
        questions: [
          { type: 'para', title: 'Anh/Chị mô tả các bước xử lý một đơn giao tận nhà hiện nay, từ lúc khách đặt đến lúc giao xong',
            a: 'Nhân viên quầy nhận đơn qua điện thoại hoặc tin nhắn, ghi vào sổ, báo tổng tiền và phí giao cho khách rồi viết phiếu chuyển xuống bếp. Khách chuyển khoản thì gửi ảnh chụp màn hình, thu ngân dò biến động số dư rồi mới báo bếp làm. Bếp làm xong báo quầy, quầy giao phiếu cho shipper kèm địa chỉ, số điện thoại và số tiền cần thu. Shipper giao xong gọi điện báo quầy. Cuối ngày tôi cộng sổ, đối chiếu tiền mặt, sao kê ngân hàng và báo cáo của các ứng dụng trung gian.' },
          { type: 'mc', title: 'Bếp nhận đơn từ quầy bằng cách nào?', other: true, choices: ['Phiếu in hoặc viết tay', 'Nhân viên đọc to', 'Màn hình / máy tính bảng', 'Tin nhắn Zalo'], a: 'Phiếu in hoặc viết tay' },
          { type: 'mc', title: 'Nhà hàng xác nhận khách đã chuyển khoản bằng cách nào?', other: true, choices: ['Khách gửi ảnh chụp màn hình chuyển khoản', 'Thu ngân kiểm tra ứng dụng ngân hàng', 'Phần mềm tự đối soát', 'Không nhận chuyển khoản'], a: 'Khách gửi ảnh chụp màn hình chuyển khoản' },
          { type: 'mc', title: 'Hiện nay việc "đã giao hàng" được ghi nhận bằng cách nào?', other: true, choices: ['Shipper gọi điện báo quầy', 'Khách gọi lại xác nhận', 'Không ghi nhận'], a: 'Shipper gọi điện báo quầy' },
          { type: 'cb', title: 'Công cụ đang dùng để quản lý thực đơn, doanh thu', other: true, choices: ['Sổ tay', 'Excel / Google Sheets', 'Phần mềm bán hàng tại quầy', 'Báo cáo của ứng dụng trung gian'], a: ['Sổ tay', 'Excel / Google Sheets', 'Báo cáo của ứng dụng trung gian'] },
          { type: 'grid', title: 'Mức độ ảnh hưởng của các khó khăn khi bán hàng giao tận nhà', rows: khoKhan.map((x) => x[0]), cols: ANH_HUONG, a: khoKhan.map((x) => x[1]) },
          { type: 'para', title: 'Một sự cố cụ thể nhà hàng gặp gần đây', a: 'Tháng 9 có hai đơn khách báo chưa nhận được hàng trong khi shipper khẳng định đã giao. Nhà hàng không có bằng chứng nên phải làm lại đơn mới cho khách. Giờ trưa cũng thường có vài tin nhắn Zalo đặt món bị trả lời chậm, khách chuyển sang đặt nơi khác.' },
        ],
      },
      {
        key: 'c', title: 'Phần C. Quy tắc nghiệp vụ',
        description: 'Các quy định nhà hàng muốn áp dụng khi đưa hệ thống vào sử dụng.',
        questions: [
          { type: 'text', title: 'Giờ nhận đơn giao tận nhà', a: '09:00 – 21:30 hằng ngày; ngoài giờ không nhận đơn' },
          { type: 'text', title: 'Giá trị đơn hàng tối thiểu', a: '50.000đ, chưa tính phí giao hàng' },
          { type: 'text', title: 'Phạm vi giao hàng tối đa', a: '15 km tính từ nhà hàng' },
          { type: 'text', title: 'Cách tính phí giao hàng', a: '15.000đ cho 5 km đầu, mỗi km tiếp theo cộng 5.000đ' },
          { type: 'mc', title: 'Thời gian giữ đơn chờ khách chuyển khoản', choices: ['10 phút', '15 phút', '30 phút', 'Không giới hạn'], a: '15 phút', help: 'Quá thời gian này đơn tự hủy.' },
          { type: 'mc', title: 'Khách được tự hủy đơn khi nào?', choices: ['Khi nhà hàng chưa xác nhận đơn', 'Trước khi bếp bắt đầu chế biến', 'Không cho khách tự hủy'], a: 'Khi nhà hàng chưa xác nhận đơn' },
          { type: 'mc', title: 'Nhà hàng muốn việc "đã giao hàng" được xác nhận bằng cách nào?', other: true, choices: ['Shipper chụp ảnh tại nơi giao', 'Khách bấm "Đã nhận hàng" trên ứng dụng', 'Shipper gọi điện báo nhà hàng'], a: 'Shipper chụp ảnh tại nơi giao' },
          { type: 'mc', title: 'Khi giao không thành công, nhà hàng xử lý thế nào?', other: true, choices: ['Shipper ghi lý do, mang hàng về nhà hàng', 'Shipper chờ và liên hệ lại khách', 'Không có quy trình cụ thể'], a: 'Shipper ghi lý do, mang hàng về nhà hàng' },
          { type: 'mc', title: 'Điều kiện để khách đánh giá món', choices: ['Chỉ đơn đã giao thành công, trong vòng 7 ngày', 'Mọi khách đều đánh giá được', 'Không cần chức năng đánh giá'], a: 'Chỉ đơn đã giao thành công, trong vòng 7 ngày' },
          { type: 'text', title: 'Khung giờ không gửi thông báo khuyến mãi cho khách', a: 'Từ 21:00 đến 08:00 sáng hôm sau' },
          { type: 'para', title: 'Quy định về tài khoản nhân viên và bảo mật', a: 'Quản lý tạo tài khoản và cấp mật khẩu tạm, nhân viên phải đổi mật khẩu ở lần đăng nhập đầu tiên. Mỗi bộ phận chỉ thao tác đúng phần việc của mình. Khóa tài khoản khi nhân viên nghỉ việc; tạm khóa khi nhập sai mật khẩu nhiều lần.' },
        ],
      },
      {
        key: 'd', title: 'Phần D. Yêu cầu chức năng',
        questions: [
          { type: 'grid', title: 'Mức độ ưu tiên của từng chức năng', rows: chucNang.map((x) => x[0]), cols: UU_TIEN, a: chucNang.map((x) => x[1]) },
          { type: 'cb', title: 'Những bộ phận cần tài khoản riêng trên hệ thống', choices: ['Nhân viên quầy', 'Nhân viên bếp', 'Shipper', 'Quản lý'], a: ['Nhân viên quầy', 'Nhân viên bếp', 'Shipper', 'Quản lý'] },
          { type: 'cb', title: 'Màn hình bếp cần hiển thị những thông tin nào?', choices: ['Mã đơn và giờ đặt', 'Món, số lượng, tùy chọn', 'Ghi chú của khách', 'Thời gian chờ của từng đơn', 'Nút chuyển trạng thái "đang chuẩn bị", "đã xong"', 'Nút báo hết món'], a: ['Mã đơn và giờ đặt', 'Món, số lượng, tùy chọn', 'Ghi chú của khách', 'Thời gian chờ của từng đơn', 'Nút chuyển trạng thái "đang chuẩn bị", "đã xong"', 'Nút báo hết món'] },
          { type: 'cb', title: 'Hình thức khuyến mãi nhà hàng muốn áp dụng', other: true, choices: ['Giảm theo phần trăm, có mức giảm tối đa', 'Giảm số tiền cố định', 'Ưu đãi cho khách đặt lần đầu', 'Áp dụng cho đơn từ một giá trị tối thiểu', 'Miễn phí giao hàng'], a: ['Giảm theo phần trăm, có mức giảm tối đa', 'Ưu đãi cho khách đặt lần đầu', 'Áp dụng cho đơn từ một giá trị tối thiểu'] },
          { type: 'para', title: 'Chức năng khác nhà hàng mong muốn', optional: true, a: 'Hiển thị thời gian giao dự kiến cho khách; tạm ngưng nhận đơn khi bếp quá tải; khách lưu được nhiều địa chỉ giao hàng và món yêu thích.' },
        ],
      },
      {
        key: 'e', title: 'Phần E. Yêu cầu phi chức năng',
        questions: [
          { type: 'cbgrid', title: 'Thiết bị sử dụng ở từng bộ phận', rows: ['Quầy – thu ngân', 'Bếp', 'Shipper', 'Khách hàng'], cols: ['Máy tính', 'Máy tính bảng', 'Điện thoại Android', 'iPhone'],
            a: [['Máy tính'], ['Máy tính bảng'], ['Điện thoại Android'], ['Điện thoại Android', 'iPhone']] },
          { type: 'mc', title: 'Thời gian phản hồi chấp nhận được khi mở thực đơn, đặt hàng', choices: ['Dưới 2 giây', 'Dưới 3 giây', 'Dưới 5 giây'], a: 'Dưới 3 giây' },
          { type: 'mc', title: 'Số khách đặt cùng lúc hệ thống cần phục vụ ổn định giờ cao điểm', choices: ['Khoảng 10 khách', 'Khoảng 30 khách', 'Khoảng 50 khách', 'Trên 100 khách'], a: 'Khoảng 30 khách' },
          { type: 'grid', title: 'Mức độ quan trọng của các tiêu chí', rows: phiChucNang.map((x) => x[0]), cols: QUAN_TRONG, a: phiChucNang.map((x) => x[1]) },
          { type: 'mc', title: 'Hình thức phát hành ứng dụng', other: true, choices: ['Ứng dụng Android cài trực tiếp và bản web, phát hành lên kho sau', 'Phát hành ngay lên Google Play và App Store', 'Chỉ dùng bản web'], a: 'Ứng dụng Android cài trực tiếp và bản web, phát hành lên kho sau' },
        ],
      },
      {
        key: 'f', title: 'Phần F. Báo cáo, kỳ vọng và xác nhận',
        questions: [
          { type: 'cb', title: 'Nhà hàng cần những báo cáo nào?', other: true, choices: baoCao, a: baoCao.slice(0, 6) },
          { type: 'para', title: 'Kỳ vọng của nhà hàng khi đưa hệ thống vào sử dụng', a: 'Giảm phụ thuộc vào ứng dụng trung gian để tiết kiệm chiết khấu; hết cảnh ghi nhầm đơn; khách tự theo dõi đơn nên quầy bớt nghe điện thoại hỏi đơn; có số liệu doanh thu, món bán chạy hằng ngày mà không phải cộng sổ.' },
          { type: 'text', title: 'Chương trình khuyến mãi dự kiến chạy khi đưa ứng dụng vào sử dụng', optional: true, a: 'Mã WELCOME10 giảm 10% (tối đa 30.000đ) cho đơn đầu tiên từ 100.000đ; banner giới thiệu nhóm Đồ uống trên trang chủ' },
          { type: 'mc', title: 'Kế hoạch áp dụng hệ thống', choices: ['Áp dụng ngay', 'Cho nhân viên dùng thử nội bộ trước', 'Chưa xác định'], a: 'Cho nhân viên dùng thử nội bộ trước' },
          { type: 'para', title: 'Ý kiến khác', optional: true, a: 'Giao diện cần đơn giản, chữ to để nhân viên bếp lớn tuổi cũng dùng được. Nhà hàng sẵn sàng cho nhân viên dùng thử 2 tuần trước khi áp dụng chính thức.' },
          { type: 'cb', title: 'Xác nhận', choices: ['Tôi xác nhận thông tin cung cấp đúng với thực tế hoạt động của nhà hàng và đồng ý để nhóm sử dụng cho mục đích học tập.'], a: ['Tôi xác nhận thông tin cung cấp đúng với thực tế hoạt động của nhà hàng và đồng ý để nhóm sử dụng cho mục đích học tập.'] },
        ],
      },
    ],
  };
}

/**
 * Điền phiếu khảo sát nghiệp vụ bằng câu trả lời của chủ nhà hàng (trường `a` của từng câu):
 * ghi nhật ký link điền sẵn (mở để xem, chụp màn hình) rồi gửi câu trả lời vào form.
 * Chạy sau taoKhaoSatNghiepVu() hoặc taoTatCa().
 */
function dienPhieuChuNhaHang() {
  const id = PropertiesService.getScriptProperties().getProperty('form_nghiepVu');
  if (!id) throw new Error('Chưa tạo form khảo sát nghiệp vụ: chạy taoKhaoSatNghiepVu() trước.');
  const form = FormApp.openById(id);
  const cauHoi = [].concat(...khaoSatNghiepVu_().pages.map((p) => p.questions));
  const items = form.getItems().filter((i) => i.getType() !== FormApp.ItemType.PAGE_BREAK && i.getType() !== FormApp.ItemType.SECTION_HEADER);
  if (items.length !== cauHoi.length) throw new Error('Form không khớp nội dung (' + items.length + ' / ' + cauHoi.length + ' câu)');
  if (form.getResponses().length) throw new Error('Form đã có câu trả lời, không gửi thêm.');
  const res = form.createResponse();
  items.forEach((item, i) => {
    const q = cauHoi[i];
    if (q.a === undefined) return;
    const t = item.getType(), T = FormApp.ItemType;
    const typed = t === T.TEXT ? item.asTextItem() : t === T.PARAGRAPH_TEXT ? item.asParagraphTextItem() : t === T.MULTIPLE_CHOICE ? item.asMultipleChoiceItem()
      : t === T.CHECKBOX ? item.asCheckboxItem() : t === T.SCALE ? item.asScaleItem() : t === T.GRID ? item.asGridItem() : item.asCheckboxGridItem();
    res.withItemResponse(typed.createResponse(q.a));
  });
  Logger.log('Link phiếu đã điền sẵn (xem, chụp màn hình): %s', res.toPrefilledUrl());
  res.submit();
  Logger.log('Đã gửi câu trả lời. Bản tóm tắt câu trả lời: %s', form.getSummaryUrl());
}

// ---------------------------------------------------------------------------------------------
// 2. KHẢO SÁT TRẢI NGHIỆM NGƯỜI DÙNG (SAU KHI DÙNG APP)
// ---------------------------------------------------------------------------------------------
function khaoSatNguoiDung_() {
  const giamViec = { type: 'scale', title: 'So với cách làm cũ, ứng dụng giúp giảm công việc của anh/chị ở mức nào?', min: 1, max: 5, minLabel: 'Không giảm', maxLabel: 'Giảm rất nhiều' };
  return {
    title: 'Phiếu khảo sát trải nghiệm người dùng – Ứng dụng Atlas Restaurant',
    description:
      'Cảm ơn anh/chị đã dùng thử ứng dụng Atlas Restaurant (ứng dụng Android hoặc bản web ' + WEB_APP + ').\n\n' +
      NHOM + ' thực hiện phiếu này để đánh giá mức độ hài lòng, tính dễ sử dụng và khả năng tiếp tục sử dụng ứng dụng, ' +
      'từ đó cải thiện sản phẩm. Thông tin chỉ dùng cho mục đích học tập. Thời gian trả lời khoảng 5 phút.',
    thanks: 'Cảm ơn anh/chị đã đánh giá ứng dụng Atlas Restaurant!',
    pages: [
      {
        key: 'info', title: 'Thông tin người tham gia',
        questions: [
          { type: 'text', title: 'Họ và tên', optional: true },
          { type: 'mc', title: 'Độ tuổi', choices: ['Dưới 18', '18 – 24', '25 – 34', '35 – 44', 'Từ 45 trở lên'] },
          { type: 'mc', title: 'Nghề nghiệp', other: true, choices: ['Học sinh, sinh viên', 'Nhân viên văn phòng', 'Kinh doanh, buôn bán', 'Nhân viên nhà hàng, quán ăn'] },
          { type: 'cb', title: 'Anh/chị đã dùng ứng dụng trên', choices: ['Ứng dụng Android', 'Web trên điện thoại', 'Web trên máy tính'] },
          { type: 'mc', title: 'Thời gian anh/chị đã dùng thử ứng dụng', choices: ['Dưới 15 phút', '15 – 30 phút', '30 – 60 phút', 'Hơn 1 giờ', 'Dùng trong nhiều ngày'] },
          {
            type: 'mc', title: 'Anh/chị đã dùng ứng dụng với vai trò nào?',
            help: 'Phiếu sẽ chuyển tới phần đánh giá các chức năng của vai trò này.',
            choices: ['Khách hàng đặt món', 'Nhân viên quầy (nhận đơn, thu ngân)', 'Nhân viên bếp', 'Nhân viên giao hàng (shipper)', 'Quản lý cửa hàng'],
            branch: {
              'Khách hàng đặt món': 'kh',
              'Nhân viên quầy (nhận đơn, thu ngân)': 'nv',
              'Nhân viên bếp': 'bep',
              'Nhân viên giao hàng (shipper)': 'ship',
              'Quản lý cửa hàng': 'ql',
            },
          },
        ],
      },
      {
        key: 'kh', title: 'Đánh giá chức năng dành cho khách hàng', next: 'chung',
        questions: [
          {
            type: 'grid', title: 'Mức độ hài lòng của anh/chị với từng chức năng', cols: HAI_LONG,
            rows: [
              'Đăng ký, đăng nhập',
              'Xem thực đơn, tìm món',
              'Xem chi tiết món, chọn tùy chọn',
              'Giỏ hàng',
              'Áp dụng mã giảm giá, khuyến mãi',
              'Đặt hàng, chọn địa chỉ giao',
              'Thanh toán chuyển khoản VietQR',
              'Thanh toán tiền mặt khi nhận hàng (COD)',
              'Theo dõi trạng thái đơn hàng',
              'Thông báo',
              'Đánh giá món, gửi góp ý',
              'Món yêu thích',
              'Xem hóa đơn',
            ],
          },
          { type: 'mc', title: 'Thời gian anh/chị cần để hoàn tất một đơn hàng', choices: ['Dưới 2 phút', '2 – 5 phút', '5 – 10 phút', 'Trên 10 phút', 'Chưa đặt được đơn nào'] },
          { type: 'mc', title: 'So với ứng dụng đặt đồ ăn anh/chị đang dùng (GrabFood, ShopeeFood…), Atlas Restaurant', choices: ['Dễ dùng hơn', 'Tương đương', 'Khó dùng hơn', 'Tôi chưa dùng ứng dụng nào khác'] },
        ],
      },
      {
        key: 'nv', title: 'Đánh giá chức năng dành cho nhân viên quầy', next: 'chung',
        questions: [
          {
            type: 'grid', title: 'Mức độ hài lòng của anh/chị với từng chức năng', cols: HAI_LONG,
            rows: ['Nhận thông báo đơn mới', 'Xem chi tiết đơn, ghi chú của khách', 'Xác nhận hoặc từ chối đơn', 'Xác nhận thanh toán', 'Cập nhật món tạm hết', 'Xem lịch sử đơn', 'Xem góp ý của khách'],
          },
          giamViec,
        ],
      },
      {
        key: 'bep', title: 'Đánh giá chức năng dành cho nhân viên bếp', next: 'chung',
        questions: [
          {
            type: 'grid', title: 'Mức độ hài lòng của anh/chị với từng chức năng', cols: HAI_LONG,
            rows: ['Xem danh sách đơn cần làm', 'Đọc món, tùy chọn, ghi chú', 'Đánh dấu đơn đã làm xong', 'Báo món tạm hết', 'Cỡ chữ, bố cục dễ nhìn khi đang làm bếp'],
          },
          Object.assign({}, giamViec),
        ],
      },
      {
        key: 'ship', title: 'Đánh giá chức năng dành cho shipper', next: 'chung',
        questions: [
          {
            type: 'grid', title: 'Mức độ hài lòng của anh/chị với từng chức năng', cols: HAI_LONG,
            rows: ['Xem danh sách đơn sẵn sàng giao', 'Nhận đơn', 'Xem địa chỉ, số điện thoại, số tiền cần thu', 'Chụp ảnh xác nhận đã giao', 'Báo giao không thành công kèm lý do'],
          },
          Object.assign({}, giamViec),
        ],
      },
      {
        key: 'ql', title: 'Đánh giá chức năng dành cho quản lý', next: 'chung',
        questions: [
          {
            type: 'grid', title: 'Mức độ hài lòng của anh/chị với từng chức năng', cols: HAI_LONG,
            rows: ['Trang tổng quan', 'Quản lý danh mục, thực đơn', 'Quản lý nhân viên', 'Quản lý khách hàng', 'Khuyến mãi, mã giảm giá', 'Theo dõi đơn hàng, thanh toán', 'Báo cáo doanh thu', 'Đánh giá của khách', 'Cài đặt cửa hàng'],
          },
          { type: 'scale', title: 'Ứng dụng hỗ trợ việc quản lý cửa hàng ở mức nào?', min: 1, max: 5, minLabel: 'Không hỗ trợ', maxLabel: 'Hỗ trợ rất tốt' },
        ],
      },
      {
        key: 'chung', title: 'Đánh giá chung',
        description: 'Phần này dành cho tất cả người tham gia.',
        questions: [
          {
            type: 'grid', title: 'Mức độ đồng ý của anh/chị với các nhận định sau (thang đo SUS)', cols: DONG_Y,
            rows: [
              'Tôi nghĩ rằng tôi sẽ muốn sử dụng ứng dụng này thường xuyên.',
              'Tôi thấy ứng dụng phức tạp một cách không cần thiết.',
              'Tôi thấy ứng dụng dễ sử dụng.',
              'Tôi nghĩ tôi cần người am hiểu kỹ thuật hỗ trợ mới dùng được ứng dụng này.',
              'Tôi thấy các chức năng của ứng dụng được kết hợp tốt với nhau.',
              'Tôi thấy ứng dụng có quá nhiều chỗ không nhất quán.',
              'Tôi nghĩ hầu hết mọi người sẽ học cách dùng ứng dụng này rất nhanh.',
              'Tôi thấy ứng dụng rất rườm rà, khó thao tác.',
              'Tôi cảm thấy rất tự tin khi sử dụng ứng dụng.',
              'Tôi cần học nhiều thứ trước khi có thể dùng được ứng dụng này.',
            ],
          },
          {
            type: 'grid', title: 'Đánh giá giao diện và hiệu năng', cols: ['Rất kém', 'Kém', 'Trung bình', 'Tốt', 'Rất tốt'],
            rows: ['Giao diện đẹp, hài hòa', 'Chữ, biểu tượng dễ đọc', 'Bố cục dễ tìm chức năng', 'Tốc độ tải và phản hồi', 'Ứng dụng chạy ổn định, ít lỗi'],
          },
          {
            type: 'cb', title: 'Anh/chị có gặp lỗi nào khi sử dụng không?', other: true,
            choices: ['Không gặp lỗi', 'Ứng dụng bị treo hoặc tự thoát', 'Tải chậm', 'Không đăng nhập được', 'Không thanh toán được', 'Không nhận được thông báo', 'Hiển thị sai, lệch giao diện'],
          },
          { type: 'para', title: 'Mô tả lỗi anh/chị gặp (màn hình nào, thao tác gì)', optional: true },
          { type: 'mc', title: 'Anh/chị có tiếp tục sử dụng ứng dụng trong thời gian tới không?', choices: ['Chắc chắn có', 'Có thể', 'Chưa chắc', 'Không'] },
          { type: 'scale', title: 'Khả năng anh/chị giới thiệu ứng dụng cho bạn bè, người quen', min: 0, max: 10, minLabel: 'Chắc chắn không', maxLabel: 'Chắc chắn có' },
          { type: 'para', title: 'Điều anh/chị thích nhất ở ứng dụng', optional: true },
          { type: 'para', title: 'Điều anh/chị muốn ứng dụng cải thiện', optional: true },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------------------------
// Dựng Google Form từ mô tả ở trên
// ---------------------------------------------------------------------------------------------
function taoForm_(s) {
  const form = FormApp.create(s.title);
  form.setDescription(s.description)
    .setConfirmationMessage(s.thanks)
    .setProgressBar(true)
    .setCollectEmail(false)
    .setAllowResponseEdits(false)
    .setShowLinkToRespondAgain(false);

  const breaks = {};   // key trang → PageBreakItem (trang đầu không có)
  const branches = [];
  s.pages.forEach((page, i) => {
    if (i === 0) {
      form.addSectionHeaderItem().setTitle(page.title);
    } else {
      const b = form.addPageBreakItem().setTitle(page.title);
      if (page.description) b.setHelpText(page.description);
      breaks[page.key] = b;
    }
    page.questions.forEach((q) => {
      const item = themCauHoi_(form, q);
      if (q.branch) branches.push({ item: item, q: q });
    });
  });

  // Rẽ nhánh theo vai trò: mỗi lựa chọn chuyển tới trang tương ứng
  branches.forEach(({ item, q }) => {
    item.setChoices(q.choices.map((c) => item.createChoice(c, breaks[q.branch[c]])));
  });
  // Hết trang của một vai trò thì nhảy thẳng tới trang chung, bỏ qua trang của vai trò khác.
  // setGoToPage đặt trên ngắt trang ngay sau trang đó (điểm Google Forms dùng khi đi tiếp tuần tự).
  s.pages.forEach((page, i) => {
    const sau = s.pages[i + 1];
    if (page.next && sau && sau.key !== page.next) breaks[sau.key].setGoToPage(breaks[page.next]);
  });

  const ss = SpreadsheetApp.create(s.title + ' (Câu trả lời)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  try { form.setPublished(true); } catch (e) { /* tài khoản cũ: form đã công khai sẵn */ }
  if (s.publicSummary) form.setPublishingSummary(true);   // người có link xem được bản tóm tắt câu trả lời
  if (s.key) PropertiesService.getScriptProperties().setProperty('form_' + s.key, form.getId());

  let link = form.getPublishedUrl();
  try { link = form.shortenFormUrl(link); } catch (e) { /* giữ link đầy đủ */ }
  Logger.log('%s\n  Link gửi người khảo sát: %s\n  Link chỉnh sửa form: %s\n  Bảng câu trả lời: %s', s.title, link, form.getEditUrl(), ss.getUrl());
  return form;
}

function themCauHoi_(form, q) {
  let item;
  switch (q.type) {
    case 'text': item = form.addTextItem(); break;
    case 'para': item = form.addParagraphTextItem(); break;
    case 'mc':
      item = form.addMultipleChoiceItem();
      if (!q.branch) item.setChoiceValues(q.choices);
      if (q.other) item.showOtherOption(true);
      break;
    case 'cb':
      item = form.addCheckboxItem().setChoiceValues(q.choices);
      if (q.other) item.showOtherOption(true);
      if (q.max) item.setValidation(FormApp.createCheckboxValidation().requireSelectAtMost(q.max).build());
      break;
    case 'scale':
      item = form.addScaleItem().setBounds(q.min, q.max).setLabels(q.minLabel, q.maxLabel);
      break;
    case 'grid':
      item = form.addGridItem().setRows(q.rows).setColumns(q.cols);
      break;
    case 'cbgrid':
      item = form.addCheckboxGridItem().setRows(q.rows).setColumns(q.cols);
      break;
    default:
      throw new Error('Loại câu hỏi không hỗ trợ: ' + q.type);
  }
  item.setTitle(q.title);
  if (q.help) item.setHelpText(q.help);
  item.setRequired(!q.optional);
  return item;
}
