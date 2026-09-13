# Bật thông báo trên iPhone

## 1. Tạo khóa Web Push

Chạy một lần:

```bash
npx web-push generate-vapid-keys
```

Thêm ba biến môi trường trên nơi deploy:

```env
VAPID_PUBLIC_KEY="public key vừa tạo"
VAPID_PRIVATE_KEY="private key vừa tạo"
VAPID_SUBJECT="mailto:email-cua-ban@example.com"
FIRESTORE_DATABASE_ID="(default)"
```

Không đưa private key vào code hoặc commit lên GitHub.

## 2. Yêu cầu khi deploy

- Website phải chạy bằng HTTPS.
- Tài khoản chạy server cần quyền đọc/ghi Firestore để lưu đăng ký thiết bị.
- Server phải luôn hoạt động để kiểm tra việc đến giờ mỗi phút. Với Cloud Run, đặt minimum instances bằng 1.

## 3. Bật trên iPhone

1. Mở website bằng Safari.
2. Bấm Chia sẻ → Thêm vào Màn hình chính.
3. Mở biểu tượng Lịch Sống vừa được cài.
4. Vào Thêm → Cài đặt → Thông báo thúc việc → Bật thông báo.
5. Bấm Gửi thử để kiểm tra màn hình khóa.

Việc phải có ngày và giờ bắt đầu mới được nhắc. Việc khẩn cấp hoặc được đánh dấu quan trọng sẽ bị thúc thường xuyên hơn; khi hoàn thành, lịch nhắc được gỡ tự động.
