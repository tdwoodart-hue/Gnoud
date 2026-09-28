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
- Reader luôn hiển thị **Trang X/Y** ở footer hoặc pill khi toolbar ẩn. Trang được tính theo chiều cao viewport hiện tại và tự tính lại khi đổi font/cỡ chữ/giãn dòng.
- **Auto-ghim vị trí đọc**: cuộn/chuyển trang sẽ tự lưu chương, vị trí, trang hiện tại, % toàn sách và thời điểm ghim; đóng reader cũng flush vị trí ngay.
- **Auto-ghim vị trí nghe**: TTS cập nhật vị trí theo tiến độ phát và tự kéo nội dung theo; mở lại sách sẽ quay gần đúng chỗ vừa đọc/nghe.
- Nhớ chương + vị trí cuộn + thiết lập kiểu đọc theo từng cuốn.
- EPUB tự lấy **tên sách, tác giả và ảnh bìa** từ metadata/manifest khi file có dữ liệu này.
- **Nghe sách bằng TTS** cho EPUB/TXT: play/pause/stop, có nghe thử giọng, chỉnh tốc độ + cao độ; bắt đầu gần vị trí đang đọc. Mặc định dùng **online neural** thay vì phụ thuộc số giọng ít ỏi của iOS/Safari.
- Có sẵn **Microsoft online không cần API key**: Hoài My, Nam Minh và một nhóm giọng Multilingual để người dùng nghe thử thêm màu giọng; vẫn giữ chế độ **Trên máy** làm fallback.
- Có catalog **Google Cloud vi-VN** (Neural2 / WaveNet / Standard / Chirp 3 HD); các giọng này tự bật khi server có `GOOGLE_TTS_API_KEY`.
- Bộ lọc TTS mặc định loại bỏ URL, `www`, email, domain, ISBN/DOI, số chú thích và ký hiệu rác trước khi phát để tránh đọc chuỗi web khó chịu; có thể tắt lọc nếu muốn nghe nguyên văn.
- Metadata tác giả được làm sạch: giá trị kiểu `Unknown/Unknow/N/A` không còn hiện trong thư viện; nếu EPUB không có tác giả hợp lệ thì giao diện chỉ hiện định dạng sách.
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
- TTS P1: highlight câu/từ đang đọc dựa trên word-boundary và tùy chọn tự chuyển sang chương tiếp theo.
- Nếu cần nhiều giọng Việt chất lượng cao mặc định cho mọi deployment, chọn một provider chính thức (Google Cloud/Azure/FPT/Viettel) và quản lý key/quota ở server.

### Báo cáo P1

- Trend calories / protein / cân nặng / steps theo 7 và 30 ngày.
- So sánh dự án kỳ này với kỳ trước.
- Kế hoạch vs hoàn thành theo ngày/tuần.
- Chỉ thêm metric mới khi domain tương ứng có dữ liệu log ổn định.

## 5. File chính của đợt này

- `src/components/reader/ReaderView.tsx`
- `src/services/readerService.ts`
- `readerTtsServer.ts`
- `api/reader/tts.ts`
- `server.ts`
- `.env.example`
- `package.json`
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

## Reader v6 — phân trang thật + fallback TTS

- Bỏ trải nghiệm cuộn một chương dài. EPUB/TXT được chia lại theo kích thước viewport và typography hiện tại; mỗi màn hình là một trang rõ ràng.
- Hiển thị `Trang x/y` ngay trong nội dung và footer. Đổi font, cỡ chữ, giãn dòng hoặc bề rộng sẽ tự tính lại số trang nhưng giữ vị trí tương đối.
- Vuốt trái/phải, chạm mép hoặc dùng nút mũi tên để lật trang; có hiệu ứng 3D nhẹ. Khi hết trang của chương sẽ chuyển chương tiếp/theo trước.
- Mỗi lần lật trang tự cập nhật `currentPage`, `scrollProgress`, `overallProgress` và `lastPositionAt`; không cần bấm bookmark thủ công.
- TTS vẫn dùng cùng vị trí tương đối nên khi nghe, trang hiển thị tự tiến theo và vị trí nghe được ghim vào tiến độ sách.
- Nếu `/api/reader/tts` không khả dụng (ví dụ một số môi trường Preview chỉ chạy frontend), tab Online neural sẽ tự ẩn và Reader tự fallback về giọng trên máy thay vì hiện `0 dùng được`.
- Sách mới mặc định dùng TTS trên máy; khi backend online hoạt động, người dùng có thể chuyển sang Online neural.
