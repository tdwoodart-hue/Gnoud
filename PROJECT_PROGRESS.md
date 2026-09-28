# Gnoud · Tiến độ & định hướng phát triển

Cập nhật: 28/09/2026

## 1. Mục tiêu sản phẩm

Gnoud đang đi theo hướng **personal operating system gọn, mobile-first**: mở app là thấy việc cần làm, dinh dưỡng/cơ thể, tiến độ dự án và các công cụ cá nhân thật sự dùng hằng ngày. Nguyên tắc là chỉ báo cáo những dữ liệu app thực sự ghi nhận, tránh tạo các chỉ số trông đẹp nhưng không có nguồn đo rõ ràng.

## 2. Thay đổi trong đợt này

### Trình đọc sách

Đã thêm tab **Sách** đồng bộ với giao diện hiện tại.

Định dạng hỗ trợ:

- **PDF**: mở ngay trong web bằng trình xem PDF gốc của trình duyệt, giữ nguyên bố cục; có nút mở toàn màn hình khi cần.
- **EPUB**: đọc trực tiếp trong app, tự đọc cấu trúc EPUB/OPF/spine, chia theo chương, có mục lục dạng chọn chương, nhớ chương + trang đang đọc.
- **TXT / MD / Markdown**: đọc dạng text, tự chia trang.
- Có thể **dán văn bản trực tiếp** mà không cần file.

Tính năng reader hiện có:

- Nhớ sách đã thêm và vị trí đọc.
- Cỡ chữ tùy chỉnh cho EPUB/TXT/MD.
- 3 nền đọc: sáng, ấm, tối.
- PDF/EPUB được lưu bằng **IndexedDB** trên thiết bị thay vì nhét binary vào localStorage.
- Metadata thư viện tách theo `user.uid`, tránh lẫn thư viện giữa các tài khoản.
- Giới hạn file hiện tại: **50 MB/file**, tối đa **24 sách** trong thư viện metadata.
- Không thêm dependency đọc sách mới; EPUB dùng API trình duyệt để giải nén/đọc cấu trúc, giữ bundle gọn.

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

- Bookmark.
- Highlight + ghi chú theo đoạn EPUB.
- Tìm kiếm trong EPUB.
- Lịch sử sách đọc gần đây.
- Đồng bộ metadata/progress lên Firestore; file gốc nếu cần cloud thì dùng Firebase Storage.
- PDF: nếu cần đồng bộ chính xác số trang/vị trí đọc giữa thiết bị, cân nhắc PDF renderer riêng ở bước sau.

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
