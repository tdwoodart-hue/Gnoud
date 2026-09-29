# Gnoud · Tiến độ & định hướng phát triển

## Reader v7 — đồng bộ đa thiết bị + chuyển trang nhẹ

### Đã hoàn thành
- Reader hỗ trợ PDF, EPUB, TXT/MD và văn bản dán trực tiếp.
- EPUB lấy title/author/cover từ metadata khi có.
- Reader phân trang theo viewport, hiển thị Trang X/Y và % toàn sách.
- Tự ghim vị trí đọc/nghe; mở lại quay về gần vị trí gần nhất.
- Font, cỡ chữ, giãn dòng, căn đều/căn trái, độ rộng trang, theme sáng/ấm/tối.
- TTS tiếng Việt, lọc URL/email/domain/ký hiệu rác, device voice + online provider khi server có cấu hình.
- Báo cáo đã gọn lại theo dữ liệu app thực sự có.
- Bỏ nút privacy/eye khỏi PageHeader.

### Mới trong v7
- **Đồng bộ thư viện theo tài khoản:** metadata + tiến độ ở Firestore; file PDF/EPUB/TXT ưu tiên Firebase Storage.
- Nếu Firebase Storage chưa dùng được, file <= 12 MB tự fallback sang **Firestore chunk sync** để thiết bị khác vẫn nhận được sách.
- Sách cũ đang nằm trên điện thoại được **tự migrate lên cloud** khi người dùng mở bản v7 trên điện thoại trong trạng thái đã đăng nhập.
- Thiết bị khác cùng tài khoản nhận danh sách sách realtime; file lớn được tải lazy khi mở sách, bìa tải riêng.
- Xóa sách sẽ xóa metadata cloud và payload cloud tương ứng.
- Dòng trạng thái Thư viện hiển thị rõ đang sync / đã sync / chỉ có trên thiết bị.
- **Bỏ hiệu ứng lật trang 3D.** Mặc định chuyển trang không hiệu ứng; tùy chọn `Trượt nhẹ` chỉ dịch 10px + fade 110ms.
- Vuốt trái/phải và chạm mép vẫn giữ nguyên.

### Lưu ý triển khai
- `storage.rules` giới hạn `/users/{uid}/reader/**` cho đúng tài khoản.
- `firebase.json` đã trỏ tới `firestore.rules` và `storage.rules` để có thể deploy rules bằng Firebase CLI.
- Nếu Storage rules chưa được deploy, reader vẫn cố fallback qua Firestore chunks cho file <= 12 MB.
- Với file > 12 MB, cần Firebase Storage hoạt động để sync đa thiết bị; local reading vẫn hoạt động.

### Hướng tiếp theo
- Đồng bộ bookmark/highlight/note theo sách.
- Search toàn sách và lịch sử vị trí đã đọc.
- Cache offline có quản lý dung lượng và nút “xóa bản tải về” nhưng giữ sách trên cloud.
- Trang thống kê đọc sách: phút đọc, số trang, streak — chỉ khi có dữ liệu thật.
