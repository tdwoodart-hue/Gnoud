export interface AppRelease {
  version: string;
  updatedAt: string;
  title: string;
  changes: string[];
}

export const APP_VERSION = '0.8.3';
export const APP_UPDATED_AT = '2026-09-29T11:25:00+07:00';

export const APP_RELEASES: AppRelease[] = [
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
