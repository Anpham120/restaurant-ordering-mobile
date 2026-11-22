/**
 * Tạo 2 phiếu khảo sát Google Forms cho đề tài Atlas Restaurant:
 *   1. Khảo sát nghiệp vụ (trước khi xây dựng: quy trình hiện tại, nhu cầu chức năng)
 *   2. Khảo sát trải nghiệm người dùng (sau khi dùng thử ứng dụng)
 *
 * Cách dùng:
 *   1. Mở https://script.google.com → Dự án mới → xoá code mẫu, dán toàn bộ file này.
 *   2. Chọn hàm `taoTatCa` → Chạy → cấp quyền (Google Forms, Google Sheets).
 *   3. Xem Nhật ký thực thi: link gửi người khảo sát, link chỉnh sửa, link bảng câu trả lời.
 * Mỗi lần chạy tạo bộ form mới; chạy lại chỉ khi muốn tạo lại từ đầu.
 */

const NHOM = 'Nhóm thực hiện đề tài Atlas Restaurant';
const WEB_APP = 'https://order.atlasplatform12.tech';

const HAI_LONG = ['Rất không hài lòng', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Rất hài lòng', 'Chưa sử dụng'];
const CAN_THIET = ['Không cần thiết', 'Ít cần thiết', 'Cần thiết', 'Rất cần thiết'];
const DONG_Y = ['1 - Rất không đồng ý', '2 - Không đồng ý', '3 - Trung lập', '4 - Đồng ý', '5 - Rất đồng ý'];

function taoTatCa() {
  [khaoSatNghiepVu_(), khaoSatNguoiDung_()].forEach(taoForm_);
}

// ---------------------------------------------------------------------------------------------
// 1. KHẢO SÁT NGHIỆP VỤ
// ---------------------------------------------------------------------------------------------
function khaoSatNghiepVu_() {
  return {
    title: 'Phiếu khảo sát nghiệp vụ – Hệ thống đặt món giao tận nơi Atlas Restaurant',
    description:
      'Xin chào anh/chị! ' + NHOM + ' đang xây dựng ứng dụng đặt món giao tận nơi cho nhà hàng ' +
      '(khách đặt món trên điện thoại, quầy xác nhận đơn, bếp chế biến, shipper giao và xác nhận bằng ảnh, ' +
      'thanh toán khi nhận hàng hoặc chuyển khoản VietQR).\n\n' +
      'Phiếu này tìm hiểu quy trình bán hàng giao tận nơi hiện tại và nhu cầu thực tế, để nhóm xác định đúng yêu cầu của hệ thống. ' +
      'Thông tin chỉ dùng cho mục đích học tập và không được công khai. Thời gian trả lời khoảng 5–7 phút.',
    thanks: 'Cảm ơn anh/chị đã dành thời gian tham gia khảo sát! Ý kiến của anh/chị giúp nhóm xây dựng hệ thống sát với thực tế hơn.',
    pages: [
      {
        key: 'info', title: 'Thông tin người tham gia',
        questions: [
          { type: 'text', title: 'Họ và tên', optional: true },
          { type: 'text', title: 'Tên cửa hàng / nhà hàng anh/chị đang làm việc', optional: true, help: 'Khách hàng bỏ qua câu này.' },
          {
            type: 'mc', title: 'Loại hình kinh doanh của cửa hàng', optional: true, other: true, help: 'Khách hàng bỏ qua câu này.',
            choices: ['Quán ăn nhỏ', 'Nhà hàng', 'Chuỗi nhà hàng nhiều chi nhánh', 'Quán cà phê, đồ uống', 'Bếp online (chỉ bán mang đi, giao hàng)'],
          },
          {
            type: 'mc', title: 'Số đơn giao tận nơi trung bình mỗi ngày của cửa hàng', optional: true, help: 'Khách hàng bỏ qua câu này.',
            choices: ['Dưới 10 đơn', '10 – 30 đơn', '30 – 60 đơn', '60 – 100 đơn', 'Trên 100 đơn'],
          },
          {
            type: 'mc', title: 'Vai trò của anh/chị',
            help: 'Phiếu sẽ chuyển tới phần câu hỏi dành riêng cho vai trò này.',
            choices: ['Chủ cửa hàng / Quản lý', 'Nhân viên nhận đơn, thu ngân', 'Nhân viên bếp', 'Nhân viên giao hàng (shipper)', 'Khách hàng thường đặt món giao tận nơi'],
            branch: {
              'Chủ cửa hàng / Quản lý': 'ql',
              'Nhân viên nhận đơn, thu ngân': 'nv',
              'Nhân viên bếp': 'bep',
              'Nhân viên giao hàng (shipper)': 'ship',
              'Khách hàng thường đặt món giao tận nơi': 'kh',
            },
          },
        ],
      },
      {
        key: 'ql', title: 'Dành cho chủ cửa hàng / quản lý', next: 'chung',
        questions: [
          {
            type: 'cb', title: 'Hiện cửa hàng nhận đơn giao tận nơi qua những kênh nào?', other: true,
            choices: ['Gọi điện thoại', 'Nhắn tin Zalo / Messenger', 'Fanpage Facebook', 'Ứng dụng trung gian (GrabFood, ShopeeFood, BeFood…)', 'Website / ứng dụng riêng của cửa hàng'],
          },
          {
            type: 'mc', title: 'Chiết khấu phải trả cho ứng dụng trung gian ảnh hưởng thế nào tới cửa hàng?',
            choices: ['Rất lớn, ảnh hưởng nhiều tới lợi nhuận', 'Có ảnh hưởng nhưng chấp nhận được', 'Không đáng kể', 'Cửa hàng không dùng ứng dụng trung gian'],
          },
          {
            type: 'mc', title: 'Thực đơn, giá bán và tình trạng còn/hết món đang được quản lý bằng cách nào?', other: true,
            choices: ['Sổ sách, giấy tờ', 'Excel / Google Sheets', 'Phần mềm bán hàng (POS)', 'Không quản lý cụ thể'],
          },
          {
            type: 'cb', title: 'Những khó khăn lớn nhất khi quản lý bán hàng giao tận nơi', other: true,
            choices: [
              'Đơn đến từ nhiều kênh, dễ sót đơn',
              'Ghi nhầm món, nhầm tùy chọn (size, topping, ít cay…)',
              'Khó đối soát tiền khách chuyển khoản',
              'Không biết đơn đang ở bước nào (bếp, đang giao…)',
              'Shipper báo đã giao nhưng khách nói chưa nhận',
              'Khách hủy đơn, "bom" hàng',
              'Khó thống kê doanh thu, món bán chạy',
              'Khó triển khai khuyến mãi, mã giảm giá',
              'Khó phân quyền, quản lý nhân viên',
            ],
          },
          {
            type: 'cb', title: 'Cửa hàng thường dùng hình thức khuyến mãi nào?', other: true,
            choices: ['Giảm theo phần trăm', 'Giảm một số tiền cố định', 'Miễn / giảm phí giao hàng', 'Ưu đãi cho khách mới', 'Áp dụng cho đơn từ một giá trị tối thiểu', 'Không chạy khuyến mãi'],
          },
          {
            type: 'cb', title: 'Anh/chị muốn hệ thống có những báo cáo nào?', other: true,
            choices: ['Doanh thu theo ngày / tuần / tháng', 'Món bán chạy', 'Số đơn theo trạng thái (hoàn thành, hủy, giao thất bại)', 'Doanh thu theo hình thức thanh toán', 'Hiệu quả của mã giảm giá', 'Đánh giá, góp ý của khách hàng'],
          },
          {
            type: 'mc', title: 'Anh/chị muốn việc "đã giao hàng" được xác nhận bằng cách nào?', other: true,
            choices: ['Shipper chụp ảnh tại nơi giao', 'Khách bấm "Đã nhận hàng" trên ứng dụng', 'Shipper gọi điện báo cửa hàng', 'Không cần xác nhận'],
          },
        ],
      },
      {
        key: 'nv', title: 'Dành cho nhân viên nhận đơn, thu ngân', next: 'chung',
        questions: [
          { type: 'mc', title: 'Số đơn giao tận nơi anh/chị xử lý trong một ca', choices: ['Dưới 10 đơn', '10 – 30 đơn', '30 – 60 đơn', 'Trên 60 đơn'] },
          { type: 'mc', title: 'Thời gian trung bình để nhận và ghi lại một đơn', choices: ['Dưới 1 phút', '1 – 3 phút', '3 – 5 phút', 'Trên 5 phút'] },
          {
            type: 'cb', title: 'Khách thường thanh toán đơn giao tận nơi bằng hình thức nào?', other: true,
            choices: ['Tiền mặt khi nhận hàng (COD)', 'Chuyển khoản ngân hàng / quét mã QR', 'Ví điện tử (MoMo, ZaloPay…)', 'Thẻ ngân hàng'],
          },
          {
            type: 'mc', title: 'Anh/chị xác nhận khách đã chuyển khoản bằng cách nào?', other: true,
            choices: ['Xem thông báo biến động số dư', 'Khách gửi ảnh chụp màn hình chuyển khoản', 'Đối chiếu sao kê cuối ngày', 'Chủ cửa hàng tự kiểm tra'],
          },
          {
            type: 'mc', title: 'Khi một món hết nguyên liệu, khách được báo bằng cách nào?', other: true,
            choices: ['Gọi điện báo khách sau khi đã nhận đơn', 'Báo ngay khi khách gọi đặt', 'Ghi chú nội bộ, không báo trước', 'Không có quy trình cụ thể'],
          },
          {
            type: 'cb', title: 'Những việc tốn nhiều thời gian nhất của anh/chị', other: true,
            choices: ['Ghi lại đơn và tùy chọn món', 'Chuyển đơn cho bếp', 'Trả lời khách hỏi đơn đang ở đâu', 'Đối soát tiền chuyển khoản', 'Liên hệ, điều phối shipper', 'Xử lý hủy đơn, đổi món'],
          },
        ],
      },
      {
        key: 'bep', title: 'Dành cho nhân viên bếp', next: 'chung',
        questions: [
          {
            type: 'mc', title: 'Bếp nhận đơn từ quầy bằng cách nào?', other: true,
            choices: ['Phiếu in hoặc viết tay', 'Nhân viên đọc to', 'Màn hình / máy tính bảng', 'Tin nhắn Zalo'],
          },
          {
            type: 'cb', title: 'Những sai sót thường xảy ra trong bếp', other: true,
            choices: ['Làm nhầm món, nhầm tùy chọn', 'Bỏ sót ghi chú của khách', 'Làm sai thứ tự đơn', 'Không biết đơn đã bị hủy', 'Không báo kịp khi hết nguyên liệu', 'Không gặp sai sót đáng kể'],
          },
          {
            type: 'cb', title: 'Màn hình bếp cần hiển thị những thông tin nào?', other: true,
            choices: ['Mã đơn và giờ đặt', 'Món, số lượng, tùy chọn', 'Ghi chú của khách', 'Thời gian chờ của từng đơn', 'Nút báo "đã làm xong"', 'Nút báo hết món'],
          },
          { type: 'scale', title: 'Mức độ quan trọng của việc đơn được xếp theo thứ tự đến trước – làm trước', min: 1, max: 5, minLabel: 'Không quan trọng', maxLabel: 'Rất quan trọng' },
        ],
      },
      {
        key: 'ship', title: 'Dành cho nhân viên giao hàng (shipper)', next: 'chung',
        questions: [
          { type: 'mc', title: 'Hình thức làm việc của anh/chị', other: true, choices: ['Shipper riêng của cửa hàng', 'Shipper tự do nhận chuyến', 'Tài xế ứng dụng trung gian'] },
          { type: 'mc', title: 'Số đơn anh/chị giao trung bình mỗi ngày', choices: ['Dưới 10 đơn', '10 – 20 đơn', '20 – 40 đơn', 'Trên 40 đơn'] },
          {
            type: 'mc', title: 'Anh/chị nhận thông tin đơn (địa chỉ, số điện thoại, số tiền cần thu) bằng cách nào?', other: true,
            choices: ['Phiếu giấy', 'Tin nhắn Zalo / SMS', 'Gọi điện', 'Ứng dụng'],
          },
          {
            type: 'cb', title: 'Những khó khăn khi giao hàng', other: true,
            choices: ['Địa chỉ không rõ ràng', 'Khách không nghe máy', 'Khách "bom" hàng', 'Nhầm số tiền cần thu (COD)', 'Không có bằng chứng đã giao', 'Không biết đơn nào đã sẵn sàng để lấy'],
          },
          { type: 'mc', title: 'Anh/chị có sẵn sàng chụp ảnh tại nơi giao làm bằng chứng giao hàng không?', choices: ['Sẵn sàng', 'Đồng ý nếu thao tác nhanh', 'Không muốn'] },
          {
            type: 'mc', title: 'Khi giao không thành công, anh/chị thường xử lý thế nào?', other: true,
            choices: ['Gọi báo cửa hàng', 'Mang hàng về cửa hàng', 'Chờ và liên hệ lại khách'],
          },
        ],
      },
      {
        key: 'kh', title: 'Dành cho khách hàng', next: 'chung',
        questions: [
          { type: 'mc', title: 'Anh/chị đặt món giao tận nơi thường xuyên như thế nào?', choices: ['Hằng ngày', '2 – 3 lần mỗi tuần', 'Vài lần mỗi tháng', 'Hiếm khi'] },
          {
            type: 'cb', title: 'Anh/chị thường đặt món qua kênh nào?', other: true,
            choices: ['GrabFood', 'ShopeeFood', 'BeFood', 'Gọi điện trực tiếp cho quán', 'Nhắn tin Zalo / Facebook của quán', 'Website / ứng dụng riêng của quán'],
          },
          {
            type: 'cb', title: 'Yếu tố quan trọng nhất khi anh/chị chọn đặt món (chọn tối đa 3)', max: 3,
            choices: ['Giá món', 'Phí giao hàng', 'Thời gian giao', 'Hình ảnh, mô tả món rõ ràng', 'Đánh giá của khách khác', 'Khuyến mãi, mã giảm giá', 'Theo dõi được trạng thái đơn', 'Thanh toán tiện lợi'],
          },
          { type: 'mc', title: 'Hình thức thanh toán anh/chị ưa thích', other: true, choices: ['Tiền mặt khi nhận hàng (COD)', 'Chuyển khoản bằng mã QR', 'Ví điện tử', 'Thẻ ngân hàng'] },
          {
            type: 'cb', title: 'Điều anh/chị chưa hài lòng khi đặt món giao tận nơi', other: true,
            choices: ['Không biết đơn đang ở đâu', 'Giao chậm', 'Món sai hoặc thiếu', 'Giá trên ứng dụng trung gian cao hơn tại quán', 'Gọi điện đặt món hay bị ghi nhầm', 'Khó áp dụng mã giảm giá', 'Không có hóa đơn'],
          },
          { type: 'scale', title: 'Nếu quán có ứng dụng đặt món riêng, anh/chị có sẵn sàng sử dụng không?', min: 1, max: 5, minLabel: 'Chắc chắn không', maxLabel: 'Chắc chắn có' },
        ],
      },
      {
        key: 'chung', title: 'Mức độ cần thiết của các chức năng',
        description: 'Phần này dành cho tất cả người tham gia.',
        questions: [
          {
            type: 'grid', title: 'Theo anh/chị, mỗi chức năng sau cần thiết ở mức nào?', cols: CAN_THIET,
            rows: [
              'Xem thực đơn có hình ảnh, giá và tùy chọn món',
              'Đăng ký, đăng nhập bằng số điện thoại',
              'Giỏ hàng, ghi chú cho từng món',
              'Mã giảm giá, chương trình khuyến mãi',
              'Thanh toán tiền mặt khi nhận hàng (COD)',
              'Thanh toán chuyển khoản VietQR, tự động xác nhận',
              'Theo dõi trạng thái đơn hàng',
              'Thông báo khi đơn thay đổi trạng thái',
              'Đánh giá món ăn, gửi góp ý',
              'Màn hình bếp hiển thị các đơn cần làm',
              'Cập nhật món tạm hết',
              'Shipper nhận đơn và chụp ảnh xác nhận giao hàng',
              'Báo cáo doanh thu, món bán chạy',
              'Quản lý thực đơn, nhân viên, mã giảm giá',
            ],
          },
          { type: 'cb', title: 'Anh/chị sẽ dùng ứng dụng trên thiết bị nào?', choices: ['Điện thoại Android', 'iPhone', 'Máy tính bảng', 'Máy tính'] },
          { type: 'para', title: 'Chức năng khác anh/chị mong muốn hệ thống có', optional: true },
          { type: 'para', title: 'Ý kiến đóng góp khác', optional: true },
        ],
      },
    ],
  };
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
    default:
      throw new Error('Loại câu hỏi không hỗ trợ: ' + q.type);
  }
  item.setTitle(q.title);
  if (q.help) item.setHelpText(q.help);
  item.setRequired(!q.optional);
  return item;
}
