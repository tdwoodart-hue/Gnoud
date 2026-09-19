# Activity Engine · Language Chat

## Cần cấu hình trên Vercel

Thêm Environment Variable:

- `OPENAI_API_KEY` = OpenAI API key của bạn
- `OPENAI_ACTIVITY_MODEL` = tùy chọn, mặc định `gpt-5.6-luna`

API key chỉ nằm ở server. Không đưa key vào `VITE_*` hoặc source frontend.

Endpoint dùng Firebase ID token nên bản production yêu cầu `FIREBASE_SERVICE_ACCOUNT_JSON`
đang hoạt động (repo đã dùng biến này cho notification scheduler).

## Cách task bật chatbot

Cách chuẩn: thêm một dòng vào `notes`:

`@activity {"type":"language_chat","language":"de-DE","languageName":"Tiếng Đức","level":"A1","durationMinutes":15,"autoSpeak":true,"topic":"Giới thiệu bản thân","goal":"Nói được tên, tuổi, nơi sống và hỏi lại người đối diện","correctionMode":"gentle","personaName":"Mia"}`

Importer JSON hiện tại đã hỗ trợ `notes`, nên không cần đổi schema Task.

Tương thích dữ liệu cũ:
Task có tiêu đề/nội dung chứa "Đức", "Tiếng Đức", "Deutsch" hoặc "German" sẽ tự được nhận diện
thành `language_chat` tiếng Đức. Đây chỉ là fallback cho task cũ; task mới nên dùng marker `@activity`.

## Trải nghiệm

- Card "Hoạt động tương tác hôm nay" xuất hiện trên tab Hôm nay.
- Bot hội thoại ngắn, phù hợp CEFR.
- Đọc câu bằng browser speech synthesis theo locale của ngôn ngữ.
- Nhập bằng giọng nói khi trình duyệt hỗ trợ SpeechRecognition; luôn có text input fallback.
- Nút Nghe / Nói chậm / Gợi ý.
- Kết thúc lưu `actualMinutes`, hoàn thành task và ghi `@activity_result` vào notes.
- Tasks vốn đã sync qua Firestore nên kết quả cũng sync đa thiết bị.
