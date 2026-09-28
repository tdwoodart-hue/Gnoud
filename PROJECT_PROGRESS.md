# Gnoud · Tiến độ & định hướng phát triển

Cập nhật: 28/09/2026

## 1. Mục tiêu sản phẩm

Gnoud đang đi theo hướng **personal operating system gọn**: mở app là thấy việc cần làm, theo dõi sức khỏe/dinh dưỡng, duy trì thói quen, xem tiến độ và có một nơi riêng cho các hoạt động phát triển bản thân. Ưu tiên hiện tại là **ít thao tác, giao diện nhất quán, dùng tốt trên điện thoại** thay vì nhồi nhiều module nặng.

## 2. Trạng thái hiện tại

### Đã có trong repo

- Hôm nay: danh sách việc, ghi chú theo ngày/giờ, hoạt động/challenge.
- Công việc: task, subtask, priority, focus session, project.
- Dinh dưỡng: món ăn, macro, calories, bước chân, cân nặng.
- Cá nhân: gom các khu vực cá nhân thay vì tách quá nhiều tab.
- Báo cáo: completion, focus time, đúng hạn, dự án, thói quen, mục tiêu, dinh dưỡng/cơ thể.
- Tài khoản & đồng bộ: Firebase/Auth/Firestore cho các domain chính.
- Bảo mật: PIN lock và privacy mode.
- Notification: push + server/cron hiện có trong repo.

### Bổ sung trong đợt này

#### Trình đọc sách gọn

- Tab **Sách** mới, đồng bộ visual với phần còn lại của app.
- Nhập file `.txt`, `.md` hoặc dán văn bản trực tiếp.
- Tự chia nội dung thành trang để đọc thoải mái trên mobile.
- Nhớ trang đang đọc.
- Chỉnh cỡ chữ.
- 3 chế độ nền: sáng, ấm, tối.
- Thư viện tối đa 12 sách để tránh localStorage phình quá nhanh.
- Dữ liệu reader được tách theo `user.uid` trên từng thiết bị, tránh hai tài khoản dùng chung một key local.

> Bản reader hiện tại cố ý không thêm EPUB/PDF engine để giữ bundle nhẹ và không đưa dependency lớn vào app.

#### Báo cáo nâng cấp

- So sánh kỳ hiện tại với kỳ ngay trước đó cho 7 ngày / 30 ngày.
- Hiển thị delta của tỷ lệ hoàn thành và focus time.
- Thêm **Nhịp 7 ngày**: việc đã lên lịch, việc hoàn thành, phút tập trung từng ngày.
- Thêm tóm tắt nhanh: ngày hoàn thành nhiều nhất, focus trung bình/ngày, focus cao nhất.
- Không thêm chart library mới; dùng CSS/Tailwind để giữ app nhẹ.

## 3. Nguyên tắc phát triển tiếp

1. **Mobile first**: thao tác chính dùng được bằng một tay, không quá nhiều modal.
2. **Một nguồn dữ liệu**: tránh mỗi màn hình tự tạo một dạng storage riêng nếu dữ liệu cần dùng chéo.
3. **Tách theo domain**: UI ở `components/<domain>`, logic/storage ở `services/<domain>Service.ts`.
4. **Không thêm dependency nặng khi chưa thật sự cần**.
5. **Báo cáo phải trả lời được câu hỏi “tuần này khác tuần trước ở đâu?”**, không chỉ hiển thị số tổng.
6. **Dữ liệu tài khoản không được lẫn nhau**; mọi domain mới phải có namespace theo user hoặc sync Firestore.

## 4. Roadmap đề xuất

### P0 · Hoàn thiện nền tảng hiện tại

- Đưa reader từ local-only sang Firestore account sync.
- Thêm migration/versioning cho dữ liệu reader.
- Theo dõi thời gian đọc thực tế và số trang/ngày.
- Cho phép tạo task/challenge trực tiếp từ đoạn đang đọc.
- Thêm test navigation + report + reader service vào CI hiện có.

### P1 · Reader 2.0

- EPUB bằng lazy-loaded dependency riêng, chỉ tải khi người dùng mở EPUB.
- Bookmark và highlight.
- Ghi chú theo đoạn.
- Tìm kiếm trong sách.
- Mục tiêu đọc: phút/ngày hoặc trang/ngày.
- Import/export dữ liệu đọc.

### P1 · Báo cáo 2.0

- So sánh theo tuần/tháng bằng trend line tối giản.
- Báo cáo kế hoạch vs thực tế: estimated minutes / actual minutes.
- Báo cáo theo priority và category.
- Heatmap ngày/giờ hoàn thành tốt nhất.
- Dinh dưỡng: xu hướng 7/30 ngày cho calories, protein, weight, steps.
- Reader: phút đọc, số ngày đọc, tiến độ sách; chỉ hiển thị khi có dữ liệu.

### P2 · Báo cáo hành động

- Từ một insight có thể bấm tạo task/goal/habit ngay.
- Weekly review tự gom: việc xong, việc trễ, focus, dinh dưỡng, thói quen, đọc sách.
- Cho phép lưu snapshot tuần để so sánh dài hạn.
- Export bản tóm tắt tuần dạng ảnh/PDF khi thật sự cần chia sẻ.

## 5. Những việc chưa nên làm ngay

- Không đưa PDF renderer lớn vào bundle chính.
- Không tạo thêm nhiều tab riêng cho từng tracker nhỏ.
- Không dùng AI để tự kết luận quá nhiều khi dữ liệu chưa đủ; ưu tiên số liệu gốc + so sánh rõ ràng.
- Không đồng bộ file sách nguyên bản lên Firestore trực tiếp; nếu cần cloud books nên dùng Storage và chỉ sync metadata/progress ở Firestore.

## 6. File chính của đợt này

- `src/components/reader/ReaderView.tsx` — UI reader.
- `src/services/readerService.ts` — model, pagination, storage reader.
- `src/components/reports/ReportsView.tsx` — báo cáo mới.
- `src/services/reportService.ts` — so sánh kỳ và metrics.
- `src/App.tsx`, `src/components/layout/AppShell.tsx`, `src/components/common/CommandMenuModal.tsx` — nối reader vào app.
- `src/config/navigation.ts`, `src/types.ts` — khai báo tab mới.
- `test/navigation.test.ts`, `test/report-service.test.ts`, `test/reader-service.test.ts` — cập nhật test.
