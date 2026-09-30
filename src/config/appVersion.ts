export interface AppRelease {
  version: string;
  updatedAt: string;
  title: string;
  changes: string[];
}

export const APP_VERSION = '0.9.19';
export const APP_UPDATED_AT = '2026-10-01T00:28:00+07:00';

export const APP_RELEASES: AppRelease[] = [
  {
    version: '0.9.19',
    updatedAt: '2026-10-01T00:28:00+07:00',
    title: 'Báo cáo hoạt động chi tiết hơn',
    changes: [
      'Reader bắt đầu lưu từng phiên đọc/nghe với giờ bắt đầu, kết thúc và thời lượng để thống kê khung giờ và phiên lâu nhất.',
      'Gym giữ lịch sử kg/reps đầy đủ theo ngày thay vì chỉ hai lần gần nhất; dữ liệu cũ được migrate tự động.',
      'Dữ liệu gym local được tách khóa theo tài khoản để giảm nguy cơ lẫn giữa hai tài khoản trên cùng thiết bị.',
      'Báo cáo thêm thời gian Focus thực tế, phiên đọc, khung giờ đọc, lịch sử gym và độ bám mục tiêu dinh dưỡng.',
      'Các chỉ số chưa từng được đo trước v0.9.19 không được hồi tố hoặc ước lượng giả.',
    ],
  },
  {
    version: '0.9.18',
    updatedAt: '2026-09-30T23:58:00+07:00',
    title: 'Làm mới tab Sách + tự sửa kết nối thông báo',
    changes: [
      'Tab Đọc sách có hero Đọc tiếp, progress rõ hơn và giao diện ấm kiểu bookshelf thay vì danh sách trắng.',
      'Thêm Nhịp đọc: phút hôm nay, chuỗi ngày đọc liên tiếp và số cuốn đã hoàn thành.',
      'Thư viện chuyển sang lưới bìa sách 2–4 cột, giữ thêm/xóa/đồng bộ và progress từng cuốn.',
      'Thông báo tự đăng ký lại subscription hiện có vào server khi Firestore mất device record.',
      'Tự thay subscription nếu VAPID public key đã đổi và retry sync khi server báo Device is not subscribed.',
      'Service worker chờ trạng thái ready trước khi subscribe để ổn định hơn trên iPhone PWA.',
    ],
  },
  {
    version: '0.9.17',
    updatedAt: '2026-09-30T23:35:00+07:00',
    title: 'Bỏ Cá nhân và làm gọn Cài đặt',
    changes: [
      'Xóa Cá nhân khỏi tab Thêm, sidebar desktop, menu lệnh và màn hình điều hướng.',
      'Giữ tab Thêm trượt lên/xuống mượt, bỏ hiệu ứng scale để chuyển động giống bottom sheet hơn.',
      'Cài đặt mobile chuyển thành màn hình full-height có safe area, nhóm theo kiểu app và giảm card/trang trí.',
      'Ẩn các nút test thông báo, trạng thái scheduler, snapshot ChatGPT và lịch sử version khỏi giao diện người dùng.',
      'Bảo mật chỉ giữ PIN, tự động khóa, khóa ngay và chế độ riêng tư; bỏ phần chẩn đoán kỹ thuật khỏi màn hình.',
      'Mục xuất dữ liệu ghi rõ phạm vi công việc & kế hoạch thay vì gọi là bản sao lưu toàn bộ.',
    ],
  },
  {
    version: '0.9.16',
    updatedAt: '2026-09-30T23:28:00+07:00',
    title: 'Làm mượt tab Thêm và dọn lại Cài đặt',
    changes: [
      'Tab Thêm trên mobile mở bằng animation trượt từ dưới lên thay vì bật ra đột ngột.',
      'Sheet Thêm được đồng bộ style với Gnoud, có drag handle và mô tả ngắn cho từng mục.',
      'Cài đặt được chia thành 4 nhóm rõ ràng: Tài khoản & bảo mật, Thông báo, Ứng dụng và Dữ liệu.',
      'Cài đặt cũng trượt từ dưới lên; chuyển giữa các nhóm có animation ngang nhẹ và nút quay lại.',
      'Giảm cảm giác rối bằng cách bỏ màn danh sách dài và chỉ mở nhóm đang cần xem.',
      'Giữ fix v0.9.15: bottom navigation vẫn ở z-40 nên không đè lên modal/dialog.',
    ],
  },
  {
    version: '0.9.15',
    updatedAt: '2026-09-30T21:05:00+07:00',
    title: 'Sửa bottom nav đè lên modal mobile',
    changes: [
      'Sửa regression v0.9.14: bottom navigation không còn cùng z-index với modal.',
      'Modal Thêm bữa ăn và các dialog z-50+ luôn nằm trên bottom navigation z-40.',
      'Thêm regression test để chặn lỗi bottom nav đè dialog quay lại ở các bản sau.',
    ],
  },
  {
    version: '0.9.14',
    updatedAt: '2026-09-30T17:08:00+07:00',
    title: 'Gọn bottom navigation trên điện thoại',
    changes: [
      'Bottom navigation mobile giảm từ 6 xuống còn 5 mục: Hôm nay, Công việc, Dinh dưỡng, Đọc sách và Thêm.',
      'Cá nhân, Báo cáo và Cài đặt được gom vào sheet Thêm để thanh điều hướng bớt chật.',
      'Tăng kích thước label và icon mobile, giảm cảm giác chữ quá nhỏ trên iPhone.',
      'Mục Thêm giữ trạng thái active khi đang ở Cá nhân hoặc Báo cáo.',
      'Desktop navigation giữ nguyên để không thay đổi thói quen sử dụng trên màn hình lớn.',
    ],
  },
  {
    version: '0.9.13',
    updatedAt: '2026-09-30T16:55:00+07:00',
    title: 'Làm lại màn hình PIN + khôi phục đúng bảo mật',
    changes: [
      'Làm lại màn hình PIN tối giản, bỏ logo/biểu tượng lớn và keypad dạng ô nặng nề.',
      'Quên PIN không còn mở khóa hoặc xóa PIN ngay: phải xác minh lại đúng tài khoản Google trước.',
      'Sau xác minh chỉ được tạo PIN mới; PIN cũ không bao giờ được hiển thị hoặc lấy lại.',
      'PIN mới được gắn với UID tài khoản đã tạo/khôi phục để chặn tài khoản khác reset PIN.',
      'Nếu không có tài khoản để xác minh, chỉ cho xóa dữ liệu cục bộ sau bước xác nhận rõ ràng.',
      'Loại bỏ API reset PIN không xác minh và chặn lưu nhầm PIN/passcode dạng thô vào localStorage.',
    ],
  },
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
