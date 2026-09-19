# Gnoud · Inline task reflection

Thay đúng 2 file theo cấu trúc source:

- `src/components/today/TodayView.tsx`
- `src/types.ts`

Thay đổi:
- Ghi chú hướng dẫn vẫn được hiển thị.
- Có textarea ngay trong Chi tiết công việc để ghi kết quả / điều mới học được.
- Challenge có câu “Hôm nay có gì mới?” sẽ tự dùng câu đó làm tiêu đề ô ghi chú.
- Nút Lưu ghi chú ghi vào `task.reflection`.
- `Task` vốn đã đồng bộ qua Firestore nên reflection đi theo cùng task trên các thiết bị.
- Các dòng hệ thống `@activity ...` và `@activity_result ...` không còn lộ ra trong phần Ghi chú.
