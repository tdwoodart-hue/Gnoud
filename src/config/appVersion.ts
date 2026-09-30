export interface AppRelease {
  version: string;
  updatedAt: string;
  title: string;
  changes: string[];
}

export const APP_VERSION = '0.9.12';
export const APP_UPDATED_AT = '2026-09-30T16:22:00+07:00';

export const APP_RELEASES: AppRelease[] = [
  {
    version: '0.9.12',
    updatedAt: '2026-09-30T16:22:00+07:00',
    title: 'Sửa Safari/iPhone chặn phát giọng online',
    changes: [
      'Bỏ mẹo phát audio im lặng để mở khóa vì Safari vẫn có thể chặn.',
      'Khi mở Nghe sách, app tải sẵn đoạn audio đầu tiên của vị trí hiện tại.',
      'Khi bấm Phát, audio đã sẵn sàng và play() chạy trực tiếp trong cú chạm của người dùng.',
      'Nếu audio chưa kịp tải, app chuẩn bị trước rồi yêu cầu chạm Phát thêm một lần thay vì tự rơi sang giọng trên máy.',
      'Hiện trạng thái Đang chuẩn bị giọng và xử lý resume audio rõ ràng hơn.',
    ],
  },
  {
    version: '0.9.11',
    updatedAt: '2026-09-30T16:08:00+07:00',
    title: 'Reader nhận đúng Firebase service account đã có trên Vercel',
    changes: [
      'Reader TTS chấp nhận cả JSON service account trực tiếp và JSON bị bọc thêm một lớp chuỗi.',
      'Đồng bộ cách đọc FIREBASE_SERVICE_ACCOUNT_JSON với phần notification đã có trong app.',
      'Thêm test cho trường hợp Vercel lưu service account theo dạng double-encoded JSON.',
    ],
  },
  {
    version: '0.9.10',
    updatedAt: '2026-09-30T15:28:00+07:00',
    title: 'Sửa lỗi Vercel không khởi động API giọng đọc',
    changes: [
      'Xác nhận production /api/reader/tts đang crash ở mức Vercel FUNCTION_INVOCATION_FAILED, chưa chạy tới logic TTS.',
      'Sửa import server dùng đuôi .js đúng kiểu ESM giống các API serverless đang hoạt động khác trong repo.',
      'Giữ nguyên fallback giọng trên máy và phần chẩn đoán TTS của v0.9.9.',
    ],
  },
  {
    version: '0.9.9',
    updatedAt: '2026-09-30T14:45:00+07:00',
    title: 'Sửa kết nối giọng đọc online',
    changes: [
      'Google Cloud TTS dùng OAuth từ FIREBASE_SERVICE_ACCOUNT_JSON thay vì phụ thuộc API key query.',
      'API giọng đọc không cache trạng thái provider để tránh giữ lỗi cấu hình cũ.',
      'Mobile Safari/iPhone dùng lại một audio element đã được mở khóa từ thao tác chạm, tránh bị chặn phát sau khi fetch audio.',
      'Tự làm mới danh sách giọng hệ thống nhiều lần trên iOS/Safari và khi mở bảng Nghe sách.',
      'Hiển thị trạng thái kết nối online rõ ràng, có nút Thử kết nối lại và tự fallback sang giọng trên máy khi online lỗi.',
    ],
  },
  {
    version: '0.9.8',
    updatedAt: '2026-09-29T14:45:00+07:00',
    title: 'Xóa hẳn launcher Trợ lý khỏi giao diện',
    changes: [
      'Xóa nút Trợ lý khỏi sidebar desktop.',
      'Xóa nút Trợ lý nổi trên mobile.',
      'Xóa luôn công tắc Hiện nút Trợ lý trong Cài đặt và state lưu ẩn/hiện launcher.',
      'Phần Trợ lý bên trong vẫn được giữ lại; không còn launcher cố định chiếm giao diện.',
    ],
  },
  {
    version: '0.9.7',
    updatedAt: '2026-09-29T14:36:00+07:00',
    title: 'Ẩn hoàn toàn nút Trợ lý',
    changes: [
      'Bấm Ẩn trong Trợ lý sẽ tắt luôn launcher Trợ lý trên mobile và desktop.',
      'Khi đã ẩn, phím tắt mở Trợ lý cũng không hoạt động để tránh bật lại ngoài ý muốn.',
      'Cài đặt có công tắc Hiện nút Trợ lý để bật launcher trở lại.',
      'Thu gọn vẫn chỉ thu cửa sổ thành pill; Ẩn mới là tắt hoàn toàn launcher.',
    ],
  },
  {
    version: '0.9.6',
    updatedAt: '2026-09-29T14:28:00+07:00',
    title: 'Sửa hẳn kéo mobile + tách Thu gọn và Ẩn',
    changes: [
      'Kéo mobile dùng listener gắn ngay khi chạm, không chờ render; thêm fallback touchmove/touchend cho Safari/WebView.',
      'Khi bắt đầu kéo, cửa sổ mobile thu về khoảng 82% chiều rộng để thực sự có khoảng trống kéo trái/phải.',
      'Thanh kéo được làm cao và rõ hơn, có chữ Kéo trên điện thoại.',
      'Thu gọn chỉ biến Trợ lý thành pill; Ẩn thì biến mất hoàn toàn khỏi màn hình.',
      'Pill thu gọn cũng kéo được; nút Ẩn trên pill đóng hẳn Trợ lý nhưng vẫn giữ draft để mở lại sau.',
    ],
  },
  {
    version: '0.9.5',
    updatedAt: '2026-09-29T14:12:00+07:00',
    title: 'Trợ lý kéo được trên điện thoại',
    changes: [
      'Bỏ chặn drag trên mobile: giữ thanh kéo phía trên rồi kéo cửa sổ tới vị trí mong muốn.',
      'Khi bắt đầu kéo trên điện thoại, bottom sheet chuyển thành cửa sổ nổi thật sự.',
      'Cửa sổ nổi mobile thấp hơn để còn không gian di chuyển và không che toàn màn hình.',
      'Sau khi nổi, phần app phía sau dùng được bình thường; vị trí vẫn được nhớ.',
      'Pill Trợ lý khi thu gọn cũng kéo được trên điện thoại.',
    ],
  },
  {
    version: '0.9.4',
    updatedAt: '2026-09-29T14:02:00+07:00',
    title: 'Sửa kéo cửa sổ Trợ lý',
    changes: [
      'Sửa cơ chế kéo: pointer move/up được bắt ở toàn cửa sổ trình duyệt thay vì chỉ trên thanh tiêu đề.',
      'Giữ kéo liên tục kể cả khi con trỏ rời khỏi header.',
      'Thêm cursor grab/grabbing rõ ràng và khóa touch-action trên vùng kéo.',
      'Vị trí vẫn được lưu sau khi kéo.',
    ],
  },
  {
    version: '0.9.3',
    updatedAt: '2026-09-29T13:50:00+07:00',
    title: 'Trợ lý dạng cửa sổ kéo được + lệnh chỉ đọc',
    changes: [
      'Desktop: Trợ lý trở thành cửa sổ nổi không khóa app, kéo được và nhớ vị trí.',
      'Có Ẩn/thu gọn, mở lại mà không mất nội dung đang nhập; draft tự lưu.',
      'Thêm lịch sử lệnh gần đây, xóa nhanh nội dung và phím tắt Ctrl/⌘ + Shift + A.',
      'Ctrl/⌘ + Enter xác nhận thao tác ghi dữ liệu; Escape thu gọn cửa sổ.',
      'Trợ lý có thể trả lời nhanh dinh dưỡng hôm nay, việc hôm nay và buổi tập hôm nay mà không ghi dữ liệu.',
    ],
  },
  {
    version: '0.9.2',
    updatedAt: '2026-09-29T13:15:00+07:00',
    title: 'Dọn giao diện nhập nhanh và Trợ lý',
    changes: [
      'Xóa nút Điền mẫu text khỏi Nhập nhanh.',
      'Xóa phần Câu test nhanh khỏi Trợ lý.',
      'Xóa mẫu JSON kỹ thuật khỏi giao diện; parser và Action Engine vẫn giữ nguyên bên dưới.',
      'Ô nhập chỉ còn placeholder ngắn, không nhồi ví dụ vào màn hình.',
    ],
  },
  {
    version: '0.9.1',
    updatedAt: '2026-09-29T13:00:00+07:00',
    title: 'Trợ lý hành động + nhập nhanh bằng câu tự nhiên',
    changes: [
      'Thêm Trợ lý thật: nhập một câu tự nhiên, xem preview rồi xác nhận trước khi ghi dữ liệu.',
      'Hiểu câu một dòng kiểu “Lưu bữa tối hôm nay: ...” với nhiều món ngăn bằng dấu chấm phẩy.',
      'Dán trực tiếp danh sách kcal · P · C · F vẫn hoạt động; tự bỏ qua dòng tổng để tránh cộng hai lần.',
      'Trợ lý có thể lưu dinh dưỡng hoặc cập nhật/tạo buổi tập bằng cùng Action Engine dùng chung.',
      'Bỏ icon lấp lánh/AI khỏi Nhập nhanh và Trợ lý; launcher dùng chữ đơn giản.',
    ],
  },
  {
    version: '0.9.0',
    updatedAt: '2026-09-29T12:38:00+07:00',
    title: 'Nhập nhanh chung cho dinh dưỡng và buổi tập',
    changes: [
      'Thêm Action Engine chung để đọc và kiểm tra form JSON trước khi ghi dữ liệu.',
      'Dinh dưỡng có Nhập nhanh: dán cả bữa, xem preview, lưu một lần và có Hoàn tác.',
      'Buổi tập có Nhập nhanh: tự khớp bài cũ, thêm bài thiếu, lưu kg/reps và có Hoàn tác.',
      'Tách logic nhận diện/lịch sử bài tập ra service dùng chung và tự migrate key dữ liệu gym cũ.',
      'Dữ liệu nhập nhanh dinh dưỡng tiếp tục đi qua cơ chế sync tài khoản hiện tại.',
    ],
  },
  {
    version: '0.8.7',
    updatedAt: '2026-09-29T12:38:00+07:00',
    title: 'Buổi tập: thay bài bằng bài đã có',
    changes: [
      'Mỗi bài trong chế độ sửa có nút Thay để chọn một bài đã từng dùng trước đó.',
      'Có thể tìm bài cũ, xem ảnh tham khảo và kg/reps gần nhất trước khi chọn.',
      'Thêm mới cũng có thể chọn trực tiếp từ thư viện bài đã có.',
      'Khi thay sang bài đã có, app dùng đúng lịch sử kg/reps và ảnh của bài đích; đổi thứ tự không làm lẫn dữ liệu.',
    ],
  },
  {
    version: '0.8.6',
    updatedAt: '2026-09-29T12:38:00+07:00',
    title: 'Buổi tập: sửa bài tập nhanh ngay trong màn hình tập',
    changes: [
      'Thêm nút Sửa bài ngay trên danh sách bài tập của buổi tập.',
      'Có thể đổi tên, thêm, xóa và đổi thứ tự bài tập mà không cần mở form sửa task lớn.',
      'Giữ lại lịch sử kg/reps và ảnh tham khảo khi đổi cách ghi tên bài nếu có thể.',
    ],
  },
  {
    version: '0.8.5',
    updatedAt: '2026-09-29T11:36:00+07:00',
    title: 'Reader: chạm mép để lật trang',
    changes: [
      'Chạm vùng mép trái để quay lại trang trước.',
      'Chạm vùng mép phải để sang trang tiếp theo.',
      'Vuốt ngang vẫn hoạt động như cũ và được chống lật hai lần sau thao tác vuốt.',
    ],
  },
  {
    version: '0.8.4',
    updatedAt: '2026-09-29T11:36:00+07:00',
    title: 'Reader clean kiểu Kindle + báo cáo thời gian đọc',
    changes: [
      'Khi thanh công cụ ẩn, màn hình đọc chỉ còn nội dung sách; không hiện chương, trang, phần trăm hay progress bar.',
      'Chạm vùng bar trên hoặc bar dưới để mở menu; chạm giữa nội dung không bật menu.',
      'Cuộn dọc chỉ diễn ra bên trong trang hiện tại; vuốt ngang trái/phải để lật sang trang khác.',
      'Báo cáo thêm thời gian đọc, thời gian nghe sách, tổng thời gian với sách và số ngày có đọc.',
    ],
  },
  {
    version: '0.8.3',
    updatedAt: '2026-09-29T11:25:00+07:00',
    title: 'Reader: cuộn dọc theo từng trang',
    changes: [
      'Cuộn dọc vẫn giữ ranh giới từng trang và hiển thị Trang x/y.',
      'Cuộn hết một trang sẽ đi sang trang kế tiếp; vuốt tiếp ở cuối chương sẽ sang chương mới.',
      'Số trang được tính trên toàn cuốn theo cỡ chữ và kích thước màn hình hiện tại.',
    ],
  },
  {
    version: '0.8.2',
    updatedAt: '2026-09-29T10:32:00+07:00',
    title: 'Hiển thị phiên bản trong Cài đặt',
    changes: [
      'Thêm số phiên bản hiện tại và thời điểm cập nhật.',
      'Thêm lịch sử phiên bản để biết app đang chạy bản nào.',
    ],
  },
  {
    version: '0.8.1',
    updatedAt: '2026-09-29T00:00:00+07:00',
    title: 'Reader: Cuộn dọc và Theo trang',
    changes: [
      'Thêm chế độ cuộn dọc để đọc liên tục.',
      'Giữ chế độ theo trang cho người thích lật từng trang.',
    ],
  },
  {
    version: '0.8.0',
    updatedAt: '2026-09-29T00:00:00+07:00',
    title: 'Mốc baseline GitHub',
    changes: [
      'Tạo mốc an toàn trước khi chuyển sang quy trình cập nhật có version.',
    ],
  },
];
