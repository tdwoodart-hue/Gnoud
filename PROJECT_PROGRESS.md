# Gnoud · Tiến độ & định hướng phát triển

Cập nhật: 28/09/2026

## 1. Mục tiêu sản phẩm

Gnoud đang đi theo hướng **personal operating system gọn, mobile-first**: mở app là thấy việc cần làm, dinh dưỡng/cơ thể, tiến độ dự án và các công cụ cá nhân thật sự dùng hằng ngày. Nguyên tắc là chỉ báo cáo những dữ liệu app thực sự ghi nhận, tránh tạo các chỉ số trông đẹp nhưng không có nguồn đo rõ ràng.

## 2. Thay đổi trong đợt này

### Trình đọc sách

Đã làm lại tab **Sách** theo hướng reader-first, ưu tiên cảm giác đọc trên mobile thay vì dồn quản lý file và nội dung vào cùng một màn.

Định dạng hỗ trợ:

- **PDF**: mở trong chế độ đọc phủ toàn bộ ứng dụng, có nút bật **fullscreen hệ thống** khi trình duyệt cho phép và nút mở file riêng.
- **EPUB**: đọc trực tiếp trong app, tự đọc OPF/spine, mục lục dạng sheet, chuyển chương và nhớ vị trí cuộn trong chương.
- **TXT / MD / Markdown**: đọc dạng văn bản liên tục.
- Có thể **dán văn bản trực tiếp** mà không cần file.

Tính năng reader hiện có:

- Màn thư viện gọn: **Đọc tiếp / Bắt đầu đọc** + danh sách sách + nút thêm sách; **thêm sách xong vẫn ở trang Thư viện**, không tự động nhảy vào reader.
- **Chế độ đọc immersive/full-screen trong app** che toàn bộ bottom navigation.
- Nút **fullscreen hệ thống** (Fullscreen API) khi browser hỗ trợ.
- Toolbar tự ẩn khi đọc; chạm giữa màn để ẩn/hiện.
- Chạm mép trái/phải hoặc dùng nút mũi tên để lùi/tiến gần một màn hình; desktop hỗ trợ PageUp/PageDown và phím mũi tên.
- **Đổi font**: Book / Serif / Sans.
- **Căn đều hai bên (justify)** kiểu reader/Kindle hoặc chuyển về căn trái.
- Chỉnh **cỡ chữ**, **giãn dòng**, **bề rộng trang**.
- 3 nền đọc: sáng, ấm, tối.
- Mục lục EPUB dạng bottom sheet thay vì select lớn giữa nội dung.
- Thanh tiến độ đọc theo **toàn cuốn** cho EPUB/TXT; thư viện hiển thị Chưa đọc / % đã đọc / Đã đọc xong thay vì trạng thái mơ hồ.
- Nhớ chương + vị trí cuộn + thiết lập kiểu đọc theo từng cuốn.
- EPUB tự lấy **tên sách, tác giả và ảnh bìa** từ metadata/manifest khi file có dữ liệu này.
- **Nghe sách bằng TTS** cho EPUB/TXT: play/pause/stop, chọn giọng hệ thống và tốc độ đọc; bắt đầu gần vị trí đang đọc.
- PDF/EPUB lưu bằng **IndexedDB** trên thiết bị.
- Metadata thư viện tách theo `user.uid`, tránh lẫn dữ liệu giữa các tài khoản.
- Giới hạn file hiện tại: **50 MB/file**, tối đa **24 sách**.
- Không thêm dependency reader nặng; EPUB vẫn dùng browser API để giữ bundle gọn.

### Báo cáo

Đã tinh gọn để chỉ giữ các dữ liệu đang được app ghi nhận rõ ràng:

- Tỷ lệ hoàn thành công việc.
- Đúng hạn / đang trễ.
- Nhịp công việc 7 ngày: việc đã lên lịch và việc đã hoàn thành.
- Dinh dưỡng & cơ thể: calories, protein, steps, cân nặng.
- Tiến độ dự án.
- So sánh tỷ lệ hoàn thành với kỳ trước cho 7 ngày / 30 ngày.

Đã **bỏ khỏi giao diện báo cáo**:

- Focus / thời gian tập trung.
- Thói quen.
- Mục tiêu.

Lý do: hiện tại các phần này chưa có dữ liệu đo đủ nhất quán để đưa thành KPI trong báo cáo.

### Giao diện

- Xóa nút **icon mắt / privacy quick toggle** khỏi `PageHeader`.
- Xóa luôn quick toggle icon mắt ở sidebar desktop.
- Privacy mode vẫn có thể giữ ở khu vực cài đặt/bảo mật nếu cần, nhưng không chiếm chỗ ở màn hình chính.

## 3. Nguyên tắc phát triển tiếp

1. **Mobile first**: thao tác chính dùng tốt bằng một tay trên iPhone.
2. **Chỉ báo cáo dữ liệu có nguồn đo thật**.
3. **Không lẫn dữ liệu tài khoản**; storage mới phải namespace theo user hoặc có sync rõ ràng.
4. **File lớn dùng IndexedDB/Storage**, không nhét vào localStorage/Firestore document.
5. **Reader phải ưu tiên PDF + EPUB**, vì đây là định dạng sách thực tế phổ biến hơn TXT/MD.
6. **Giữ bundle gọn**; chỉ thêm dependency khi browser API không giải quyết được ổn định.

## 4. Roadmap tiếp theo

### Reader P1

- Bookmark nhiều vị trí.
- Highlight + ghi chú theo đoạn EPUB.
- Tìm kiếm toàn sách EPUB.
- Lịch sử / thời gian đọc gần đây nếu sau này muốn đo thật.
- Đồng bộ metadata/progress lên Firestore; file gốc nếu cần cloud thì dùng Firebase Storage.
- PDF: nếu cần nhớ chính xác trang đọc và đồng bộ giữa thiết bị, cân nhắc PDF renderer riêng ở bước sau.
- EPUB: nếu cần giữ nguyên toàn bộ hình ảnh, bảng và typography gốc trong nội dung chương, chuyển parser text hiện tại sang renderer EPUB đầy đủ.
- TTS P1: highlight câu đang đọc và tùy chọn tự chuyển sang chương tiếp theo.

### Báo cáo P1

- Trend calories / protein / cân nặng / steps theo 7 và 30 ngày.
- So sánh dự án kỳ này với kỳ trước.
- Kế hoạch vs hoàn thành theo ngày/tuần.
- Chỉ thêm metric mới khi domain tương ứng có dữ liệu log ổn định.

## 5. File chính của đợt này

- `src/components/reader/ReaderView.tsx`
- `src/services/readerService.ts`
- `src/components/reports/ReportsView.tsx`
- `src/services/reportService.ts`
- `src/components/common/PageHeader.tsx`
- `src/components/layout/AppShell.tsx`
- `src/App.tsx`
- `src/components/common/CommandMenuModal.tsx`
- `src/config/navigation.ts`
- `src/types.ts`
- `test/navigation.test.ts`
- `test/report-service.test.ts`
- `test/reader-service.test.ts`
