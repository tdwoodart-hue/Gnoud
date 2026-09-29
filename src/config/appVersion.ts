export interface AppRelease {
  version: string;
  updatedAt: string;
  title: string;
  changes: string[];
}

export const APP_VERSION = '0.8.6';
export const APP_UPDATED_AT = '2026-09-29T12:38:00+07:00';

export const APP_RELEASES: AppRelease[] = [
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
